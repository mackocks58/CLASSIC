import { db } from '../config/db.js';
import { distributeCommission } from './commissionService.js';
import * as depositModel from '../models/depositModel.js';
import * as userModel from '../models/userModel.js';

export async function approveDeposit(depositId, approvedBy) {
  const dep = await depositModel.getDepositOrCrypto(depositId);
  if (!dep || dep.status !== 'pending') return { success: false, error: 'Invalid or already processed' };

  const userId = dep.userId;
  const amount = parseFloat(dep.amount);

  const user = await userModel.getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  const balance = parseFloat(user.balance || 0);
  const deposited = parseFloat(user.deposited || 0);

  await depositModel.updateDepositStatus(depositId, 'approved', dep.type, { approvedBy });
  await userModel.updateUser(userId, {
    balance: balance + amount,
    deposited: deposited + amount
  });

  await db.ref('transactions').push({
    userId,
    type: 'deposit',
    amount,
    depositId,
    timestamp: Date.now()
  });

  await distributeCommission(userId, amount);

  return { success: true };
}

export async function rejectDeposit(depositId) {
  const dep = await depositModel.getDepositOrCrypto(depositId);
  if (!dep) return { success: false, error: 'Not found' };
  if (dep.status !== 'pending') return { success: false, error: 'Already processed' };

  await depositModel.updateDepositStatus(depositId, 'rejected', dep.type);
  return { success: true };
}
