export function isValidPhone(digits) {
  return /^7\d{7}$/.test(String(digits).replace(/\D/g, ''));
}

export function validateDepositAmount(amount) {
  const n = parseFloat(amount);
  if (isNaN(n) || n < 200) return { valid: false, error: 'Invalid amount (min 200 BWP)' };
  return { valid: true, value: n };
}

export function validateWithdrawalAmount(amount, balance) {
  const n = parseFloat(amount);
  if (isNaN(n) || n < 30 || n > 200000) return { valid: false, error: 'Invalid amount (200-200,000 BWP)' };
  if (n > balance) return { valid: false, error: 'Insufficient balance' };
  return { valid: true, value: n };
}
