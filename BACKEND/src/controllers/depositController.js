import { validateDepositAmount } from '../utils/validators.js';
import * as depositModel from '../models/depositModel.js';

export async function createDeposit(req, res) {
  try {
    const { amount, reference, network, accountName } = req.body;
    const validation = validateDepositAmount(amount);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const id = await depositModel.createDeposit({
      userId: req.user.uid,
      amount: validation.value,
      reference: reference || `DEPOSIT_${Date.now()}`,
      network: network || '',
      accountName: accountName || ''
    });
    res.status(201).json({ id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createCryptoDeposit(req, res) {
  try {
    const { amount, txHash, network } = req.body;
    const validation = validateDepositAmount(amount);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const id = await depositModel.createCryptoDeposit({
      userId: req.user.uid,
      amount: validation.value,
      txHash: txHash || '',
      network: network || 'BEP20'
    });
    res.status(201).json({ id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listDeposits(req, res) {
  try {
    const list = await depositModel.getDepositsByUserId(req.user.uid);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listPendingDeposits(req, res) {
  try {
    const list = await depositModel.getDepositsByUserId(req.user.uid);
    const pending = list.filter(d => d.status === 'pending');
    res.json(pending);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
