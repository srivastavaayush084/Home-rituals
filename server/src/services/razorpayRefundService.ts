import { getRazorpayInstance, getRazorpayConfig } from './razorpay';
import { logger } from '../utils/logger';

export interface InitiateRefundParams {
  paymentId: string;
  amountInRupees: number;
  orderId: string;
  reason?: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number; // in rupees
  amountInPaise: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  rawResponse?: any;
}

/**
 * Service dedicated to handling Razorpay Refund transactions.
 * Keeps Razorpay API keys strictly on the server and provides idempotent,
 * securely calculated refund operations.
 */
export class RazorpayRefundService {
  /**
   * Initiates a refund through Razorpay Payments API.
   * Converts amount in Rupees to Paise (e.g. ₹599 -> 59900 paise).
   */
  public static async createRefund(params: InitiateRefundParams): Promise<RefundResult> {
    const config = getRazorpayConfig();
    if (!config.isConfigured) {
      logger.error('[Razorpay Refund] Configuration error: Credentials are not configured.');
      throw new Error('Payment gateway configuration error. Razorpay credentials are not configured.');
    }

    const { paymentId, amountInRupees, orderId, reason, notes } = params;

    if (!paymentId) {
      throw new Error('Payment ID is required to initiate a Razorpay refund.');
    }

    const amountInPaise = Math.round(amountInRupees * 100);
    if (amountInPaise < 100) {
      throw new Error('Refund amount must be at least ₹1.00 (100 paise).');
    }

    const rzp = getRazorpayInstance();

    try {
      logger.info(
        `[Razorpay Refund] Initiating refund for Order #${orderId}, Payment ID: ${paymentId}, Amount: ₹${amountInRupees.toFixed(2)} (${amountInPaise} paise)`
      );

      const refundOptions: any = {
        amount: amountInPaise,
        speed: 'normal', // standard bank processing
        notes: {
          orderId: String(orderId),
          reason: reason || 'Customer Order Cancellation',
          ...(notes || {}),
        },
      };

      // Call official Razorpay payments.refund API
      const rzpRefund: any = await rzp.payments.refund(paymentId, refundOptions);

      logger.info(
        `[Razorpay Refund] Refund initiated successfully: ${rzpRefund.id} for Order #${orderId}, Status: ${rzpRefund.status}`
      );

      // Map Razorpay status: 'processed', 'processing', 'pending', etc.
      let normalizedStatus: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' = 'PROCESSING';
      if (rzpRefund.status === 'processed') {
        normalizedStatus = 'PROCESSED';
      } else if (rzpRefund.status === 'failed') {
        normalizedStatus = 'FAILED';
      } else if (rzpRefund.status === 'pending') {
        normalizedStatus = 'PENDING';
      }

      return {
        success: true,
        refundId: rzpRefund.id,
        amount: (rzpRefund.amount || amountInPaise) / 100,
        amountInPaise: rzpRefund.amount || amountInPaise,
        currency: rzpRefund.currency || 'INR',
        status: normalizedStatus,
        rawResponse: rzpRefund,
      };
    } catch (error: any) {
      const errorDesc = error?.error?.description || error?.message || 'Razorpay refund request failed';
      const errorCode = error?.error?.code || 'RAZORPAY_REFUND_ERROR';

      logger.error(`[Razorpay Refund Failed] Order #${orderId}, Payment ID: ${paymentId}: [${errorCode}] ${errorDesc}`);
      throw new Error(errorDesc);
    }
  }

  /**
   * Fetches the latest refund details by Razorpay refund ID.
   */
  public static async fetchRefund(refundId: string): Promise<any> {
    const rzp = getRazorpayInstance();
    try {
      return await (rzp as any).refunds.fetch(refundId);
    } catch (error: any) {
      logger.error(`[Razorpay Refund] Failed to fetch refund ${refundId}:`, error);
      throw error;
    }
  }
}
