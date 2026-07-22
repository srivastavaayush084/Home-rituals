import { Router } from 'express';
import { listProducts, getProductBySlugOrId, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { productSchemas } from '../validations/schemas';

const router = Router();

router.get('/', listProducts);
router.get('/:identifier', getProductBySlugOrId);
router.post('/', requireAdmin, validateRequest(productSchemas.create), createProduct);
router.put('/:id', requireAdmin, validateRequest(productSchemas.update), updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);

export default router;
