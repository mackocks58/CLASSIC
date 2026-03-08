import { Router } from 'express';
import { db } from '../config/db.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const snap = await db.ref(`userNotifications/${req.user.uid}`).once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const readSnap = await db.ref(`userReadAnnouncements/${req.user.uid}`).once('value');
    const read = readSnap.val() || {};
    const annSnap = await db.ref('announcements').once('value');
    const list = [];
    if (annSnap.exists()) {
      annSnap.forEach(c => list.push({ id: c.key, ...c.val(), read: !!read[c.key] }));
    }
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const { type } = req.query;
    const id = req.params.id;
    if (type === 'announcement') {
      await db.ref(`userReadAnnouncements/${req.user.uid}/${id}`).set({ read: true, timestamp: Date.now() });
    } else {
      await db.ref(`userNotifications/${req.user.uid}/${id}/read`).set(true);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
