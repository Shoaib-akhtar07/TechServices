// Default display prices. The admin panel (Settings → Prices) overrides them, and the amount
// actually charged comes from the Stripe prices / PayPal plans saved there — keep them in sync.
export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: 5.99, period: 'month', note: 'Billed monthly. Cancel anytime.' },
  yearly: { id: 'yearly', label: 'Yearly', price: 47.99, period: 'year', perMonth: 4.0, note: 'Save 33% compared to monthly.' },
};

export const PRO_FEATURES = [
  'Create Word, Excel (140+ formulas), PowerPoint & PDF online',
  'Premium templates: resume, invoice, pitch deck…',
  'PDF to Word, Excel & PowerPoint',
  'Word, Excel & PowerPoint to PDF',
  'OCR — turn scans into searchable PDFs',
  'Password-protect and unlock PDFs',
  'Files up to 100 MB',
  'Priority email support',
];

export const FREE_FEATURES = [
  'All browser tools — merge, split, compress, sign, redact…',
  'Unlimited use, no watermarks',
  'Files never leave your device',
];

/** "$5.99", "€5.99"… for the site currency. */
export function fmtPrice(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
