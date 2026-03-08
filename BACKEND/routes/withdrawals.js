import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 30 || amt > 20000) {
      return res.status(400).json({ error: 'Invalid amount (30-20,000 BWP)' });
    }

    const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
    const user = userSnap.val();
    if (!user?.withdrawalAccount) return res.status(400).json({ error: 'Set withdrawal account first' });
    const balance = parseFloat(user.balance || 0);
    if (amt > balance) return res.status(400).json({ error: 'Insufficient balance' });

    const pendSnap = await db.ref('withdrawals').orderByChild('userId').equalTo(req.user.uid).once('value');
    if (pendSnap.exists()) {
      let hasPending = false;
      pendSnap.forEach(c => { if (c.val().status === 'pending') hasPending = true; });
      if (hasPending) return res.status(400).json({ error: 'You have a pending withdrawal' });
    }

    await db.ref(`users/${req.user.uid}/balance`).set(balance - amt);
    const ref = db.ref('withdrawals').push();
    const taxRate = 0.13;
    const afterTax = amt * (1 - taxRate);
    await ref.set({
      userId: req.user.uid,
      amount: amt,
      afterTax,
      phoneNumber: user.withdrawalAccount.phoneNumber,
      network: user.withdrawalAccount.network,
      status: 'pending',
      timestamp: Date.now()
    });
    await db.ref('transactions').push({
      userId: req.user.uid,
      type: 'withdrawal',
      amount: amt,
      status: 'pending',
      timestamp: Date.now()
    });
    res.status(201).json({ id: ref.key, status: 'pending', afterTax });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const snap = await db.ref('withdrawals').orderByChild('userId').equalTo(req.user.uid).once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
