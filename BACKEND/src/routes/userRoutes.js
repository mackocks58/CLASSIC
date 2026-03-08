import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getMe, updateMe, setWithdrawalAccount, getByReferralCode } from '../controllers/userController.js';

const router = Router();
router.use(verifyToken);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.put('/me/withdrawal-account', setWithdrawalAccount);
router.get('/by-referral/:code', getByReferralCode);

export default router;
