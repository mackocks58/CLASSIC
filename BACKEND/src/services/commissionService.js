import { db } from '../config/db.js';

const COMMISSION_RATES = [0.10, 0.03, 0.01, 0.01, 0.01];

export async function distributeCommission(userId, amount) {
  let currentId = userId;
  for (let i = 0; i < 5; i++) {
    const userSnap = await db.ref(`users/${currentId}`).once('value');
    const user = userSnap.val();
    if (!user?.referrer) break;

    const referrerId = user.referrer;
    const commission = amount * COMMISSION_RATES[i];
    const refSnap = await db.ref(`users/${referrerId}`).once('value');
    const refUser = refSnap.val() || {};
    const refBalance = parseFloat(refUser.balance || 0) + commission;
    const refCommissions = refUser.commissions || {};
    const levelKey = `level${i + 1}`;
    const prevLevel = parseFloat(refCommissions[levelKey] || 0);

    await db.ref(`users/${referrerId}`).update({
      balance: refBalance,
      [`commissions/${levelKey}`]: prevLevel + commission
    });
    await db.ref(`commissionHistory/${referrerId}`).push({
      amount: commission,
      fromUserId: currentId,
      level: i + 1,
      timestamp: Date.now()
    });
    currentId = referrerId;
  }
}
