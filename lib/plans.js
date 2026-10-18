// Display prices. The amount actually charged comes from the Stripe Price IDs
// (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY) — keep the two in sync.
export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: 5.99, period: 'month', note: 'Billed monthly. Cancel anytime.' },
  yearly: { id: 'yearly', label: 'Yearly', price: 47.99, period: 'year', perMonth: 4.0, note: 'Save 33% compared to monthly.' },
};

export const PRO_FEATURES = [
  'Premium templates: resume, invoice, pitch deck…',
  'PDF to Word, Excel & PowerPoint',
  'Word, Excel & PowerPoint to PDF',
  'OCR — turn scans into searchable PDFs',
  'Password-protect and unlock PDFs',
  'Files up to 100 MB',
  'Priority email support',
];

export const FREE_FEATURES = [
  'All 22 browser tools — merge, split, compress, sign…',
  'Create Word, Excel, PowerPoint & PDF files online',
  'Unlimited use, no watermarks',
  'Files never leave your device',
];
