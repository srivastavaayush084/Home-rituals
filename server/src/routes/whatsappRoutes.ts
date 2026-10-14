import { Router } from 'express';
import { verifyWebhook, handleIncomingWebhook } from '../controllers/whatsappWebhookController';
import { sendWhatsAppMainMenu, sendWhatsAppMessage } from '../services/whatsappService';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Meta Webhook Endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncomingWebhook);

// Admin Test Route to test sending messages
router.post('/test-send', requireAuth, requireAdmin, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const result = message
    ? await sendWhatsAppMessage({ to: phone, type: 'text', text: { body: message } })
    : await sendWhatsAppMainMenu(phone);

  return res.status(result.success ? 200 : 500).json(result);
});

export default router;
