import { db } from '../config/db.js';

export async function createDeposit(data) {
  const ref = db.ref('deposits').push();
  await ref.set({
    ...data,
    status: 'pending',
    timestamp: Date.now()
  });
  return ref.key;
}

export async function createCryptoDeposit(data) {
  const ref = db.ref('crypto_payments').push();
  await ref.set({
    ...data,
    status: 'pending',
    timestamp: Date.now()
  });
  return ref.key;
}

export async function getDepositsByUserId(userId) {
  const snap = await db.ref('deposits').orderByChild('userId').equalTo(userId).once('value');
  const list = [];
  if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
  return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function getDepositById(id, type = 'mobile') {
  const path = type === 'mobile' ? 'deposits' : 'crypto_payments';
  const snap = await db.ref(path).child(id).once('value');
  return snap.exists() ? { id, ...snap.val() } : null;
}

export async function getDepositOrCrypto(id) {
  const dep = await getDepositById(id, 'mobile');
  if (dep) return { ...dep, type: 'mobile' };
  const crypt = await getDepositById(id, 'crypto');
  if (crypt) return { ...crypt, type: 'crypto' };
  return null;
}

export async function updateDepositStatus(id, status, type = 'mobile', extra = {}) {
  const path = type === 'mobile' ? 'deposits' : 'crypto_payments';
  await db.ref(path).child(id).update({ ...extra, status, [status === 'approved' ? 'approvedAt' : 'rejectedAt']: Date.now() });
}

export async function getAllDeposits() {
  const [depSnap, cryptSnap] = await Promise.all([
    db.ref('deposits').orderByChild('timestamp').once('value'),
    db.ref('crypto_payments').orderByChild('timestamp').once('value')
  ]);
  const list = [];
  if (depSnap.exists()) depSnap.forEach(c => list.push({ id: c.key, type: 'mobile', ...c.val() }));
  if (cryptSnap.exists()) cryptSnap.forEach(c => list.push({ id: c.key, type: 'crypto', ...c.val() }));
  return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}
