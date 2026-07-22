import { Router } from 'express';
import { createOrder, listUserOrders, getOrderById, listAllOrders, updateOrderStatus, cancelOrder } from '../controllers/orderController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { orderSchemas } from '../validations/schemas';

const router = Router();

// Apply auth protection globally
router.use(requireAuth);

router.post('/', validateRequest(orderSchemas.create), createOrder);
router.get('/', listUserOrders);
router.get('/all', requireAdmin, listAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', requireAdmin, validateRequest(orderSchemas.updateStatus), updateOrderStatus);
router.post('/:id/cancel', cancelOrder);

export default router;
