export function generateReferralCode() {
  const chars = 'ABCDEFGHKJLMNPQRST0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'CMP' + result;
}

export function formatAmount(amount) {
  return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' BWP';
}

export const VIDEO_EARNINGS = {
  level1: 2.4, level2: 5, level3: 7.4, level4: 10, level5: 20,
  level6: 30, level7: 50, level8: 125, level9: 400, level10: 800
};

export const LEVEL_ORDER = ['level10', 'level9', 'level8', 'level7', 'level6', 'level5', 'level4', 'level3', 'level2', 'level1'];

export const VIDEOS_PER_DAY = 10;

export const TAX_RATE = 0.13;
