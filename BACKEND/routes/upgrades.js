import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

const LEVEL_PRICES = { level1: 150, level2: 300, level3: 450, level4: 600, level5: 1000, level6: 1500, level7: 2000, level8: 5000, level9: 10000, level10: 20000 };

router.get('/history', async (req, res) => {
  try {
    const snap = await db.ref(`upgradeHistory/${req.user.uid}`).once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/unlock', async (req, res) => {
  try {
    const { levelId } = req.body;
    if (!levelId || !LEVEL_PRICES[levelId]) return res.status(400).json({ error: 'Invalid level' });
    const price = LEVEL_PRICES[levelId];
    const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
    const user = userSnap.val() || {};
    const balance = parseFloat(user.balance || 0);
    if (balance < price) return res.status(400).json({ error: 'Insufficient balance' });
    if (user.levels?.[levelId]) return res.status(400).json({ error: 'Level already unlocked' });

    await db.ref(`users/${req.user.uid}`).update({
      balance: balance - price,
      [`levels/${levelId}`]: { unlockedAt: Date.now(), price }
    });
    await db.ref(`upgradeHistory/${req.user.uid}`).push({
      levelId,
      amount: price,
      timestamp: Date.now()
    });
    await db.ref('transactions').push({
      userId: req.user.uid,
      type: 'upgrade',
      amount: price,
      levelId,
      timestamp: Date.now()
    });
    res.json({ ok: true, newBalance: balance - price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/payment-methods', async (req, res) => {
  try {
    const snap = await db.ref('paymentMethods').once('value');
    res.json(snap.val() || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
