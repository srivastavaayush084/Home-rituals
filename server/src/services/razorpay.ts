import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  environment: 'test' | 'production';
  isProduction: boolean;
  isConfigured: boolean;
}

export interface CreateOrderParams {
  amount: number; // in rupees
  amountInPaise?: number; // explicit paise
  receipt?: string;
  currency?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  orderId: string;
  order_id: string;
  amount: number; // in paise
  currency: string;
  receipt?: string;
  keyId: string;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Retrieves Razorpay configuration from server environment variables.
 * Keys and secrets are kept strictly server-side.
 */
export function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const envRaw = (process.env.RAZORPAY_ENV || 'test').toLowerCase();
  const isProduction = envRaw === 'production' || envRaw === 'live' || keyId.startsWith('rzp_live_');
  const environment: 'test' | 'production' = isProduction ? 'production' : 'test';

  const isConfigured = Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('your_') &&
    !keySecret.includes('your_')
  );

  return {
    keyId,
    keySecret,
    webhookSecret,
    environment,
    isProduction,
    isConfigured,
  };
}

let razorpayInstance: Razorpay | null = null;
let currentKeyId = '';

/**
 * Returns a cached or newly initialized instance of the official Razorpay SDK client.
 */
export function getRazorpayInstance(): Razorpay {
  const config = getRazorpayConfig();

  if (!config.isConfigured) {
    logger.error('[Razorpay] Missing or invalid credentials: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.');
    throw new Error('Payment gateway configuration error. Razorpay credentials are not configured.');
  }

  if (!razorpayInstance || currentKeyId !== config.keyId) {
    razorpayInstance = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
    currentKeyId = config.keyId;
  }

  return razorpayInstance;
}

/**
 * Creates an order on Razorpay using the official Orders API.
 * Converts amount from Rupees to Paise (e.g. ₹499.00 -> 49900).
 * Minimum amount: 100 paise.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const config = getRazorpayConfig();
  const rzp = getRazorpayInstance();

  const amountInPaise = params.amountInPaise
    ? Math.round(params.amountInPaise)
    : Math.round(params.amount * 100);

  if (amountInPaise < 100) {
    throw new Error('Transaction amount must be at least 100 paise (₹1.00)');
  }

  const currency = params.currency || 'INR';
  const receipt = params.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    logger.info(`[Razorpay] Creating Order for amount: ₹${params.amount.toFixed(2)} (${amountInPaise} paise), receipt: ${receipt}`);

    const options: any = {
      amount: amountInPaise,
      currency,
      receipt,
      notes: params.notes || {},
    };

    const order: any = await rzp.orders.create(options);

    logger.info(`[Razorpay] Order created successfully: ${order.id}`);

    return {
      orderId: order.id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      keyId: config.keyId,
    };
  } catch (error: any) {
    logger.error('[Razorpay] Order creation failed:', error);
    throw new Error(error?.error?.description || error.message || 'Failed to create Razorpay order');
  }
}

/**
 * Securely verifies payment signature using HMAC-SHA256 and constant-time string comparison.
 * 공식 Razorpay Signature Verification: HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpayPaymentSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: VerifyPaymentParams): boolean {
  const config = getRazorpayConfig();

  if (!config.isConfigured || !config.keySecret) {
    logger.error('[Razorpay] Cannot verify signature: secret is missing');
    return false;
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    logger.warn('[Razorpay] Missing verification parameters');
    return false;
  }

  try {
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(razorpay_signature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!isValid) {
      logger.warn(`[Razorpay] Signature mismatch for Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);
    }
    return isValid;
  } catch (error) {
    logger.error('[Razorpay] Error during payment signature verification:', error);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using webhook secret and raw request body.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  customSecret?: string
): boolean {
  const config = getRazorpayConfig();
  const secret = customSecret || config.webhookSecret;

  if (!secret) {
    logger.warn('[Razorpay Webhook] Webhook secret not configured. Rejecting webhook request.');
    return false;
  }

  if (!signature || !rawBody) {
    return false;
  }

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    logger.error('[Razorpay Webhook] Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Fetches Razorpay Payment details by paymentId from Razorpay REST API.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<any> {
  const rzp = getRazorpayInstance();
  try {
    return await rzp.payments.fetch(paymentId);
  } catch (error: any) {
    logger.error(`[Razorpay] Failed to fetch payment ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Fetches Razorpay Order details by orderId from Razorpay REST API.
 */
export async function fetchRazorpayOrder(orderId: string): Promise<any> {
  const rzp = getRazorpayInstance();
  try {
    return await rzp.orders.fetch(orderId);
  } catch (error: any) {
    logger.error(`[Razorpay] Failed to fetch order ${orderId}:`, error);
    throw error;
  }
}
