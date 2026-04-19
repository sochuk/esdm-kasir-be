import { Router } from 'express';
import { getAllMembers, createMember, updateMember, deleteMember } from '../controllers/member.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllMembers);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
