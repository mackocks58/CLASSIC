import { Router } from 'express';
import { auth } from '../config/firebase.js';
import { db } from '../config/firebase.js';

const router = Router();

function generateReferralCode() {
  const chars = 'ABCDEFGHKJLMNPQRST0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'NEW' + result;
}

async function processReferralLevels(referrerId, newUserId) {
  const levelKeys = ['level1', 'level2', 'level3', 'level4', 'level5'];
  let currentId = referrerId;
  for (let i = 0; i < 5; i++) {
    if (!currentId) break;
    await db.ref(`users/${currentId}/${levelKeys[i]}`).push(newUserId);
    const snap = await db.ref(`users/${currentId}`).once('value');
    currentId = snap.val()?.referrer || null;
  }
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, phone, referralCode } = req.body;
    if (!email || !password || !phone) {
      return res.status(400).json({ error: 'Missing email, password or phone' });
    }
    const userRecord = await auth.createUser({ email, password, displayName: phone });
    const uid = userRecord.uid;
    const newRefCode = generateReferralCode();
    let referrerId = null;

    if (referralCode) {
      const refSnap = await db.ref('users').orderByChild('referralCode').equalTo(referralCode).once('value');
      if (refSnap.exists()) referrerId = Object.keys(refSnap.val())[0];
    }

    const userData = {
      phone,
      phoneDigits: (phone.match(/\d/g) || []).join('').slice(-8),
      level1: [], level2: [], level3: [], level4: [], level5: [],
      balance: 0, profit: 0, deposited: 0, totalEarnings: 0,
      signupDate: new Date().toISOString(),
      referralCode: newRefCode,
      referrer: referrerId,
      referrerCode: referralCode || null
    };

    await db.ref(`users/${uid}`).set(userData);
    if (referrerId) await processReferralLevels(referrerId, uid);

    res.status(201).json({ uid, email: userRecord.email });
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      return res.status(400).json({ error: 'Phone already registered' });
    }
    res.status(400).json({ error: e.message });
  }
});

export default router;
