import { Router } from 'express';
import { submitContactMessage, listContactMessages, updateContactMessageStatus, deleteContactMessage } from '../controllers/contactNewsletterController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { contactSchemas } from '../validations/schemas';
import { contactLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', contactLimiter, validateRequest(contactSchemas.create), submitContactMessage);
router.get('/', requireAdmin, listContactMessages);
router.put('/:id', requireAdmin, updateContactMessageStatus);
router.delete('/:id', requireAdmin, deleteContactMessage);

export default router;
