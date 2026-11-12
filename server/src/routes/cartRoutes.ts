import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, mergeCart } from '../controllers/cartController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { cartSchemas } from '../validations/schemas';

const router = Router();

// Apply auth protection globally to all cart actions
router.use(requireAuth);

router.get('/', getCart);
router.post('/', validateRequest(cartSchemas.add), addToCart);
router.post('/merge', mergeCart);
router.put('/:productId', validateRequest(cartSchemas.update), updateCartItem);
router.delete('/:productId', removeFromCart);
router.delete('/', clearCart);

export default router;
