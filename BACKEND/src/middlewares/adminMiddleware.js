import { db } from '../config/db.js';

export async function verifyAdmin(req, res, next) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  const adminSnap = await db.ref(`admins/${uid}`).once('value');
  const userSnap = await db.ref(`users/${uid}/role`).once('value');
  if (!adminSnap.exists() && userSnap.val() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
}
