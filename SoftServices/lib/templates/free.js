// Content of the free templates (shipped to every visitor).

export const FREE_TEMPLATES = {
  'doc-blank': { kind: 'doc', html: '<p><br></p>' },
  'doc-letter': {
    kind: 'doc',
    html: `<p style="text-align: right">Your Name<br>Street Address<br>City, Postal Code<br>email@example.com</p>
<p>18 October 2026</p>
<p>Recipient Name<br>Company Name<br>Company Address</p>
<p><strong>Subject: Write the purpose of your letter here</strong></p>
<p>Dear Recipient Name,</p>
<p>Open with one or two sentences that explain why you are writing. Keep it clear and direct so the reader knows what to expect.</p>
<p>Use the middle paragraph for details: facts, dates, amounts or background the reader needs in order to act.</p>
<p>Close by stating the next step you would like the reader to take, and thank them for their time.</p>
<p>Sincerely,</p>
<p><br>Your Name</p>`,
  },

  'sheet-blank': { kind: 'sheet', cells: {} },
  'sheet-budget': {
    kind: 'sheet',
    cells: {
      A1: { v: 'Monthly Budget', b: true },
      A3: { v: 'Income', b: true }, B3: { v: 'Amount', b: true },
      A4: { v: 'Salary' }, B4: { v: '85000' },
      A5: { v: 'Freelance' }, B5: { v: '15000' },
      A6: { v: 'Total income', b: true }, B6: { v: '=SUM(B4:B5)', b: true },
      A8: { v: 'Expenses', b: true }, B8: { v: 'Amount', b: true },
      A9: { v: 'Rent' }, B9: { v: '30000' },
      A10: { v: 'Groceries' }, B10: { v: '18000' },
      A11: { v: 'Utilities' }, B11: { v: '7000' },
      A12: { v: 'Transport' }, B12: { v: '6000' },
      A13: { v: 'Other' }, B13: { v: '5000' },
      A14: { v: 'Total expenses', b: true }, B14: { v: '=SUM(B9:B13)', b: true },
      A16: { v: 'Savings', b: true }, B16: { v: '=B6-B14', b: true },
      A17: { v: 'Savings rate' }, B17: { v: '=ROUND(B16/B6*100,1)&"%"' },
    },
  },

  'slides-blank': { kind: 'slides', theme: 'indigo', slides: [{ layout: 'title', title: 'Presentation title', body: 'Subtitle or your name' }] },
  'slides-simple': {
    kind: 'slides',
    theme: 'ocean',
    slides: [
      { layout: 'title', title: 'Your Presentation Title', body: 'Presenter name · Date' },
      { layout: 'content', title: 'Agenda', body: 'Background\nKey points\nWhat happens next\nQuestions' },
      { layout: 'content', title: 'Key points', body: 'First important idea in one short line\nSecond idea with a supporting fact\nThird idea and why it matters' },
      { layout: 'section', title: 'Thank you', body: 'Questions? Reach me at email@example.com' },
    ],
  },
};
