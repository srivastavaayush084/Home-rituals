import PaytmChecksum from 'paytmchecksum';
import { logger } from '../utils/logger';

export interface InitiatePaytmParams {
  orderId: string;
  amount: number;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  callbackUrl?: string;
}

export interface InitiatePaytmResult {
  orderId: string;
  txnToken: string;
  amount: number;
  currency: string;
  mid: string;
  callbackUrl: string;
  isStaging: boolean;
  paytmHost: string;
}

export interface PaytmStatusResult {
  resultInfo: {
    resultStatus: string;
    resultCode: string;
    resultMsg: string;
  };
  txnId?: string;
  bankTxnId?: string;
  orderId?: string;
  txnAmount?: string;
  txnType?: string;
  gatewayName?: string;
  bankName?: string;
  mid?: string;
  paymentMode?: string;
  refundAmt?: string;
  txnDate?: string;
  [key: string]: any;
}

export function getPaytmConfig() {
  const mid = process.env.PAYTM_MID || '';
  const merchantKey = process.env.PAYTM_MERCHANT_KEY || '';
  const environment = (process.env.PAYTM_ENVIRONMENT || 'STAGING').toUpperCase();
  const isProduction = environment === 'PROD' || environment === 'PRODUCTION';
  const website = process.env.PAYTM_WEBSITE || (isProduction ? 'DEFAULT' : 'WEBSTAGING');
  const channelId = process.env.PAYTM_CHANNEL_ID || 'WEB';
  const industryType = process.env.PAYTM_INDUSTRY_TYPE || 'Retail';
  const host = isProduction ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
  
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const callbackUrl = process.env.PAYTM_CALLBACK_URL || `${backendUrl}/api/payments/callback`;
  const isMockMode = process.env.PAYMENT_MOCK_MODE === 'true';

  const isConfigured = Boolean(
    mid &&
    merchantKey &&
    mid !== 'YOUR_PAYTM_MID' &&
    merchantKey !== 'YOUR_PAYTM_MERCHANT_KEY'
  );

  return {
    mid,
    merchantKey,
    website,
    channelId,
    industryType,
    environment,
    isProduction,
    isStaging: !isProduction,
    host,
    callbackUrl,
    isMockMode,
    isConfigured,
  };
}

/**
 * Initiates a Paytm Transaction via official /theia/api/v1/initiateTransaction S2S API
 */
export async function initiatePaytmTransaction(params: InitiatePaytmParams): Promise<InitiatePaytmResult> {
  const config = getPaytmConfig();

  if (params.amount <= 0) {
    throw new Error('Transaction amount must be greater than 0');
  }

  // Handle Mock Mode strictly when PAYMENT_MOCK_MODE=true is set
  if (!config.isConfigured) {
    if (config.isMockMode) {
      logger.warn(`[Paytm] Running in isolated MOCK mode for order: ${params.orderId}`);
      return {
        orderId: params.orderId,
        txnToken: `mock_txn_token_${Date.now()}`,
        amount: params.amount,
        currency: 'INR',
        mid: config.mid || 'MOCK_PAYTM_MID',
        callbackUrl: params.callbackUrl || config.callbackUrl,
        isStaging: true,
        paytmHost: config.host,
      };
    }

    logger.error('[Paytm] Credentials missing: PAYTM_MID and PAYTM_MERCHANT_KEY must be configured in environment');
    throw new Error('Payment gateway configuration error. Please configure Paytm staging credentials.');
  }

  try {
    const paytmParams: Record<string, any> = {
      body: {
        requestType: 'Payment',
        mid: config.mid,
        websiteName: config.website,
        orderId: params.orderId,
        callbackUrl: params.callbackUrl || config.callbackUrl,
        txnAmount: {
          value: params.amount.toFixed(2),
          currency: 'INR',
        },
        userInfo: {
          custId: params.customerId,
          mobile: params.customerPhone || undefined,
          email: params.customerEmail || undefined,
        },
      },
    };

    // Generate cryptographic signature using Merchant Key
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      config.merchantKey
    );

    paytmParams.head = {
      signature: checksum,
    };

    const endpoint = `${config.host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(config.mid)}&orderId=${encodeURIComponent(params.orderId)}`;
    
    logger.info(`[Paytm] Initiating transaction at ${endpoint} for Order ${params.orderId}, Amount: ₹${params.amount.toFixed(2)}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmParams),
    });

    if (!response.ok) {
      throw new Error(`Paytm API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    if (!data || !data.body || !data.body.resultInfo) {
      logger.error('[Paytm] Invalid response structure received from Initiate Transaction API:', data);
      throw new Error('Invalid response structure received from Paytm');
    }

    const { resultStatus, resultCode, resultMsg } = data.body.resultInfo;

    if (resultStatus !== 'S') {
      logger.error(`[Paytm] Initiate Transaction Failed [${resultCode}]: ${resultMsg}`);
      throw new Error(`Paytm transaction initiation failed: ${resultMsg} (Code: ${resultCode})`);
    }

    const txnToken = data.body.txnToken;
    if (!txnToken) {
      throw new Error('Paytm Initiate Transaction succeeded but no txnToken returned');
    }

    return {
      orderId: params.orderId,
      txnToken,
      amount: params.amount,
      currency: 'INR',
      mid: config.mid,
      callbackUrl: params.callbackUrl || config.callbackUrl,
      isStaging: config.isStaging,
      paytmHost: config.host,
    };
  } catch (error: any) {
    logger.error('[Paytm] Error initiating transaction:', error);
    throw error;
  }
}

/**
 * Verifies Paytm Checksum signature for callback data or webhooks
 */
export async function verifyPaytmChecksum(params: Record<string, any>, checksum: string): Promise<boolean> {
  const config = getPaytmConfig();

  if (!config.isConfigured) {
    if (config.isMockMode && checksum?.startsWith('mock_')) {
      logger.info('[Paytm] Validating checksum in isolated MOCK mode');
      return true;
    }
    return false;
  }

  try {
    const paytmParams: Record<string, any> = { ...params };
    delete paytmParams.CHECKSUMHASH;

    return Boolean(
      PaytmChecksum.verifySignature(
        paytmParams as any,
        config.merchantKey,
        checksum
      )
    );
  } catch (error) {
    logger.error('[Paytm] Error verifying checksum:', error);
    return false;
  }
}

/**
 * Queries Paytm Server-to-Server (S2S) Transaction Status API (/order/status)
 */
export async function fetchPaytmTransactionStatus(orderId: string): Promise<PaytmStatusResult> {
  const config = getPaytmConfig();

  if (!config.isConfigured) {
    if (config.isMockMode && orderId.startsWith('ORD_MOCK_')) {
      logger.info(`[Paytm] Returning mock S2S status for Order ID: ${orderId}`);
      return {
        resultInfo: {
          resultStatus: 'TXN_SUCCESS',
          resultCode: '01',
          resultMsg: 'Txn Success (Mock)',
        },
        orderId,
        txnId: `PTM_MOCK_TXN_${Date.now()}`,
        txnAmount: '100.00',
        paymentMode: 'PPI',
      };
    }
    throw new Error('Paytm credentials not configured');
  }

  try {
    const statusBody = {
      mid: config.mid,
      orderId,
    };

    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(statusBody),
      config.merchantKey
    );

    const statusPayload = {
      body: statusBody,
      head: {
        signature,
      },
    };

    const endpoint = `${config.host}/order/status?mid=${encodeURIComponent(config.mid)}&orderId=${encodeURIComponent(orderId)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statusPayload),
    });

    if (!response.ok) {
      throw new Error(`Paytm Status API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    if (!data || !data.body || !data.body.resultInfo) {
      throw new Error('Invalid response structure received from Paytm Order Status API');
    }

    return data.body as PaytmStatusResult;
  } catch (error: any) {
    logger.error(`[Paytm] Error querying transaction status for Order ${orderId}:`, error);
    throw error;
  }
}
