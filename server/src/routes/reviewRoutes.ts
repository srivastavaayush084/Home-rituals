import { Router } from 'express';
import { listReviewsForProduct, listAllReviews, createReview, approveReview, deleteReview } from '../controllers/reviewController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { reviewSchemas } from '../validations/schemas';

const router = Router();

// Public route to view reviews
router.get('/product/:productId', listReviewsForProduct);

// User-protected route to add reviews
router.post('/product/:productId', requireAuth, validateRequest(reviewSchemas.create), createReview);

// User/Admin route to delete reviews
router.delete('/:id', requireAuth, deleteReview);

// Admin-protected review dashboard routes
router.get('/all', requireAuth, requireAdmin, listAllReviews);
router.put('/:id/approve', requireAuth, requireAdmin, approveReview);

export default router;
