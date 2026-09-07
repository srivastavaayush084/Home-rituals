import { Router } from 'express';
import {
  initiatePaymentDirect,
  handlePaytmCallback,
  verifyPaymentDirect,
  handleWebhook,
} from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Endpoint for initiating payment session
router.post('/initiate', requireAuth, initiatePaymentDirect);

// Public callback endpoint for Paytm server response (handles both POST form data and GET redirect fallback)
router.post('/callback', handlePaytmCallback);
router.get('/callback', handlePaytmCallback);

// Verification endpoint for client confirmation
router.post('/verify', requireAuth, verifyPaymentDirect);

// Webhook / IPN endpoint for asynchronous Paytm notifications
router.post('/webhook', handleWebhook);

export default router;
