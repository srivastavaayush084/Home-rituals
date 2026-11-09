import { Router } from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { wishlistSchemas } from '../validations/schemas';

const router = Router();

// Apply auth protection globally
router.use(requireAuth);

router.get('/', getWishlist);
router.post('/toggle', validateRequest(wishlistSchemas.toggle), toggleWishlist);

export default router;
