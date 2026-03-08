import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createDeposit,
  createCryptoDeposit,
  listDeposits,
  listPendingDeposits
} from '../controllers/depositController.js';

const router = Router();
router.use(verifyToken);

router.post('/', createDeposit);
router.post('/crypto', createCryptoDeposit);
router.get('/', listDeposits);
router.get('/pending', listPendingDeposits);

export default router;
