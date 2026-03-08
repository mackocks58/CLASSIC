import { db } from '../config/db.js';
import { VIDEO_EARNINGS, LEVEL_ORDER, VIDEOS_PER_DAY } from '../utils/helpers.js';
import * as userModel from '../models/userModel.js';

function getCurrentLevel(levels) {
  if (!levels) return null;
  for (const id of LEVEL_ORDER) if (levels[id]) return id;
  return null;
}

export async function getVideos(req, res) {
  try {
    const user = await userModel.getUserById(req.user.uid) || {};
    const levels = user.levels || {};
    const currentLevel = getCurrentLevel(levels);
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
}

export async function watchVideo(req, res) {
  try {
    const { videoId } = req.params;
    const user = await userModel.getUserById(req.user.uid) || {};
    const levels = user.levels || {};
    const currentLevel = getCurrentLevel(levels);
    if (!currentLevel) return res.status(400).json({ error: 'Upgrade to a level first' });

    const watched = user.watchedVideos || {};
    const today = new Date().toDateString();
    if (watched[videoId] === today) return res.status(400).json({ error: 'Already watched today' });
    const watchedToday = Object.values(watched).filter(d => d === today).length;
    if (watchedToday >= VIDEOS_PER_DAY) return res.status(400).json({ error: 'Daily limit reached' });

    const earning = VIDEO_EARNINGS[currentLevel] || 0;
    const balance = parseFloat(user.balance || 0) + earning;

    await userModel.updateUser(req.user.uid, {
      balance,
      lastWatchedDate: today
    });
    await db.ref(`users/${req.user.uid}/watchedVideos/${videoId}`).set(today);
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
}
