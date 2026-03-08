import { Router } from 'express';
import { db } from '../config/db.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(verifyToken);

router.get('/messages', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const snap = await db.ref(`supportChats/${req.user.uid}/messages`).orderByChild('timestamp').once('value');
    const list = [];
    
    if (snap.exists()) {
      snap.forEach(c => {
        const msg = c.val();
        list.push({ id: c.key, ...msg });
      });
    }
    
    // Sort by timestamp ascending (oldest first)
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    res.json(list);
  } catch (e) {
    console.error('Error fetching support messages:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

    const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
    const userPhone = userSnap.val()?.phone || req.user.email || 'User';

    const ref = db.ref(`supportChats/${req.user.uid}/messages`).push();
    await ref.set({
      text: text.trim(),
      senderType: 'user',
      senderId: req.user.uid,
      senderName: userPhone,
      timestamp: Date.now(),
      read: false
    });
    await db.ref(`supportChats/${req.user.uid}`).update({
      lastMessage: text.trim(),
      lastMessageTime: Date.now(),
      userPhone,
      updatedAt: Date.now()
    });
    res.status(201).json({ id: ref.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
