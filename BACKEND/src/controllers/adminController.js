import { db } from '../config/db.js';
import * as userModel from '../models/userModel.js';
import * as depositModel from '../models/depositModel.js';
import * as withdrawalModel from '../models/withdrawalModel.js';
import { approveDeposit as approveDepositService, rejectDeposit as rejectDepositService } from '../services/depositService.js';

// Users
export async function listUsers(req, res) {
  try {
    const list = await userModel.getAllUsers();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUser(req, res) {
  try {
    const allowed = ['balance', 'profit', 'deposited', 'totalEarnings'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
    await userModel.updateUser(req.params.id, updates);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Deposits
export async function listDeposits(req, res) {
  try {
    const list = await depositModel.getAllDeposits();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function approveDeposit(req, res) {
  try {
    const result = await approveDepositService(req.params.id, req.user.uid);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function rejectDeposit(req, res) {
  try {
    const result = await rejectDepositService(req.params.id);
    if (!result.success) return res.status(result.error === 'Not found' ? 404 : 400).json({ error: result.error });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Withdrawals
export async function listWithdrawals(req, res) {
  try {
    const list = await withdrawalModel.getAllWithdrawals();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function approveWithdrawal(req, res) {
  try {
    const w = await withdrawalModel.getWithdrawalById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await withdrawalModel.updateWithdrawalStatus(req.params.id, 'approved', { approvedBy: req.user.uid });
    const txSnap = await db.ref('transactions').orderByChild('userId').equalTo(w.userId).once('value');
    if (txSnap.exists()) {
      txSnap.forEach(c => {
        const v = c.val();
        if (v.type === 'withdrawal' && v.status === 'pending') {
          db.ref(`transactions/${c.key}`).update({ status: 'approved' });
        }
      });
    }
    await db.ref(`userNotifications/${w.userId}`).push({
      title: 'Withdrawal Approved',
      message: `Your withdrawal of ${w.amount} BWP has been approved.`,
      action: 'approve',
      timestamp: Date.now(),
      read: false
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function rejectWithdrawal(req, res) {
  try {
    const w = await withdrawalModel.getWithdrawalById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const user = await userModel.getUserById(w.userId);
    const balance = parseFloat(user?.balance || 0) + w.amount;
    await userModel.updateUser(w.userId, { balance });
    await withdrawalModel.updateWithdrawalStatus(req.params.id, 'rejected');

    await db.ref(`userNotifications/${w.userId}`).push({
      title: 'Withdrawal Rejected',
      message: `Your withdrawal of ${w.amount} BWP was rejected.`,
      action: 'reject',
      timestamp: Date.now(),
      read: false
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Support
export async function listSupportChats(req, res) {
  try {
    const snap = await db.ref('supportChats').orderByChild('updatedAt').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ userId: c.key, ...c.val() }));
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getSupportMessages(req, res) {
  try {
    const snap = await db.ref(`supportChats/${req.params.userId}/messages`).orderByChild('timestamp').once('value');
    const list = [];
    if (snap.exists()) snap.forEach(c => list.push({ id: c.key, ...c.val() }));
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function replySupport(req, res) {
  try {
    const { userId, text } = req.body;
    if (!userId || !text?.trim()) return res.status(400).json({ error: 'userId and text required' });
    
    // Save the admin reply to messages
    const ref = db.ref(`supportChats/${userId}/messages`).push();
    await ref.set({
      text: text.trim(),
      senderType: 'admin',
      senderId: req.user.uid,
      senderName: req.user.email || 'Support',
      timestamp: Date.now(),
      read: false
    });
    
    // Update last message metadata
    await db.ref(`supportChats/${userId}`).update({
      lastMessage: text.trim(),
      lastMessageTime: Date.now(),
      updatedAt: Date.now()
    });
    
    // Send notification to user about the reply
    await db.ref(`notifications/${userId}`).push({
      title: 'Support Reply',
      message: 'You have a new reply from support: ' + text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      type: 'support',
      timestamp: Date.now(),
      read: false
    });
    
    res.status(201).json({ id: ref.key });
  } catch (e) {
    console.error('Error replying to support:', e);
    res.status(500).json({ error: e.message });
  }
}

// Payment methods
export async function getPaymentMethods(req, res) {
  try {
    const snap = await db.ref('paymentMethods').once('value');
    res.json(snap.val() || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function setPaymentMethods(req, res) {
  try {
    await db.ref('paymentMethods').set(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Announcements
export async function createAnnouncement(req, res) {
  try {
    const { title, message, target } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const ref = db.ref('announcements').push();
    await ref.set({
      title,
      message,
      target: target || { type: 'all' },
      timestamp: Date.now(),
      sentBy: req.user.uid
    });
    res.status(201).json({ id: ref.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
