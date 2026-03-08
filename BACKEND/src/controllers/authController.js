import { auth } from '../config/firebase.js';
import { db } from '../config/db.js';
import { processReferralLevels, generateCode } from '../services/referralService.js';

export async function register(req, res) {
  try {
    const { email, password, phone, referralCode } = req.body;
    if (!email || !password || !phone) {
      return res.status(400).json({ error: 'Missing email, password or phone' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: phone });
    const uid = userRecord.uid;
    const newRefCode = referralService.generateCode();
    let referrerId = null;

    if (referralCode) {
      const ref = await db.ref('users').orderByChild('referralCode').equalTo(referralCode).once('value');
      if (ref.exists()) referrerId = Object.keys(ref.val())[0];
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
}
