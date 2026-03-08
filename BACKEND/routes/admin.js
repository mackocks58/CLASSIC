import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);
router.use(verifyAdmin);

// Users
router.get('/users', async (req, res) => {
  try {
    const snap = await db.ref('users').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const allowed = ['balance', 'profit', 'deposited', 'totalEarnings'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
    await db.ref(`users/${req.params.id}`).update(updates);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deposits
router.get('/deposits', async (req, res) => {
  try {
    const [depSnap, cryptSnap] = await Promise.all([
      db.ref('deposits').orderByChild('timestamp').once('value'),
      db.ref('crypto_payments').orderByChild('timestamp').once('value')
    ]);
    const list = [];
    if (depSnap.exists()) depSnap.forEach(c => list.push({ id: c.key, type: 'mobile', ...c.val() }));
    if (cryptSnap.exists()) cryptSnap.forEach(c => list.push({ id: c.key, type: 'crypto', ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const COMMISSION_RATES = [0.10, 0.03, 0.01, 0.01, 0.01];

async function distributeCommission(db, userId, amount) {
  let currentId = userId;
  for (let i = 0; i < 5; i++) {
    const userSnap = await db.ref(`users/${currentId}`).once('value');
    const user = userSnap.val();
    if (!user?.referrer) break;
    const referrerId = user.referrer;
    const commission = amount * COMMISSION_RATES[i];
    const refSnap = await db.ref(`users/${referrerId}`).once('value');
    const refUser = refSnap.val() || {};
    const refBalance = parseFloat(refUser.balance || 0) + commission;
    const refCommissions = refUser.commissions || {};
    const levelKey = `level${i + 1}`;
    const prevLevel = parseFloat(refCommissions[levelKey] || 0);

    await db.ref(`users/${referrerId}`).update({
      balance: refBalance,
      [`commissions/${levelKey}`]: prevLevel + commission
    });
    await db.ref(`commissionHistory/${referrerId}`).push({
      amount: commission,
      fromUserId: currentId,
      level: i + 1,
      timestamp: Date.now()
    });
    currentId = referrerId;
  }
}

router.post('/deposits/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const depSnap = await db.ref('deposits').child(id).once('value');
    const cryptSnap = await db.ref('crypto_payments').child(id).once('value');
    const dep = depSnap.exists() ? depSnap.val() : (cryptSnap.exists() ? cryptSnap.val() : null);
    const ref = depSnap.exists() ? db.ref('deposits') : db.ref('crypto_payments');

    if (!dep || dep.status !== 'pending') return res.status(400).json({ error: 'Invalid or already processed' });
    const userId = dep.userId;
    const amount = parseFloat(dep.amount);

    const userSnap = await db.ref(`users/${userId}`).once('value');
    const user = userSnap.val() || {};
    const balance = parseFloat(user.balance || 0);
    const deposited = parseFloat(user.deposited || 0);

    await ref.child(id).update({ status: 'approved', approvedAt: Date.now(), approvedBy: req.user.uid });
    await db.ref(`users/${userId}`).update({
      balance: balance + amount,
      deposited: deposited + amount
    });
    await db.ref('transactions').push({
      userId,
      type: 'deposit',
      amount,
      depositId: id,
      timestamp: Date.now()
    });
    await distributeCommission(db, userId, amount);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const depSnap = await db.ref('deposits').child(id).once('value');
    const cryptSnap = await db.ref('crypto_payments').child(id).once('value');
    const exists = depSnap.exists() || cryptSnap.exists();
    const ref = depSnap.exists() ? db.ref('deposits') : db.ref('crypto_payments');
    if (!exists) return res.status(404).json({ error: 'Not found' });
    const dep = depSnap.val() || cryptSnap.val();
    if (dep.status !== 'pending') return res.status(400).json({ error: 'Already processed' });
    await ref.child(id).update({ status: 'rejected', rejectedAt: Date.now() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const snap = await db.ref('withdrawals').orderByChild('timestamp').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/withdrawals/:id/approve', async (req, res) => {
  try {
    const snap = await db.ref('withdrawals').child(req.params.id).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'Not found' });
    const w = snap.val();
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });
    await db.ref('withdrawals').child(req.params.id).update({ status: 'approved', approvedAt: Date.now(), approvedBy: req.user.uid });
    await db.ref(`transactions`).orderByChild('userId').equalTo(w.userId).once('value').then(s => {
      s.forEach(c => {
        const v = c.val();
        if (v.type === 'withdrawal' && v.status === 'pending') {
          db.ref(`transactions/${c.key}`).update({ status: 'approved' });
        }
      });
    });
    await db.ref(`userNotifications/${w.userId}`).push({
      title: 'Withdrawal Approved',
      message: `Your withdrawal of ${w.amount} BWP has been approved.`,
      action: 'approve',
      timestamp: Date.now(),
      read: false
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/withdrawals/:id/reject', async (req, res) => {
  try {
    const snap = await db.ref('withdrawals').child(req.params.id).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'Not found' });
    const w = snap.val();
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });
    const userSnap = await db.ref(`users/${w.userId}`).once('value');
    const balance = parseFloat(userSnap.val()?.balance || 0);
    await db.ref(`users/${w.userId}/balance`).set(balance + w.amount);
    await db.ref('withdrawals').child(req.params.id).update({ status: 'rejected', rejectedAt: Date.now() });
    await db.ref(`userNotifications/${w.userId}`).push({
      title: 'Withdrawal Rejected',
      message: `Your withdrawal of ${w.amount} BWP was rejected.`,
      action: 'reject',
      timestamp: Date.now(),
      read: false
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Support
router.get('/support/chats', async (req, res) => {
  try {
    const snap = await db.ref('supportChats').orderByChild('updatedAt').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ userId: c.key, ...c.val() }));
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/support/chats/:userId/messages', async (req, res) => {
  try {
    const snap = await db.ref(`supportChats/${req.params.userId}/messages`).orderByChild('timestamp').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/support/reply', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text?.trim()) return res.status(400).json({ error: 'userId and text required' });
    const ref = db.ref(`supportChats/${userId}/messages`).push();
    await ref.set({
      text: text.trim(),
      senderType: 'admin',
      senderId: req.user.uid,
      senderName: req.user.email || 'Support',
      timestamp: Date.now(),
      read: false
    });
    await db.ref(`supportChats/${userId}`).update({
      lastMessage: text.trim(),
      lastMessageTime: Date.now(),
      updatedAt: Date.now()
    });
    res.status(201).json({ id: ref.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const snap = await db.ref('paymentMethods').once('value');
    res.json(snap.val() || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/payment-methods', async (req, res) => {
  try {
    await db.ref('paymentMethods').set(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Announcements
router.post('/announcements', async (req, res) => {
  try {
    const { title, message, target } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const ref = db.ref('announcements').push();
    await ref.set({
      title,
      message,
      target: target || { type: 'all' },
      timestamp: Date.now(),
      sentBy: req.user.uid
    });
    res.status(201).json({ id: ref.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
