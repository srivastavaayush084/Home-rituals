import { Router } from 'express';
import {
  initiatePaymentDirect,
  verifyPaymentDirect,
  handleWebhook,
  reconcilePaymentController,
} from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Official Razorpay API Endpoints
router.post('/razorpay/create-order', requireAuth, initiatePaymentDirect);
router.post('/razorpay/verify', requireAuth, verifyPaymentDirect);
router.post('/razorpay/webhook', handleWebhook);
router.post('/razorpay/reconcile', requireAuth, reconcilePaymentController);

// Backward-compatible generic routes
router.post('/create-order', requireAuth, initiatePaymentDirect);
router.post('/initiate', requireAuth, initiatePaymentDirect);
router.post('/verify', requireAuth, verifyPaymentDirect);
router.post('/reconcile', requireAuth, reconcilePaymentController);
router.post('/webhook', handleWebhook);

export default router;
