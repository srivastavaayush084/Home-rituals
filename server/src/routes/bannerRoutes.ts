import { Router } from 'express';
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Public route to get active banners for storefront
router.get('/', getActiveBanners);

// Admin protected routes
router.get('/all', requireAuth, requireAdmin, getAllBanners);
router.post('/', requireAuth, requireAdmin, createBanner);
router.put('/:id', requireAuth, requireAdmin, updateBanner);
router.delete('/:id', requireAuth, requireAdmin, deleteBanner);

export default router;
