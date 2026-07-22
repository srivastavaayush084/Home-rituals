import { Router } from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth protection globally
router.use(requireAuth);

router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);

export default router;
