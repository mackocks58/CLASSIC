import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';
import {
  listUsers,
  updateUser,
  listDeposits,
  approveDeposit,
  rejectDeposit,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  listSupportChats,
  getSupportMessages,
  replySupport,
  getPaymentMethods,
  setPaymentMethods,
  createAnnouncement
} from '../controllers/adminController.js';

const router = Router();
router.use(verifyToken);
router.use(verifyAdmin);

router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/deposits', listDeposits);
router.post('/deposits/:id/approve', approveDeposit);
router.post('/deposits/:id/reject', rejectDeposit);
router.get('/withdrawals', listWithdrawals);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);
router.get('/support/chats', listSupportChats);
router.get('/support/chats/:userId/messages', getSupportMessages);
router.post('/support/reply', replySupport);
router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', setPaymentMethods);
router.post('/announcements', createAnnouncement);

export default router;
