import express from 'express';
import { login, getMe, updateProfile, changePassword } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/update-profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

export default router;
