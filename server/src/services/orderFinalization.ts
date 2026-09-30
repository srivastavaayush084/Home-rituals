import { prisma } from '../utils/db';
import { Prisma } from '@prisma/client';
import { BadRequestError } from '../utils/response';
import { sendEmail, emailTemplates } from './email';
import { logger } from '../utils/logger';
import { generateInvoiceNumber, generateInvoicePDFBuffer } from './invoiceService';

interface FinalizePaidOrderParams {
  userId: string;
  addressId: string;
  transactionId: string;
  gatewayOrderId: string;
  signature?: string;
  paymentGateway?: string;
}

/**
 * Handles transactional order creation, stock deduction, and cart clearance.
 * Ensures idempotency by checking if the payment/order has already been processed.
 */
export async function finalizePaidOrder({
  userId,
  addressId,
  transactionId,
  gatewayOrderId,
  signature,
  paymentGateway = 'Razorpay',
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
    logger.info(`Duplicate payment callback received. Already processed Order ID: ${existingOrder.id}`);
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
    };
  }

  // 2. Perform database updates in a single transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // A. Fetch cart items
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    // B. Fetch shipping address
    const address = await tx.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new BadRequestError('Shipping address not found');
    }

    // C. Validate stock & calculate prices
    let totalAmount = 0;
    const itemsToCreate = [];

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

    // D. Deduct inventory stock
    for (const item of itemsToCreate) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const newStock = product!.stock - item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: newStock,
          stockStatus: newStock > 0 ? 'In Stock' : 'Out of Stock',
        },
      });
    }

    // E. Generate invoice number & create Order in database
    const invoiceNumber = await generateInvoiceNumber(tx);
    const invoiceDate = new Date();

    const order = await tx.order.create({
      data: {
        userId,
        fullName: address.fullName,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        landmark: address.landmark,
        phone: address.phone,
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

    // F. Create OrderItems
    await tx.orderItem.createMany({
      data: itemsToCreate.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    // G. Clear cart
    await tx.cartItem.deleteMany({
      where: { userId },
    });

    return { order, itemsToCreate };
  });

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
        items: itemsToCreate.map((i) => ({
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

  logger.info(`Paid order finalized successfully: Order ID ${order.id}, Transaction ID ${transactionId} via ${paymentGateway}`);

  return {
    success: true,
    alreadyProcessed: false,
    order,
  };
}
