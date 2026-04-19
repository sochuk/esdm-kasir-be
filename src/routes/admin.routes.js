import { Router } from 'express';
import { getAllAdmins, createAdmin, updateAdmin, deleteAdmin } from '../controllers/admin.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Semua admin routes butuh auth
router.use(authenticateToken);

router.get('/', getAllAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
