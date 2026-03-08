import { db } from '../config/db.js';

export async function createWithdrawal(data) {
  const ref = db.ref('withdrawals').push();
  await ref.set({
    ...data,
    status: 'pending',
    timestamp: Date.now()
  });
  return ref.key;
}

export async function getWithdrawalsByUserId(userId) {
  const snap = await db.ref('withdrawals').orderByChild('userId').equalTo(userId).once('value');
  const list = [];
  if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
  return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function getWithdrawalById(id) {
  const snap = await db.ref('withdrawals').child(id).once('value');
  return snap.exists() ? { id, ...snap.val() } : null;
}

export async function hasPendingWithdrawal(userId) {
  const snap = await db.ref('withdrawals').orderByChild('userId').equalTo(userId).once('value');
  if (!snap.exists()) return false;
  let has = false;
  snap.forEach(c => { if (c.val().status === 'pending') has = true; });
  return has;
}

export async function updateWithdrawalStatus(id, status, extra = {}) {
  await db.ref('withdrawals').child(id).update({
    ...extra,
    status,
    [status === 'approved' ? 'approvedAt' : 'rejectedAt']: Date.now()
  });
}

export async function getAllWithdrawals() {
  const snap = await db.ref('withdrawals').orderByChild('timestamp').once('value');
  const list = [];
  if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
  return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}
