import { Router } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const VIDEO_EARNINGS = { level1: 2.4, level2: 5, level3: 7.4, level4: 10, level5: 20, level6: 30, level7: 50, level8: 125, level9: 400, level10: 800 };
const VIDEOS_PER_DAY = 10;

router.get('/videos', verifyToken, async (req, res) => {
  try {
    const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
    const user = userSnap.val() || {};
    const levels = user.levels || {};
    const levelOrder = ['level10','level9','level8','level7','level6','level5','level4','level3','level2','level1'];
    let currentLevel = null;
    for (const id of levelOrder) if (levels[id]) { currentLevel = id; break; }
    const perVideo = currentLevel ? (VIDEO_EARNINGS[currentLevel] || 0) : 0;
    const watched = user.watchedVideos || {};
    const today = new Date().toDateString();
    const watchedToday = Object.values(watched).filter(d => d === today).length;

    const videos = [];
    for (let i = 1; i <= VIDEOS_PER_DAY; i++) {
      const vid = `video_${i}`;
      videos.push({
        id: vid,
        title: `Daily Task • Video ${i}`,
        earning: perVideo,
        watched: watched[vid] === today,
        available: watchedToday < VIDEOS_PER_DAY && !!currentLevel
      });
    }
    res.json({ videos, currentLevel, watchedToday, videosPerDay: VIDEOS_PER_DAY });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/videos/:videoId/watch', verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
    const user = userSnap.val() || {};
    const levels = user.levels || {};
    const levelOrder = ['level10','level9','level8','level7','level6','level5','level4','level3','level2','level1'];
    let currentLevel = null;
    for (const id of levelOrder) if (levels[id]) { currentLevel = id; break; }
    if (!currentLevel) return res.status(400).json({ error: 'Upgrade to a level first' });

    const watched = user.watchedVideos || {};
    const today = new Date().toDateString();
    if (watched[videoId] === today) return res.status(400).json({ error: 'Already watched today' });
    const watchedToday = Object.values(watched).filter(d => d === today).length;
    if (watchedToday >= VIDEOS_PER_DAY) return res.status(400).json({ error: 'Daily limit reached' });

    const earning = VIDEO_EARNINGS[currentLevel] || 0;
    const balance = parseFloat(user.balance || 0) + earning;

    await db.ref(`users/${req.user.uid}`).update({
      balance,
      [`watchedVideos/${videoId}`]: today,
      lastWatchedDate: today
    });
    await db.ref('transactions').push({
      userId: req.user.uid,
      type: 'video_earning',
      amount: earning,
      videoId,
      timestamp: Date.now()
    });
    res.json({ ok: true, earning, newBalance: balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
