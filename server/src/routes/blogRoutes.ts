import { Router } from 'express';
import { listBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog } from '../controllers/blogController';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { blogSchemas } from '../validations/schemas';

const router = Router();

router.get('/', listBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/', requireAdmin, validateRequest(blogSchemas.create), createBlog);
router.put('/:id', requireAdmin, validateRequest(blogSchemas.update), updateBlog);
router.delete('/:id', requireAdmin, deleteBlog);

export default router;
