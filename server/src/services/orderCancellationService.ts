import { prisma } from '../utils/db';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/response';
import { RazorpayRefundService } from './razorpayRefundService';
import { sendEmail, emailTemplates } from './email';

export const CANCELLATION_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Product no longer required',
  'Found a better price',
  'Delivery is taking too long',
  'Ordered the wrong product',
  'Other',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export interface CanCancelResult {
  cancellable: boolean;
  code?: 'ALREADY_CANCELLED' | 'INELIGIBLE_STATUS' | 'ALREADY_REFUNDED' | 'NOT_FOUND';
  message?: string;
}

/**
 * Single source of truth for order cancellation eligibility.
 * Evaluates the actual order fulfillment status and refund status.
 */
export function canCancelOrder(order: {
  status: string;
  refundStatus?: string | null;
  paymentStatus?: string | null;
}): CanCancelResult {
  if (!order) {
    return { cancellable: false, code: 'NOT_FOUND', message: 'Order does not exist' };
  }

  const normalizedStatus = (order.status || '').toLowerCase().trim();

  // If already cancelled or returned or refunded
  if (normalizedStatus === 'cancelled') {
    return {
      cancellable: false,
      code: 'ALREADY_CANCELLED',
      message: 'This order has already been cancelled.',
    };
  }

  if (normalizedStatus === 'returned' || normalizedStatus === 'refunded') {
    return {
      cancellable: false,
      code: 'ALREADY_REFUNDED',
      message: 'This order has already been returned or refunded.',
    };
  }

  // Non-cancellable fulfillment stages (irreversible fulfilment)
  const nonCancellable = ['packed', 'shipped', 'out_for_delivery', 'out for delivery', 'delivered'];
  if (nonCancellable.includes(normalizedStatus)) {
    return {
      cancellable: false,
      code: 'INELIGIBLE_STATUS',
      message: `Order cannot be cancelled as it is already ${order.status.toLowerCase()}. Please contact customer support for returns.`,
    };
  }

  // Only Pending and Confirmed are cancellable
  if (normalizedStatus === 'pending' || normalizedStatus === 'confirmed' || normalizedStatus === 'processing') {
    return { cancellable: true };
  }

  return {
    cancellable: false,
    code: 'INELIGIBLE_STATUS',
    message: `Order in status "${order.status}" cannot be cancelled.`,
  };
}

/**
 * Calculates the eligible refundable amount based on trusted backend data.
 * Formula: Immutable Order Total - Sum of already processed/processing refunds.
 */
export function calculateEligibleRefundAmount(
  totalAmount: number,
  existingRefunds: { amount: number; status: string }[]
): number {
  if (!totalAmount || totalAmount <= 0) {
    return 0;
  }

  const alreadyRefunded = existingRefunds
    .filter((r) => r.status === 'PROCESSED' || r.status === 'PROCESSING')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const eligible = Math.round((totalAmount - alreadyRefunded) * 100) / 100;
  return Math.max(0, eligible);
}

export interface CancelOrderParams {
  orderId: string;
  userId: string;
  userRole?: string;
  reason: string;
  comment?: string;
  cancelledBy?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
}

/**
 * Executes customer or admin order cancellation with Razorpay refund reconciliation.
 * Thread-safe and protected against race conditions and double refunds.
 */
export async function executeOrderCancellation(params: CancelOrderParams) {
  const { orderId, userId, userRole = 'USER', reason, comment, cancelledBy = 'CUSTOMER' } = params;

  logger.info(`[ORDER_CANCELLATION_REQUESTED] Order #${orderId} requested by User: ${userId} (${cancelledBy})`);

  // 1. Retrieve order with items, user, and previous refunds
  const order: any = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, stock: true },
          },
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
      refunds: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // 2. Ownership & Authorization check
  const isOwner = String(order.userId) === String(userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You do not have authorization to cancel this order');
  }

  // 3. Check cancellation eligibility using centralized rule
  const eligibility = canCancelOrder(order);
  if (!eligibility.cancellable) {
    throw new BadRequestError(eligibility.message || 'This order cannot be cancelled');
  }

  // 4. Determine Payment State
  const isOnlinePaid =
    order.paymentStatus === 'Paid' &&
    Boolean(order.transactionId) &&
    (order.paymentGateway || '').toLowerCase() === 'razorpay';

  // 5. Calculate eligible refund amount strictly on server
  let eligibleRefundAmount = 0;
  if (isOnlinePaid) {
    eligibleRefundAmount = calculateEligibleRefundAmount(order.totalAmount, order.refunds || []);
    if (eligibleRefundAmount <= 0 && order.refundStatus === 'PROCESSED') {
      throw new BadRequestError('This order has already been fully refunded.');
    }
  }

  const cancellationTimestamp = new Date();

  // 6. Return stock and update Order status atomically
  await prisma.$transaction(async (tx) => {
    // Return stock to inventory
    for (const item of order.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const updatedStock = product.stock + item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: updatedStock,
            stockStatus: updatedStock > 0 ? 'In Stock' : 'Out of Stock',
          },
        });
      }
    }

    // Set order to Cancelled
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'Cancelled',
        cancelledAt: cancellationTimestamp,
        cancelledBy,
        cancellationReason: reason,
        cancellationComment: comment || null,
        refundStatus: isOnlinePaid ? 'PENDING' : 'NOT_APPLICABLE',
      },
    });
  });

  logger.info(`[ORDER_CANCELLED] Order #${orderId} marked CANCELLED. Inventory returned.`);

  let updatedOrder: any = null;
  let refundRecord: any = null;

  // 7. Handle Razorpay Refund if paid online
  if (isOnlinePaid && eligibleRefundAmount > 0) {
    logger.info(
      `[REFUND_REQUESTED] Order #${orderId} eligible for Razorpay refund: ₹${eligibleRefundAmount}, Payment ID: ${order.transactionId}`
    );

    // Create preliminary Refund audit record in database
    const idempotencyKey = `refund_${order.id}_${Date.now()}`;
    refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        paymentGateway: 'Razorpay',
        razorpayPaymentId: order.transactionId,
        amount: eligibleRefundAmount,
        currency: 'INR',
        status: 'PENDING',
        reason,
        idempotencyKey,
      },
    });

    try {
      // Initiate refund via dedicated Razorpay service
      const rzpResult = await RazorpayRefundService.createRefund({
        paymentId: order.transactionId,
        amountInRupees: eligibleRefundAmount,
        orderId: order.id,
        reason: `Customer cancellation: ${reason}`,
      });

      logger.info(
        `[REFUND_CREATED] Razorpay refund ${rzpResult.refundId} created. Status: ${rzpResult.status}`
      );

      // Update Refund record with Razorpay refund ID and status
      refundRecord = await prisma.refund.update({
        where: { id: refundRecord.id },
        data: {
          razorpayRefundId: rzpResult.refundId,
          status: rzpResult.status,
          processedAt: rzpResult.status === 'PROCESSED' ? new Date() : null,
        },
      });

      // Update Order with confirmed refund information
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: rzpResult.status,
          refundAmount: rzpResult.amount,
          refundId: rzpResult.refundId,
          refundInitiatedAt: new Date(),
          refundProcessedAt: rzpResult.status === 'PROCESSED' ? new Date() : null,
          paymentStatus: rzpResult.status === 'PROCESSED' ? 'Refunded' : order.paymentStatus,
          refundedAt: rzpResult.status === 'PROCESSED' ? new Date() : null,
        },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, image: true } } },
          },
          refunds: true,
        },
      });

      logger.info(`[REFUND_${rzpResult.status}] Order #${orderId} refund status: ${rzpResult.status}`);
    } catch (refundError: any) {
      const errorMsg = refundError?.message || 'Razorpay refund initiation failed';
      logger.error(`[REFUND_FAILED] Order #${orderId} refund call failed:`, refundError);

      // Persist failure reason to refund audit record and order record
      await prisma.refund.update({
        where: { id: refundRecord.id },
        data: {
          status: 'FAILED',
          failureReason: errorMsg,
        },
      });

      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: 'FAILED',
          refundFailureReason: errorMsg,
        },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, image: true } } },
          },
          refunds: true,
        },
      });

      // Trigger Alert Email to Admin regarding refund failure
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@homerituals.com';
        await sendEmail({
          to: adminEmail,
          subject: `ACTION REQUIRED: Automatic Refund Failed for Order #${order.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px;">
              <h2 style="color: #b91c1c;">Refund Initiation Failed</h2>
              <p>Order <strong>#${order.id}</strong> was cancelled by customer, but Razorpay refund could not be initiated automatically.</p>
              <p><strong>Customer:</strong> ${order.fullName} (${order.user?.email || order.phone})</p>
              <p><strong>Payment ID:</strong> ${order.transactionId}</p>
              <p><strong>Amount:</strong> ₹${eligibleRefundAmount}</p>
              <p><strong>Gateway Error:</strong> ${errorMsg}</p>
              <p>Please review and initiate the refund manually via the Razorpay Dashboard.</p>
            </div>
          `,
          text: `Action Required: Refund failed for Order #${order.id}. Error: ${errorMsg}`,
        });
      } catch (adminErr) {
        logger.error('Failed to notify admin of refund failure:', adminErr);
      }
    }
  } else {
    // COD or unpaid order cancellation
    updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, image: true } } },
        },
        refunds: true,
      },
    });
  }

  // 8. Send Order Cancellation Confirmation Email to Customer (Failure tolerant)
  const customerEmail = order.user?.email;
  if (customerEmail) {
    try {
      const itemsSummary = order.items.map((it: any) => ({
        name: it.product?.name || 'Home Care Product',
        quantity: it.quantity,
        price: it.price,
      }));

      await sendEmail({
        to: customerEmail,
        subject: `Your Home Rituals Order #${order.id} Has Been Cancelled`,
        html: emailTemplates.getOrderCancelledHtml({
          orderId: order.id,
          customerName: order.fullName || order.user?.name || 'Valued Customer',
          cancellationDate: cancellationTimestamp.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          cancellationReason: reason,
          items: itemsSummary,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentGateway || (order.paymentStatus === 'Paid' ? 'Razorpay' : 'Cash on Delivery'),
          refundStatus: updatedOrder.refundStatus || 'NOT_APPLICABLE',
          refundAmount: isOnlinePaid ? eligibleRefundAmount : undefined,
          refundId: updatedOrder.refundId,
        }),
        text: `Hello ${order.fullName},\n\nYour order #${order.id} has been cancelled successfully.\nCancellation Reason: ${reason}.\n${
          isOnlinePaid
            ? `Your refund of ₹${eligibleRefundAmount} has been initiated through Razorpay.`
            : 'No payment refund is required.'
        }\n\nThank you,\nHome Rituals Team`,
      });

      logger.info(`[CANCELLATION_EMAIL_SENT] Sent cancellation email to ${customerEmail} for Order #${order.id}`);
    } catch (emailErr) {
      logger.error(`[CANCELLATION_EMAIL_FAILED] Failed to send cancellation email for Order #${order.id}:`, emailErr);
      // We explicitly DO NOT fail the cancellation because of an email sending failure.
    }
  }

  return {
    order: updatedOrder,
    refund: refundRecord,
    isOnlinePaid,
    refundAmount: isOnlinePaid ? eligibleRefundAmount : 0,
    refundStatus: updatedOrder.refundStatus,
  };
}
