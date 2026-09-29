import { Router } from 'express';
import {
  initiatePaymentDirect,
  verifyPaymentDirect,
  handleWebhook,
} from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Official Razorpay API Endpoints
router.post('/razorpay/create-order', requireAuth, initiatePaymentDirect);
router.post('/razorpay/verify', requireAuth, verifyPaymentDirect);
router.post('/razorpay/webhook', handleWebhook);

// Backward-compatible generic routes
router.post('/create-order', requireAuth, initiatePaymentDirect);
router.post('/initiate', requireAuth, initiatePaymentDirect);
router.post('/verify', requireAuth, verifyPaymentDirect);
router.post('/webhook', handleWebhook);

export default router;
