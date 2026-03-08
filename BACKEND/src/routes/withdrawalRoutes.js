import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { createWithdrawal, listWithdrawals } from '../controllers/withdrawalController.js';

const router = Router();
router.use(verifyToken);

router.post('/', createWithdrawal);
router.get('/', listWithdrawals);

export default router;
