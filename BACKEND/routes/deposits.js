import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.post('/', async (req, res) => {
  try {
    const { amount, reference, network, accountName } = req.body;
    if (!amount || amount < 150) return res.status(400).json({ error: 'Invalid amount (min 150 BWP)' });
    const ref = db.ref('deposits').push();
    await ref.set({
      userId: req.user.uid,
      amount: parseFloat(amount),
      reference: reference || `DEPOSIT_${Date.now()}`,
      network: network || '',
      accountName: accountName || '',
      status: 'pending',
      timestamp: Date.now()
    });
    res.status(201).json({ id: ref.key, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/crypto', async (req, res) => {
  try {
    const { amount, txHash, network } = req.body;
    if (!amount || amount < 150) return res.status(400).json({ error: 'Invalid amount (min 150 BWP)' });
    const ref = db.ref('crypto_payments').push();
    await ref.set({
      userId: req.user.uid,
      amount: parseFloat(amount),
      txHash: txHash || '',
      network: network || 'BEP20',
      status: 'pending',
      timestamp: Date.now()
    });
    res.status(201).json({ id: ref.key, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const snap = await db.ref('deposits').orderByChild('userId').equalTo(req.user.uid).once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const snap = await db.ref('deposits').orderByChild('userId').equalTo(req.user.uid).once('value');
    const list = [];
    if (snap.exists()) {
      snap.forEach(c => {
        const v = c.val();
        if (v.status === 'pending') list.push({ id: c.key, ...v });
      });
    }
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
