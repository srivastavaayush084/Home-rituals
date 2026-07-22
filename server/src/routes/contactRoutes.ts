import { Router } from 'express';
import { submitContactMessage, listContactMessages, updateContactMessageStatus, deleteContactMessage } from '../controllers/contactNewsletterController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { contactSchemas } from '../validations/schemas';

const router = Router();

router.post('/', validateRequest(contactSchemas.create), submitContactMessage);
router.get('/', requireAdmin, listContactMessages);
router.put('/:id', requireAdmin, updateContactMessageStatus);
router.delete('/:id', requireAdmin, deleteContactMessage);

export default router;
