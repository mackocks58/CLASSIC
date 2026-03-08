/**
 * API Client - Calls backend instead of Firebase directly
 * Requires Firebase Auth for token. Set window.API_BASE to override (default: http://localhost:3000)
 */
(function() {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || 'http://localhost:3000';

  async function getToken() {
    const auth = typeof firebase !== 'undefined' && firebase.auth && firebase.auth();
    const user = auth?.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  async function request(method, path, body) {
    const token = await getToken();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || res.statusText || 'Request failed');
    return data;
  }

  window.ClassicAPI = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),

    auth: {
      register: (data) => request('POST', '/api/auth/register', data)
    },
    users: {
      me: () => request('GET', '/api/users/me'),
      update: (data) => request('PATCH', '/api/users/me', data),
      withdrawalAccount: (data) => request('PUT', '/api/users/me/withdrawal-account', data),
      byReferral: (code) => request('GET', '/api/users/by-referral/' + encodeURIComponent(code))
    },
    deposits: {
      create: (data) => request('POST', '/api/deposits', data),
      createCrypto: (data) => request('POST', '/api/deposits/crypto', data),
      list: () => request('GET', '/api/deposits'),
      pending: () => request('GET', '/api/deposits/pending')
    },
    withdrawals: {
      create: (data) => request('POST', '/api/withdrawals', data),
      list: () => request('GET', '/api/withdrawals')
    },
    support: {
      messages: () => request('GET', '/api/support/messages'),
      send: (text) => request('POST', '/api/support/messages', { text })
    },
    notifications: {
      list: () => request('GET', '/api/notifications'),
      announcements: () => request('GET', '/api/notifications/announcements'),
      markRead: (id, type) => request('POST', '/api/notifications/' + id + '/read?type=' + (type || 'notification'))
    },
    transactions: {
      list: () => request('GET', '/api/transactions')
    },
    tasks: {
      videos: () => request('GET', '/api/tasks/videos'),
      watchVideo: (videoId) => request('POST', '/api/tasks/videos/' + encodeURIComponent(videoId) + '/watch')
    },
    upgrades: {
      history: () => request('GET', '/api/upgrades/history'),
      unlock: (levelId) => request('POST', '/api/upgrades/unlock', { levelId }),
      paymentMethods: () => request('GET', '/api/upgrades/payment-methods')
    },
    admin: {
      users: () => request('GET', '/api/admin/users'),
      updateUser: (id, data) => request('PATCH', '/api/admin/users/' + id, data),
      deposits: () => request('GET', '/api/admin/deposits'),
      approveDeposit: (id) => request('POST', '/api/admin/deposits/' + id + '/approve'),
      rejectDeposit: (id) => request('POST', '/api/admin/deposits/' + id + '/reject'),
      withdrawals: () => request('GET', '/api/admin/withdrawals'),
      approveWithdrawal: (id) => request('POST', '/api/admin/withdrawals/' + id + '/approve'),
      rejectWithdrawal: (id) => request('POST', '/api/admin/withdrawals/' + id + '/reject'),
      supportChats: () => request('GET', '/api/admin/support/chats'),
      supportMessages: (userId) => request('GET', '/api/admin/support/chats/' + userId + '/messages'),
      supportReply: (userId, text) => request('POST', '/api/admin/support/reply', { userId, text }),
      paymentMethods: () => request('GET', '/api/admin/payment-methods'),
      setPaymentMethods: (data) => request('PUT', '/api/admin/payment-methods', data),
      createAnnouncement: (data) => request('POST', '/api/admin/announcements', data)
    }
  };
})();
