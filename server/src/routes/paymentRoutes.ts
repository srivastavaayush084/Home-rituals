import { Router } from 'express';
import { verifyPayment, handleWebhook } from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Endpoint for the client to confirm their payment immediately
router.post('/verify', requireAuth, verifyPayment);

// Webhook endpoint (public for Razorpay server callbacks)
router.post('/webhook', handleWebhook);

export default router;
