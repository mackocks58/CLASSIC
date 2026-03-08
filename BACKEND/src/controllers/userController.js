import * as userModel from '../models/userModel.js';

export async function getMe(req, res) {
  try {
    const user = await userModel.getUserById(req.user.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateMe(req, res) {
  try {
    const allowed = ['phone', 'phoneDigits'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
    const user = await userModel.updateUser(req.user.uid, updates);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function setWithdrawalAccount(req, res) {
  try {
    const { phoneNumber, network, accountName } = req.body;
    if (!phoneNumber || !network) return res.status(400).json({ error: 'Missing phoneNumber or network' });
    await userModel.setWithdrawalAccount(req.user.uid, {
      phoneNumber,
      network,
      accountName: accountName || ''
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getByReferralCode(req, res) {
  try {
    const user = await userModel.findUserByReferralCode(req.params.code);
    if (!user) return res.status(404).json({ error: 'Referral code not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
