import { Router } from 'express';
import {
  createOrder,
  listUserOrders,
  getOrderById,
  downloadOrderInvoice,
  listAllOrders,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController';
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
router.get('/:id/invoice', downloadOrderInvoice);
router.put('/:id/status', requireAdmin, validateRequest(orderSchemas.updateStatus), updateOrderStatus);
router.post('/:id/cancel', validateRequest(orderSchemas.cancel), cancelOrder);

export default router;
