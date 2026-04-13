import express from 'express';
import { 
    lookupMember, 
    checkoutTransaction, 
    getTransactions, 
    getTransactionReceipt 
} from '../controllers/pos.controller.js';

const router = express.Router();

router.get('/member/lookup', lookupMember);
router.post('/checkout', checkoutTransaction);
router.get('/history', getTransactions);
router.get('/receipt/:id', getTransactionReceipt);

export default router;
