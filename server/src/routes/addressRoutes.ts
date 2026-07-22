import { Router } from 'express';
import { listAddresses, createAddress, updateAddress, deleteAddress } from '../controllers/addressController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { addressSchemas } from '../validations/schemas';

const router = Router();

// Apply auth protection globally
router.use(requireAuth);

router.get('/', listAddresses);
router.post('/', validateRequest(addressSchemas.create), createAddress);
router.put('/:id', validateRequest(addressSchemas.update), updateAddress);
router.delete('/:id', deleteAddress);

export default router;
