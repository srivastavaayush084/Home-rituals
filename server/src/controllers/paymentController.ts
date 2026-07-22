import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, BadRequestError, NotFoundError } from '../utils/response';
import { verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay';
import { sendEmail, emailTemplates } from '../services/email';
import { logger } from '../utils/logger';

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      throw new BadRequestError('Invalid signature. Payment verification failed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true } } },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Update payment details on Order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'Paid',
        status: 'Confirmed',
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    // Send confirmation emails
    await sendEmail({
      to: order.user.email,
      subject: `Payment Success for Order #${order.id}`,
      html: emailTemplates.getPaymentSuccessHtml(order.id, razorpayPaymentId, order.totalAmount),
      text: `Hello ${order.fullName},\n\nWe have received payment of ₹${order.totalAmount} for order #${order.id}.`,
    });

    logger.info(`Payment verified successfully for Order #${orderId}. Payment ID: ${razorpayPaymentId}`);
    return sendSuccess(res, updatedOrder, 200, 'Payment verified successfully');
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      logger.warn('Razorpay webhook header or secret is missing. Skipping verification.');
      return res.status(200).json({ success: true, message: 'Skipped validation' });
    }

    const payload = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      logger.warn('Invalid signature for Razorpay Webhook.');
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    logger.info(`Received Razorpay webhook event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      const order = await prisma.order.findUnique({
        where: { razorpayOrderId },
        include: { user: { select: { email: true } } },
      });

      if (order && order.paymentStatus !== 'Paid') {
        // Confirm payment
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'Paid',
            status: 'Confirmed',
            razorpayPaymentId,
          },
        });

        // Send confirmation email
        await sendEmail({
          to: order.user.email,
          subject: `Payment Confirmed via Webhook - Order #${order.id}`,
          html: emailTemplates.getPaymentSuccessHtml(order.id, razorpayPaymentId, order.totalAmount),
          text: `Hello ${order.fullName},\n\nPayment for order #${order.id} has been confirmed.`,
        });

        logger.info(`Order #${order.id} updated to Paid via Webhook payment.captured`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
