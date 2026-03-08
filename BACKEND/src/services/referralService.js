import { db } from '../config/db.js';
import { generateReferralCode } from '../utils/helpers.js';

export async function processReferralLevels(referrerId, newUserId) {
  const levelKeys = ['level1', 'level2', 'level3', 'level4', 'level5'];
  let currentId = referrerId;
  for (let i = 0; i < 5; i++) {
    if (!currentId) break;
    await db.ref(`users/${currentId}/${levelKeys[i]}`).push(newUserId);
    const snap = await db.ref(`users/${currentId}`).once('value');
    currentId = snap.val()?.referrer || null;
  }
}

export function generateCode() {
  return generateReferralCode();
}
