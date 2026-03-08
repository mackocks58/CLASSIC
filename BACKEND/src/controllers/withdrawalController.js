import { db } from '../config/db.js';
import { validateWithdrawalAmount } from '../utils/validators.js';
import { TAX_RATE } from '../utils/helpers.js';
import * as withdrawalModel from '../models/withdrawalModel.js';
import * as userModel from '../models/userModel.js';

export async function createWithdrawal(req, res) {
  try {
    const { amount } = req.body;
    const user = await userModel.getUserById(req.user.uid);
    if (!user?.withdrawalAccount) return res.status(400).json({ error: 'Set withdrawal account first' });

    const balance = parseFloat(user.balance || 0);
    const validation = validateWithdrawalAmount(amount, balance);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const hasPending = await withdrawalModel.hasPendingWithdrawal(req.user.uid);
    if (hasPending) return res.status(400).json({ error: 'You have a pending withdrawal' });

    const amt = validation.value;
    const afterTax = amt * (1 - TAX_RATE);

    await userModel.updateUser(req.user.uid, { balance: balance - amt });
    const id = await withdrawalModel.createWithdrawal({
      userId: req.user.uid,
      amount: amt,
      afterTax,
      phoneNumber: user.withdrawalAccount.phoneNumber,
      network: user.withdrawalAccount.network
    });

    await db.ref('transactions').push({
      userId: req.user.uid,
      type: 'withdrawal',
      amount: amt,
      status: 'pending',
      timestamp: Date.now()
    });

    res.status(201).json({ id, status: 'pending', afterTax });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listWithdrawals(req, res) {
  try {
    const list = await withdrawalModel.getWithdrawalsByUserId(req.user.uid);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
