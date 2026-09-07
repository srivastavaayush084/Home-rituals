import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { sendSuccess, BadRequestError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  initiatePaytmTransaction,
  verifyPaytmChecksum,
  fetchPaytmTransactionStatus,
  getPaytmConfig,
} from '../services/paytm';
import { finalizePaidOrder } from '../services/orderFinalization';
import { logger } from '../utils/logger';

/**
 * Initiates a Paytm payment session based on the user's cart content.
 * Validates stock and calculates the payable amount strictly on the server.
 */
export async function initiatePaymentDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { addressId } = req.body;

    if (!addressId) {
      throw new BadRequestError('Address ID is required');
    }

    const config = getPaytmConfig();
    if (!config.isConfigured && !config.isMockMode) {
      logger.error('Paytm credentials missing in environment configurations.');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Payment gateway configuration error: Paytm staging credentials (PAYTM_MID, PAYTM_MERCHANT_KEY) are missing.',
          code: 'PAYMENT_GATEWAY_CONFIG_ERROR',
        },
      });
    }

    // 1. Fetch user's cart from database
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    // 2. Validate stock and calculate amount server-side
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

      const price = product.discountPrice || product.price;
      totalAmount += price * item.quantity;
    }

    // 3. Retrieve user profile for customer metadata
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    // 4. Generate unique gateway order reference
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Append metadata to callbackUrl so the server knows the user and shipping address upon callback
    const callbackWithMeta = `${config.callbackUrl}?userId=${encodeURIComponent(userId)}&addressId=${encodeURIComponent(addressId)}`;

    // 5. Initiate Paytm transaction via official S2S API
    const paytmResult = await initiatePaytmTransaction({
      orderId,
      amount: totalAmount,
      customerId: userId,
      customerPhone: user?.phone || undefined,
      customerEmail: user?.email || undefined,
      callbackUrl: callbackWithMeta,
    });

    logger.info(`Paytm transaction initiated: ${orderId} for User: ${userId}, Amount: ₹${totalAmount}`);

    return sendSuccess(res, {
      order_id: paytmResult.orderId,
      orderId: paytmResult.orderId,
      txnToken: paytmResult.txnToken,
      amount: paytmResult.amount,
      currency: paytmResult.currency || 'INR',
      mid: paytmResult.mid,
      isStaging: paytmResult.isStaging,
      paytmHost: paytmResult.paytmHost,
      callbackUrl: paytmResult.callbackUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles Paytm POST callback (application/x-www-form-urlencoded).
 * Verifies checksum, performs S2S status check, finalizes order, and redirects.
 */
export async function handlePaytmCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const paytmParams: Record<string, any> = { ...req.body };

    const orderId = String(paytmParams.ORDERID || req.query.orderId || '');
    const txnId = String(paytmParams.TXNID || '');
    const status = String(paytmParams.STATUS || '');
    const respCode = String(paytmParams.RESPCODE || '');
    const respMsg = String(paytmParams.RESPMSG || 'Transaction processed');
    const checksum = String(paytmParams.CHECKSUMHASH || '');

    const userId = String(req.query.userId || paytmParams.MERC_UNQ_REF || '');
    const addressId = String(req.query.addressId || '');

    logger.info(`[Paytm Callback] Received for Order: ${orderId}, Status: ${status}, RespCode: ${respCode}, TxnId: ${txnId}`);

    if (!orderId) {
      logger.error('[Paytm Callback] Missing ORDERID in callback payload');
      return res.redirect(`${clientUrl}/payment?error=${encodeURIComponent('Missing order reference in payment response')}`);
    }

    // 1. Verify Checksum signature if present
    if (checksum) {
      const isChecksumValid = await verifyPaytmChecksum(paytmParams, checksum);
      if (!isChecksumValid) {
        logger.error(`[Paytm Callback] Checksum verification failed for Order: ${orderId}`);
        return res.redirect(`${clientUrl}/payment?error=${encodeURIComponent('Payment signature verification failed')}`);
      }
    }

    // 2. Perform Server-to-Server (S2S) Status Verification
    let statusResult;
    try {
      statusResult = await fetchPaytmTransactionStatus(orderId);
    } catch (statusError: any) {
      logger.error(`[Paytm Callback] S2S Status verification error for Order ${orderId}:`, statusError);
      return res.redirect(`${clientUrl}/payment?error=${encodeURIComponent(statusError.message || 'Payment status verification failed')}`);
    }

    const s2sStatus = statusResult.resultInfo?.resultStatus;
    const s2sCode = statusResult.resultInfo?.resultCode;
    const finalTxnId = statusResult.txnId || txnId || `PTM_${Date.now()}`;

    // 3. Confirm Transaction Success
    if (s2sStatus === 'TXN_SUCCESS' && (s2sCode === '01' || respCode === '01')) {
      if (!userId || !addressId) {
        logger.warn(`[Paytm Callback] Missing userId or addressId context for Order ${orderId}. Checking existing order...`);
        const existing = await prisma.order.findFirst({
          where: {
            OR: [{ gatewayOrderId: orderId }, { transactionId: finalTxnId }],
          },
        });
        if (existing) {
          return res.redirect(`${clientUrl}/order-success/${existing.id}`);
        }
        return res.redirect(`${clientUrl}/payment?error=${encodeURIComponent('Missing customer session context')}`);
      }

      // 4. Finalize paid order inside transaction
      const finalization = await finalizePaidOrder({
        userId,
        addressId,
        transactionId: finalTxnId,
        gatewayOrderId: orderId,
        signature: checksum || undefined,
        paymentGateway: 'Paytm',
      });

      const confirmedOrderId = finalization.order.id;
      logger.info(`[Paytm Callback] Order ${confirmedOrderId} finalized successfully. Redirecting to success page.`);

      return res.redirect(`${clientUrl}/order-success/${confirmedOrderId}`);
    }

    // Transaction failed or was cancelled
    logger.warn(`[Paytm Callback] Payment not successful for Order ${orderId}. Status: ${s2sStatus}, Msg: ${respMsg}`);
    return res.redirect(`${clientUrl}/payment?error=${encodeURIComponent(respMsg || 'Payment cancelled or failed')}`);
  } catch (error) {
    logger.error('[Paytm Callback] Unhandled callback processing error:', error);
    next(error);
  }
}

/**
 * Programmatic verification endpoint for frontend clients to confirm payment status.
 */
export async function verifyPaymentDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const orderId = req.body.orderId || req.body.order_id;
    const addressId = req.body.addressId;
    const checksum = req.body.checksum || req.body.CHECKSUMHASH;

    if (!orderId) {
      throw new BadRequestError('Order ID is required for verification');
    }

    // 1. Perform Server-to-Server (S2S) Status Verification
    const statusResult = await fetchPaytmTransactionStatus(orderId);
    const { resultStatus, resultCode, resultMsg } = statusResult.resultInfo;

    if (resultStatus !== 'TXN_SUCCESS' || resultCode !== '01') {
      logger.warn(`[Paytm Verify] Payment not successful for Order ${orderId}. Status: ${resultStatus}, Msg: ${resultMsg}`);
      return res.status(400).json({
        success: false,
        error: {
          message: resultMsg || 'Payment verification failed or transaction is not successful',
          code: 'PAYMENT_VERIFICATION_FAILED',
        },
      });
    }

    // 2. Finalize order if addressId is present
    if (addressId) {
      const finalization = await finalizePaidOrder({
        userId,
        addressId,
        transactionId: statusResult.txnId || `PTM_${Date.now()}`,
        gatewayOrderId: orderId,
        signature: checksum || undefined,
        paymentGateway: 'Paytm',
      });

      return sendSuccess(res, finalization);
    }

    // Return status if already processed or just checking
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ gatewayOrderId: orderId }, { transactionId: statusResult.txnId }],
      },
      include: { items: true },
    });

    return sendSuccess(res, {
      verified: true,
      status: resultStatus,
      transactionId: statusResult.txnId,
      order: existingOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generic webhook / notification controller for Paytm IPN events.
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const paytmParams = req.body;
    const checksum = paytmParams.CHECKSUMHASH;
    const orderId = paytmParams.ORDERID;

    if (!orderId || !checksum) {
      return res.status(400).json({ success: false, error: 'Missing required webhook parameters' });
    }

    const isValid = await verifyPaytmChecksum(paytmParams, checksum);
    if (!isValid) {
      logger.warn(`[Paytm Webhook] Invalid checksum for Order: ${orderId}`);
      return res.status(400).json({ success: false, error: 'Invalid checksum' });
    }

    logger.info(`[Paytm Webhook] Verified event for Order: ${orderId}, Status: ${paytmParams.STATUS}`);

    if (paytmParams.STATUS === 'TXN_SUCCESS') {
      const statusResult = await fetchPaytmTransactionStatus(orderId);
      if (statusResult.resultInfo?.resultStatus === 'TXN_SUCCESS') {
        logger.info(`[Paytm Webhook] S2S status confirmed for Order: ${orderId}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
