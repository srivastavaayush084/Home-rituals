import { Router } from 'express';
import { listCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { categorySchemas } from '../validations/schemas';

const router = Router();

router.get('/', listCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', requireAdmin, validateRequest(categorySchemas.create), createCategory);
router.put('/:id', requireAdmin, validateRequest(categorySchemas.update), updateCategory);
router.delete('/:id', requireAdmin, deleteCategory);

export default router;
