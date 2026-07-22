import { Router } from 'express';
import { getDashboardAnalytics, listAllUsers, toggleUserRole } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply admin protection globally
router.use(requireAuth, requireAdmin);

router.get('/analytics', getDashboardAnalytics);
router.get('/users', listAllUsers);
router.put('/users/:id/role', toggleUserRole);

export default router;
