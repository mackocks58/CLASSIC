import { db } from '../config/db.js';

export async function getUserById(uid) {
  const snap = await db.ref(`users/${uid}`).once('value');
  return snap.exists() ? { id: uid, ...snap.val() } : null;
}

export async function updateUser(uid, data) {
  await db.ref(`users/${uid}`).update(data);
  return getUserById(uid);
}

export async function setWithdrawalAccount(uid, account) {
  await db.ref(`users/${uid}/withdrawalAccount`).set({
    ...account,
    updatedAt: Date.now()
  });
}

export async function findUserByReferralCode(code) {
  const snap = await db.ref('users').orderByChild('referralCode').equalTo(code).once('value');
  if (!snap.exists()) return null;
  const key = Object.keys(snap.val())[0];
  return { uid: key, ...snap.val()[key] };
}

export async function getAllUsers() {
  const snap = await db.ref('users').once('value');
  const list = [];
  if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
  return list;
}
