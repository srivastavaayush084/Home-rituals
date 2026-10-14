import { prisma } from '../utils/db';
import { Prisma } from '@prisma/client';
import { BadRequestError } from '../utils/response';
import { sendEmail, emailTemplates } from './email';
import { logger } from '../utils/logger';
import { generateInvoiceNumber, generateInvoicePDFBuffer } from './invoiceService';
import { sendWhatsAppOrderConfirmation } from './whatsappService';

interface FinalizePaidOrderParams {
  userId?: string;
  addressId?: string;
  transactionId: string;
  gatewayOrderId: string;
  signature?: string;
  paymentGateway?: string;
  expectedAmountPaise?: number;
}

interface FinalizeOrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

/**
 * Handles transactional order creation, stock deduction, and cart clearance.
 * Uses immutable CheckoutSession snapshots to guarantee integrity against mutable carts.
 * Ensures idempotency by checking if the payment/order has already been processed,
 * enforcing database uniqueness constraints, and handling concurrent races gracefully.
 */
export async function finalizePaidOrder({
  userId,
  addressId,
  transactionId,
  gatewayOrderId,
  signature,
  paymentGateway = 'Razorpay',
  expectedAmountPaise,
}: FinalizePaidOrderParams) {
  // 1. Idempotency Check (Duplicate Payment Check)
  const existingOrder = await prisma.order.findFirst({
    where: {
      OR: [
        { transactionId },
        { gatewayOrderId },
      ],
    },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (existingOrder) {
    if (userId && existingOrder.userId !== userId) {
      logger.warn(`[Order Finalization] Customer mismatch for existing order: order user ${existingOrder.userId} vs request user ${userId}`);
      throw new BadRequestError('Payment identifier conflict: order belongs to another customer account');
    }
    logger.info(`Duplicate payment callback received. Already processed Order ID: ${existingOrder.id}`);
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
    };
  }

  // 2. Retrieve authoritative CheckoutSession snapshot if available
  const checkoutSession = await prisma.checkoutSession.findUnique({
    where: { gatewayOrderId },
  });

  let effectiveUserId = userId || checkoutSession?.userId;
  if (!effectiveUserId) {
    throw new BadRequestError('Customer identification missing for this order finalization');
  }

  // Customer ownership validation against snapshot
  if (checkoutSession && userId && checkoutSession.userId !== userId) {
    logger.warn(`[Order Finalization] CheckoutSession ${gatewayOrderId} user ${checkoutSession.userId} does not match request user ${userId}`);
    throw new BadRequestError('This checkout session belongs to another customer');
  }

  if (checkoutSession) {
    if (checkoutSession.status === 'CANCELLED') {
      throw new BadRequestError('Checkout session has been cancelled');
    }
    if (checkoutSession.status === 'EXPIRED' || (checkoutSession.expiresAt && checkoutSession.expiresAt < new Date())) {
      throw new BadRequestError('Checkout session has expired');
    }
    if (expectedAmountPaise !== undefined && checkoutSession.amountInPaise !== expectedAmountPaise) {
      logger.error(`[Order Finalization] Amount mismatch: gateway charged ${expectedAmountPaise} paise, session snapshot expected ${checkoutSession.amountInPaise} paise.`);
      throw new BadRequestError('The order amount does not match the payment amount. Please contact support.');
    }
  }

  // 3. Perform database updates in a single transaction with concurrency safety
  let result;
  try {
    result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let itemsToCreate: FinalizeOrderItem[] = [];
      let shippingAddress: any;
      let totalAmount = 0;

      if (checkoutSession) {
        // Authoritative path: read from immutable session snapshot
        itemsToCreate = (checkoutSession.itemsSnapshot as unknown as FinalizeOrderItem[]) || [];
        shippingAddress = checkoutSession.addressSnapshot as any;
        totalAmount = checkoutSession.totalAmount;

        if (itemsToCreate.length === 0) {
          throw new BadRequestError('No items found in checkout session snapshot');
        }
      } else {
        // Fallback path (e.g. developer direct testing or legacy orders without session)
        const cartItems = await tx.cartItem.findMany({
          where: { userId: effectiveUserId },
          include: { product: true },
        });

        if (cartItems.length === 0) {
          throw new BadRequestError('Your cart is empty');
        }

        const address = await tx.address.findFirst({
          where: { id: addressId, userId: effectiveUserId },
        });

        if (!address) {
          throw new BadRequestError('Shipping address not found');
        }

        shippingAddress = {
          fullName: address.fullName,
          address1: address.address1,
          address2: address.address2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          landmark: address.landmark,
          phone: address.phone,
        };

        for (const item of cartItems) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.deletedAt) {
            throw new BadRequestError(`Product "${item.product?.name || 'Item'}" is no longer available`);
          }

          if (product.stock < item.quantity) {
            throw new BadRequestError(`Insufficient stock for "${product.name}". Only ${product.stock} available.`);
          }

          const price = product.discountPrice || product.price;
          totalAmount += price * item.quantity;

          itemsToCreate.push({
            productId: item.productId,
            quantity: item.quantity,
            price,
            name: product.name,
          });
        }

        const computedPaise = Math.round(totalAmount * 100);
        if (expectedAmountPaise !== undefined && computedPaise !== expectedAmountPaise) {
          logger.error(`[Order Finalization] Amount mismatch: gateway paid ${expectedAmountPaise} paise, cart calculated ${computedPaise} paise.`);
          throw new BadRequestError('The order amount does not match the payment amount. Please contact support.');
        }
      }

      // Deduct inventory stock atomically (concurrency-safe against race conditions)
      for (const item of itemsToCreate) {
        if (item.productId) {
          const updateResult = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updateResult.count === 0) {
            throw new BadRequestError(`Insufficient stock for "${item.name}". The item may have just sold out.`);
          }

          // Update stockStatus if depleted
          const productAfter = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (productAfter && productAfter.stock <= 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockStatus: 'Out of Stock' },
            });
          }
        }
      }

      // Generate invoice number & create Order in database
      const invoiceNumber = await generateInvoiceNumber(tx);
      const invoiceDate = new Date();

      const order = await tx.order.create({
        data: {
          userId: effectiveUserId,
          fullName: shippingAddress.fullName,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2 || null,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || 'India',
          landmark: shippingAddress.landmark || null,
          phone: shippingAddress.phone,
          totalAmount,
          status: 'Confirmed',
          paymentStatus: 'Paid',
          paymentGateway,
          transactionId,
          gatewayOrderId,
          signature: signature || null,
          invoiceNumber,
          invoiceDate,
          invoiceGeneratedAt: invoiceDate,
        },
      });

      // Create OrderItems
      await tx.orderItem.createMany({
        data: itemsToCreate.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      // Mark checkout session as completed if session exists
      if (checkoutSession) {
        await tx.checkoutSession.update({
          where: { id: checkoutSession.id },
          data: {
            status: 'COMPLETED',
            orderId: order.id,
          },
        });
      }

      // Clear user cart
      await tx.cartItem.deleteMany({
        where: { userId: effectiveUserId },
      });

      return { order, itemsToCreate };
    });
  } catch (error: any) {
    // If unique constraint violation occurs (P2002), verify if this order was already processed concurrently
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      logger.info(`Unique constraint encountered during finalization of gatewayOrderId: ${gatewayOrderId}. Checking if order was already finalized.`);
      const existing = await prisma.order.findFirst({
        where: {
          OR: [{ transactionId }, { gatewayOrderId }],
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (existing && (existing.gatewayOrderId === gatewayOrderId || existing.transactionId === transactionId)) {
        if (effectiveUserId && existing.userId !== effectiveUserId) {
          logger.warn(`[Order Finalization] User mismatch on concurrent resolution: order owner ${existing.userId} vs request user ${effectiveUserId}`);
          throw new BadRequestError('Payment identifier conflict: order belongs to another account');
        }
        return {
          success: true,
          alreadyProcessed: true,
          order: existing,
        };
      }
      // If P2002 happened on an unrelated unique field (e.g. invoiceNumber or sku), rethrow so it is NOT masked!
      logger.error(`[Order Finalization] P2002 constraint error did NOT match gateway order. Rethrowing.`);
      throw error;
    }
    throw error;
  }

  const { order, itemsToCreate } = result;

  // 3. Post-commit notifications (customer & admin email)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Generate Invoice PDF for email attachment
    let invoiceBuffer: Buffer | null = null;
    try {
      invoiceBuffer = await generateInvoicePDFBuffer({
        ...order,
        items: itemsToCreate.map((i: FinalizeOrderItem) => ({
          ...i,
          product: { id: i.productId, name: i.name },
        })),
        user,
      });
    } catch (invErr) {
      logger.error('Error generating invoice PDF for order email:', invErr);
    }

    if (user?.email) {
      const attachments = invoiceBuffer ? [
        {
          filename: `Invoice-${order.invoiceNumber || order.id}.pdf`,
          content: invoiceBuffer,
          contentType: 'application/pdf',
        },
      ] : undefined;

      // Send Order Confirmation to Customer with Invoice
      await sendEmail({
        to: user.email,
        subject: `Order Confirmed! - #${order.id} (Invoice Attached)`,
        html: emailTemplates.getOrderConfirmationHtml(order.id, order.totalAmount, itemsToCreate),
        text: `Hello ${order.fullName},\n\nWe have received payment of Rs. ${order.totalAmount} for order #${order.id}. Your official tax invoice is attached.\n\nThank you for choosing Home Rituals!`,
        attachments,
      });
    }

    // Send New Order Alert to Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@homerituals.com';
    await sendEmail({
      to: adminEmail,
      subject: `New Order Received - #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e8efe7; border-radius: 12px;">
          <h2 style="color: #242424;">New Order Received</h2>
          <p>Order <strong>#${order.id}</strong> has been successfully placed and paid.</p>
          <p><strong>Customer:</strong> ${order.fullName}</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">&copy; Home Rituals. All rights reserved.</p>
        </div>
      `,
      text: `New order #${order.id} has been received from ${order.fullName}. Total Amount: ₹${order.totalAmount}.`,
    });
  } catch (emailError) {
    logger.error('Error sending confirmation emails post-checkout:', emailError);
  }

  // Send Automated WhatsApp Order Confirmation
  if (order.phone) {
    try {
      await sendWhatsAppOrderConfirmation({
        phone: order.phone,
        customerName: order.fullName,
        orderId: order.id,
        totalAmount: order.totalAmount,
        items: itemsToCreate.map((i: FinalizeOrderItem) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        address: `${order.city}, ${order.state}`,
      });
      logger.info(`WhatsApp order confirmation dispatched for Order #${order.id} to ${order.phone}`);
    } catch (waError) {
      logger.error(`Error sending WhatsApp confirmation for Order #${order.id}:`, waError);
    }
  }

  logger.info(`Paid order finalized successfully: Order ID ${order.id}, Transaction ID ${transactionId} via ${paymentGateway}`);

  return {
    success: true,
    alreadyProcessed: false,
    order,
  };
}
