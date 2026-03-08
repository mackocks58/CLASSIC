import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/me', async (req, res) => {
  try {
    const snap = await db.ref(`users/${req.user.uid}`).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'User not found' });
    res.json({ ...snap.val(), id: req.user.uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/me', async (req, res) => {
  try {
    const allowed = ['phone', 'phoneDigits'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
    await db.ref(`users/${req.user.uid}`).update(updates);
    const snap = await db.ref(`users/${req.user.uid}`).once('value');
    res.json(snap.val());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/me/withdrawal-account', async (req, res) => {
  try {
    const { phoneNumber, network, accountName } = req.body;
    if (!phoneNumber || !network) return res.status(400).json({ error: 'Missing phoneNumber or network' });
    await db.ref(`users/${req.user.uid}/withdrawalAccount`).set({
      phoneNumber,
      network,
      accountName: accountName || '',
      updatedAt: Date.now()
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/by-referral/:code', async (req, res) => {
  try {
    const snap = await db.ref('users').orderByChild('referralCode').equalTo(req.params.code).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'Referral code not found' });
    const key = Object.keys(snap.val())[0];
    res.json({ uid: key, ...snap.val()[key] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
