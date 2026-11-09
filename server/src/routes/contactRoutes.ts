import { Router } from 'express';
import { submitContactMessage, listContactMessages, updateContactMessageStatus, deleteContactMessage } from '../controllers/contactNewsletterController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { contactSchemas } from '../validations/schemas';
import { contactLimiter } from '../middleware/rateLimiter';
import { verifyTurnstile } from '../middleware/turnstile';

const router = Router();

router.post('/', contactLimiter, verifyTurnstile, validateRequest(contactSchemas.create), submitContactMessage);
router.get('/', requireAdmin, listContactMessages);
router.put('/:id', requireAdmin, updateContactMessageStatus);
router.delete('/:id', requireAdmin, deleteContactMessage);

export default router;
