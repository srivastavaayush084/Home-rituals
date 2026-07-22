import { Router } from 'express';
import { subscribeNewsletter, listNewsletterSubscribers, updateNewsletterSubscriberStatus, deleteNewsletterSubscriber } from '../controllers/contactNewsletterController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { newsletterSchemas } from '../validations/schemas';

const router = Router();

router.post('/', validateRequest(newsletterSchemas.subscribe), subscribeNewsletter);
router.get('/', requireAdmin, listNewsletterSubscribers);
router.put('/:id/status', requireAdmin, updateNewsletterSubscriberStatus);
router.delete('/:id', requireAdmin, deleteNewsletterSubscriber);

export default router;
