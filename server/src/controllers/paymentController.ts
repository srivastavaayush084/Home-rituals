import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { BadRequestError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
  createRazorpayOrder,
  fetchRazorpayOrder
} from '../services/razorpay';
import { finalizePaidOrder } from '../services/orderFinalization';
import { logger } from '../utils/logger';

/**
 * Creates a Razorpay order based on the user's cart content.
 * Serves as the first step of the checkout process.
 */
export async function createRazorpayOrderDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { addressId } = req.body;

    if (!addressId) {
      throw new BadRequestError('Address ID is required');
    }

    // Check if Razorpay keys are configured
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || keyId === 'your_razorpay_key_id' || !keySecret || keySecret === 'your_razorpay_key_secret') {
      logger.error('Razorpay credentials missing in environment configurations.');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Payment gateway configuration error. Please contact administration.',
          code: 'PAYMENT_GATEWAY_CONFIG_ERROR',
        }
      });
    }

    // 1. Get user's cart from database
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    // 2. Validate stock and calculate totals
    let totalAmount = 0;

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.deletedAt) {
        throw new BadRequestError(`Product "${item.product?.name || 'Item'}" is no longer available`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for "${product.name}". Only ${product.stock} available.`);
      }

      // Determine price (use discount price if present, else standard price)
      const price = product.discountPrice || product.price;
      totalAmount += price * item.quantity;
    }

    // 3. Create Razorpay order (Amount is in Paise: 1 INR = 100 Paise)
    const amountInPaise = Math.round(totalAmount * 100);
    const receipt = `rcpt_${userId.substring(userId.length - 8)}_${Date.now().toString().substring(5)}`;
    
    // Store metadata in order notes to reconstruct cart on Webhook fallback if needed
    const notes = { userId, addressId };
    
    const razorpayOrder = await createRazorpayOrder(amountInPaose(amountInPaise), receipt, notes);

    logger.info(`Razorpay order created: ${razorpayOrder.id} for user ${userId}. Total: ₹${totalAmount}`);

    return res.status(200).json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
    });
  } catch (error) {
    next(error);
  }
}

// Helper to ensure correct type
function amountInPaose(val: number): number {
  return val;
}

/**
 * Endpoint for the frontend to verify standard Razorpay Web payments.
 */
export async function verifyPaymentDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const razorpayOrderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const razorpayPaymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const razorpaySignature = req.body.razorpay_signature || req.body.razorpaySignature;
    const addressId = req.body.addressId;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !addressId) {
      throw new BadRequestError('Missing required payment verification parameters');
    }

    // 1. Verify HMAC Signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      throw new BadRequestError('Payment signature verification failed');
    }

    // 2. Retrieve order from Razorpay to verify amount
    const rzpOrder = await fetchRazorpayOrder(razorpayOrderId);
    
    // 3. Recalculate cart amount and compare
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    let totalAmount = 0;
    for (const item of cartItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;
      }
    }

    const expectedAmountInPaise = Math.round(totalAmount * 100);
    if (rzpOrder.amount !== expectedAmountInPaise) {
      logger.warn(`Razorpay payment amount verification failed. Expected: ${expectedAmountInPaise}, Got: ${rzpOrder.amount}`);
      throw new BadRequestError('Payment amount mismatch. Transaction aborted.');
    }

    // 4. Finalize paid order inside transactional service
    const finalizationResult = await finalizePaidOrder({
      userId,
      addressId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.status(200).json(finalizationResult);
  } catch (error) {
    next(error);
  }
}

/**
 * Shared redirect controller matching legacy routes /api/payments/verify
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  return verifyPaymentDirect(req as AuthenticatedRequest, res, next);
}

/**
 * Webhook controller for Razorpay server events.
 * Recovers transaction details from Razorpay Order notes if frontend fails to call verify.
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      logger.warn('Razorpay webhook header or secret is missing. Skipping verification.');
      return res.status(400).json({ success: false, error: 'Webhook configuration error' });
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
      const entity = req.body.payload.payment?.entity || req.body.payload.order?.entity;
      if (!entity) {
        logger.warn('Webhook received without entities in payload');
        return res.status(200).json({ success: true });
      }

      const razorpayOrderId = entity.order_id || entity.id;
      
      // Fetch associated Razorpay order to get notes context securely (ignoring potentially modified frontend inputs)
      const rzpOrder = await fetchRazorpayOrder(razorpayOrderId);
      const notes = (rzpOrder as any).notes || {};
      const userId = notes.userId ? String(notes.userId) : undefined;
      const addressId = notes.addressId ? String(notes.addressId) : undefined;

      if (!userId || !addressId) {
        logger.warn(`Webhook ignored: missing userId/addressId in notes metadata for Razorpay Order ${razorpayOrderId}`);
        return res.status(200).json({ success: true, message: 'Skipped - no metadata notes' });
      }

      // Check if already processed in database
      const existing = await prisma.order.findFirst({
        where: {
          OR: [
            { razorpayOrderId },
            { razorpayPaymentId: entity.id }
          ]
        }
      });

      if (existing) {
        logger.info(`Webhook duplicate check: Order for Razorpay Order ${razorpayOrderId} already created`);
        return res.status(200).json({ success: true });
      }

      // Finalize the order transactionally
      const paymentId = entity.id || `pay_${Date.now()}_webhook`;
      await finalizePaidOrder({
        userId,
        addressId,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
      });

      logger.info(`Webhook fallback successfully resolved paid order for Razorpay Order: ${razorpayOrderId}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
