import { Router } from 'express';
import { getProductProfit, getProductList } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/profit', getProductProfit);
router.get('/products', getProductList);

export default router;
