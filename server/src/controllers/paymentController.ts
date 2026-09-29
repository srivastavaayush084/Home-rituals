import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  fetchRazorpayPayment,
  getRazorpayConfig,
} from '../services/razorpay';
import { finalizePaidOrder } from '../services/orderFinalization';
import { logger } from '../utils/logger';

/**
 * Initiates a Razorpay payment order.
 * Supports both:
 * 1. E-commerce cart checkout: validates stock & computes amount strictly on the server from DB.
 * 2. Direct amount specification: validates amount >= 100 paise.
 */
export async function initiatePaymentDirect(req: AuthenticatedRequest, res: Response, _next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    const { addressId, amount, currency, receipt: customReceipt } = req.body;

    const config = getRazorpayConfig();
    if (!config.isConfigured) {
      logger.error('[Razorpay] Configuration error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing.');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Payment gateway configuration error: Razorpay credentials are not configured.',
          code: 'PAYMENT_GATEWAY_CONFIG_ERROR',
        },
      });
    }

    let payablePaise = 0;
    let payableRupees = 0;

    // Scenario A: Direct amount provided (e.g. developer test console or custom amount)
    if (amount !== undefined && amount !== null) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        });
      }

      // If integer >= 100 without decimals or explicitly marked as paise, treat as paise
      payablePaise = req.body.isPaise || (Number.isInteger(parsedAmount) && parsedAmount >= 100 && !addressId)
        ? parsedAmount
        : Math.round(parsedAmount * 100);

      if (payablePaise < 100) {
        return res.status(400).json({
          success: false,
          error: { message: 'Minimum amount must be at least 100 paise (₹1.00)', code: 'AMOUNT_TOO_LOW' },
        });
      }
      payableRupees = payablePaise / 100;
    } else {
      // Scenario B: E-commerce cart checkout (validates cart & inventory server-side)
      if (!addressId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Address ID or amount is required', code: 'MISSING_REQUIRED_FIELD' },
        });
      }

      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });

      if (cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Your cart is empty', code: 'EMPTY_CART' },
        });
      }

      let totalAmount = 0;
      for (const item of cartItems) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.deletedAt) {
          return res.status(400).json({
            success: false,
            error: { message: `Product "${item.product?.name || 'Item'}" is no longer available`, code: 'PRODUCT_UNAVAILABLE' },
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            error: { message: `Insufficient stock for "${product.name}". Only ${product.stock} available.`, code: 'INSUFFICIENT_STOCK' },
          });
        }

        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;
      }

      payableRupees = totalAmount;
      payablePaise = Math.round(totalAmount * 100);

      if (payablePaise < 100) {
        return res.status(400).json({
          success: false,
          error: { message: 'Transaction amount must be at least 100 paise (₹1.00)', code: 'AMOUNT_TOO_LOW' },
        });
      }
    }

    // Retrieve user profile for customer metadata
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, email: true },
    });

    const receipt = customReceipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notes: Record<string, string> = {
      userId,
      ...(addressId ? { addressId: String(addressId) } : {}),
    };

    // Create Razorpay order via official SDK
    const rzpOrder = await createRazorpayOrder({
      amount: payableRupees,
      amountInPaise: payablePaise,
      currency: currency || 'INR',
      receipt,
      notes,
    });

    logger.info(`[Razorpay] Order created: ${rzpOrder.orderId} for User: ${userId}, Amount: ${rzpOrder.amount} paise`);

    return res.status(200).json({
      success: true,
      order_id: rzpOrder.orderId,
      orderId: rzpOrder.orderId,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      receipt: rzpOrder.receipt,
      keyId: rzpOrder.keyId,
      key_id: rzpOrder.keyId,
      data: {
        orderId: rzpOrder.orderId,
        order_id: rzpOrder.orderId,
        amount: rzpOrder.amount,
        amountInRupees: payableRupees,
        currency: rzpOrder.currency,
        receipt: rzpOrder.receipt,
        keyId: rzpOrder.keyId,
        key_id: rzpOrder.keyId,
        environment: config.environment,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
      },
    });
  } catch (error: any) {
    logger.error('[Razorpay Order Error]:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Failed to create Razorpay order',
        code: 'RAZORPAY_ORDER_CREATION_FAILED',
      },
    });
  }
}

/**
 * Endpoint to verify Razorpay payment signatures: POST /api/verify-payment.
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compares generated signature with razorpay_signature.
 * Returns success only if signatures match.
 */
export async function verifyPaymentDirect(req: AuthenticatedRequest, res: Response, _next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    const razorpay_order_id = req.body.razorpay_order_id || req.body.orderId || req.body.order_id;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.paymentId || req.body.transactionId;
    const razorpay_signature = req.body.razorpay_signature || req.body.signature;
    const addressId = req.body.addressId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
          code: 'MISSING_VERIFICATION_FIELDS',
        },
      });
    }

    logger.info(`[Razorpay Verify] Verifying signature for Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);

    // 1. Verify cryptographic HMAC-SHA256 signature
    const isSignatureValid = verifyRazorpayPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isSignatureValid) {
      logger.warn(`[Razorpay Verify] Cryptographic signature verification failed for Order: ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Payment verification failed: Invalid signature.',
          code: 'PAYMENT_SIGNATURE_INVALID',
        },
      });
    }

    // 2. Fetch payment details from Razorpay to confirm status
    try {
      const paymentDetails = await fetchRazorpayPayment(razorpay_payment_id);
      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        logger.warn(`[Razorpay Verify] Payment ${razorpay_payment_id} status is ${paymentDetails.status}`);
        return res.status(400).json({
          success: false,
          error: {
            message: `Payment status verification failed. Current status: ${paymentDetails.status}`,
            code: 'PAYMENT_NOT_AUTHORIZED',
          },
        });
      }
    } catch (fetchError: any) {
      logger.warn(`[Razorpay Verify] Could not fetch payment status from API (proceeding with verified signature):`, fetchError?.message);
    }

    // 3. Finalize order inside transactional boundary if addressId is present
    if (addressId) {
      const finalization = await finalizePaidOrder({
        userId,
        addressId: String(addressId),
        transactionId: razorpay_payment_id,
        gatewayOrderId: razorpay_order_id,
        signature: razorpay_signature,
        paymentGateway: 'Razorpay',
      });

      return sendSuccess(res, finalization);
    }

    // 4. If addressId is not in request (e.g. standalone test/verify call), check existing order or return verification success
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ gatewayOrderId: razorpay_order_id }, { transactionId: razorpay_payment_id }],
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment signature verified successfully',
      razorpay_order_id,
      razorpay_payment_id,
      order: existingOrder || null,
    });
  } catch (error: any) {
    logger.error('[Razorpay Verify Error]:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Internal error during payment verification',
        code: 'PAYMENT_VERIFICATION_ERROR',
      },
    });
  }
}

/**
 * Handles incoming Razorpay Webhook events (e.g. payment.captured, order.paid, payment.failed).
 * Validates the HMAC-SHA256 signature against the raw body buffer.
 * Fully idempotent to handle duplicate webhook deliveries safely.
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const config = getRazorpayConfig();

    if (!signature) {
      logger.warn('[Razorpay Webhook] Missing x-razorpay-signature header');
      return res.status(400).json({ success: false, error: 'Missing webhook signature' });
    }

    // Retrieve raw body buffer for accurate signature validation
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, config.webhookSecret);

    if (!isValid) {
      logger.warn('[Razorpay Webhook] Invalid webhook signature received');
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;
    logger.info(`[Razorpay Webhook] Verified event: ${eventType} (ID: ${event.id || 'N/A'})`);

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const notes = orderEntity?.notes || paymentEntity?.notes || {};

      const userId = notes.userId;
      const addressId = notes.addressId;

      logger.info(`[Razorpay Webhook] Processing paid order: ${rzpOrderId}, Payment: ${paymentId}`);

      if (paymentId && rzpOrderId) {
        // Check if order was already finalized (e.g. by frontend verification)
        const existing = await prisma.order.findFirst({
          where: {
            OR: [{ gatewayOrderId: rzpOrderId }, { transactionId: paymentId }],
          },
        });

        if (existing) {
          logger.info(`[Razorpay Webhook] Order ${existing.id} already finalized. Idempotent skip.`);
          return res.status(200).json({ success: true, message: 'Order already finalized' });
        }

        // If user & address context are available in order notes, finalize the order
        if (userId && addressId) {
          try {
            await finalizePaidOrder({
              userId,
              addressId,
              transactionId: paymentId,
              gatewayOrderId: rzpOrderId,
              signature,
              paymentGateway: 'Razorpay',
            });
            logger.info(`[Razorpay Webhook] Order finalized via webhook for Order: ${rzpOrderId}`);
          } catch (finalizeError) {
            logger.error('[Razorpay Webhook] Error finalising order in webhook:', finalizeError);
          }
        } else {
          logger.warn(`[Razorpay Webhook] Missing userId or addressId in notes for Order ${rzpOrderId}`);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      logger.warn(`[Razorpay Webhook] Payment failed: ${paymentEntity?.id}, Reason: ${paymentEntity?.error_description}`);
    }

    // Acknowledge receipt of webhook to Razorpay
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[Razorpay Webhook] Unhandled webhook processing error:', error);
    next(error);
  }
}
