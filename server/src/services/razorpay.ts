import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const key_id = process.env.RAZORPAY_KEY_ID || 'mock_key_id';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';

let razorpayClient: Razorpay | null = null;

try {
  razorpayClient = new Razorpay({
    key_id,
    key_secret,
  });
} catch (error) {
  logger.error('Failed to initialize Razorpay Client. Ensure keys are set in environmental variables.', error);
}

/**
 * Creates a Razorpay Order
 * @param amountInPaise Amount in paise (1 INR = 100 Paise)
 * @param receipt Unique receipt ID (e.g. order-id)
 */
export async function createRazorpayOrder(amountInPaise: number, receipt: string) {
  if (!razorpayClient || key_id === 'mock_key_id') {
    logger.info(`Razorpay client is running in MOCK mode. Creating mock order for receipt: ${receipt}`);
    return {
      id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      status: 'created',
    };
  }

  try {
    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    });
    return order;
  } catch (error) {
    logger.error('Error creating Razorpay Order:', error);
    throw error;
  }
}

/**
 * Verifies Razorpay payment signature
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  if (razorpayOrderId.startsWith('order_mock_')) {
    logger.info(`Bypassing signature validation for Mock Razorpay Order ID: ${razorpayOrderId}`);
    return true;
  }

  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    logger.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    logger.error('Error verifying Razorpay webhook signature:', error);
    return false;
  }
}
