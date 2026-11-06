import 'server-only';
// Pro template content. Served only to active subscribers by app/api/templates/[id].

export const PRO_TEMPLATES = {
  'doc-resume': {
    kind: 'doc',
    html: `<h1>Ayesha Khan</h1>
<p>Product Designer · Lahore, Pakistan · ayesha@example.com · +92 300 0000000 · portfolio.example.com</p>
<h2>Profile</h2>
<p>Product designer with 6 years of experience turning complex workflows into simple, accessible interfaces. Comfortable leading research, prototyping and design systems in fast-moving teams.</p>
<h2>Experience</h2>
<h3>Senior Product Designer — Brightline Software</h3>
<p><em>2022 – Present</em></p>
<ul><li>Redesigned the onboarding flow, increasing activation from 38% to 54%.</li><li>Built and maintained a design system used by 4 product teams.</li><li>Mentored 3 junior designers through weekly critiques.</li></ul>
<h3>Product Designer — Northwind Labs</h3>
<p><em>2019 – 2022</em></p>
<ul><li>Shipped a mobile banking app used by 200,000+ customers.</li><li>Ran 40+ usability sessions and turned findings into a prioritised roadmap.</li></ul>
<h2>Education</h2>
<p><strong>BS Computer Science</strong> — University of the Punjab, 2019</p>
<h2>Skills</h2>
<p>User research · Wireframing · Prototyping · Design systems · Accessibility (WCAG) · HTML/CSS basics</p>
<h2>Languages</h2>
<p>English (fluent) · Urdu (native)</p>`,
  },
  'doc-invoice': {
    kind: 'doc',
    html: `<h1>INVOICE</h1>
<p><strong>Invoice #:</strong> INV-2026-001<br><strong>Date:</strong> 18 October 2026<br><strong>Due date:</strong> 1 November 2026</p>
<h3>From</h3>
<p>Your Business Name<br>Address line<br>City, Country<br>billing@yourbusiness.com</p>
<h3>Bill to</h3>
<p>Client Name<br>Client Company<br>Client Address</p>
<h2>Services</h2>
<ol><li>Website design — 1 × 60,000 = <strong>60,000</strong></li><li>Content writing (10 pages) — 10 × 2,500 = <strong>25,000</strong></li><li>Hosting setup — 1 × 5,000 = <strong>5,000</strong></li></ol>
<p style="text-align: right">Subtotal: 90,000<br>Tax (0%): 0<br><strong>Total due: PKR 90,000</strong></p>
<h3>Payment details</h3>
<p>Bank: Your Bank · Account title: Your Business Name · IBAN: PK00XXXX0000000000000000</p>
<p><em>Thank you for your business! Please include the invoice number with your payment.</em></p>`,
  },
  'doc-proposal': {
    kind: 'doc',
    html: `<h1>Project Proposal</h1>
<p><strong>Prepared for:</strong> Client Company<br><strong>Prepared by:</strong> Your Company<br><strong>Date:</strong> 18 October 2026</p>
<h2>1. Summary</h2>
<p>In two or three sentences, describe the client’s problem and the result your project will deliver. Lead with the outcome, not the activity.</p>
<h2>2. Objectives</h2>
<ul><li>Objective one, with a measurable target</li><li>Objective two, with a deadline</li><li>Objective three, tied to a business goal</li></ul>
<h2>3. Scope of work</h2>
<p>List what is included. Being explicit here prevents misunderstandings later.</p>
<ul><li>Discovery workshop and requirements</li><li>Design and development</li><li>Testing, launch and handover</li></ul>
<h2>4. Timeline</h2>
<ol><li>Weeks 1–2: Discovery</li><li>Weeks 3–6: Build</li><li>Week 7: Testing and launch</li></ol>
<h2>5. Investment</h2>
<p>Total project fee: <strong>PKR 450,000</strong>, payable 40% at start, 40% at build completion and 20% at launch.</p>
<h2>6. Why us</h2>
<p>Share relevant experience, a short case study or a client result that proves you can deliver.</p>
<h2>7. Next steps</h2>
<p>Sign and return this proposal by 31 October 2026 to reserve the start date.</p>`,
  },
  'doc-minutes': {
    kind: 'doc',
    html: `<h1>Meeting Minutes</h1>
<p><strong>Meeting:</strong> Weekly team sync<br><strong>Date:</strong> 18 October 2026, 10:00<br><strong>Attendees:</strong> Name, Name, Name<br><strong>Note taker:</strong> Name</p>
<h2>Agenda</h2>
<ol><li>Review last week’s action items</li><li>Project updates</li><li>Blockers</li><li>Any other business</li></ol>
<h2>Discussion</h2>
<p>Summarise the key points discussed under each agenda item.</p>
<h2>Decisions</h2>
<ul><li>Decision one and who approved it</li><li>Decision two</li></ul>
<h2>Action items</h2>
<ul><li><strong>Owner</strong> — task — due date</li><li><strong>Owner</strong> — task — due date</li></ul>
<p><em>Next meeting: 25 October 2026, 10:00</em></p>`,
  },

  'sheet-invoice': {
    kind: 'sheet',
    cells: {
      A1: { v: 'INVOICE', b: true }, D1: { v: 'INV-2026-001' },
      A2: { v: 'Client' }, B2: { v: 'Client Company' }, D2: { v: '18-Oct-2026' },
      A4: { v: 'Item', b: true }, B4: { v: 'Qty', b: true }, C4: { v: 'Unit price', b: true }, D4: { v: 'Amount', b: true },
      A5: { v: 'Website design' }, B5: { v: '1' }, C5: { v: '60000' }, D5: { v: '=B5*C5' },
      A6: { v: 'Content writing' }, B6: { v: '10' }, C6: { v: '2500' }, D6: { v: '=B6*C6' },
      A7: { v: 'Hosting setup' }, B7: { v: '1' }, C7: { v: '5000' }, D7: { v: '=B7*C7' },
      A8: { v: 'Logo design' }, B8: { v: '1' }, C8: { v: '15000' }, D8: { v: '=B8*C8' },
      C10: { v: 'Subtotal', b: true }, D10: { v: '=SUM(D5:D8)' },
      B11: { v: 'Tax %' }, C11: { v: '16' }, D11: { v: '=ROUND(D10*C11/100,0)' },
      C12: { v: 'Total', b: true }, D12: { v: '=D10+D11', b: true },
    },
  },
  'sheet-sales': {
    kind: 'sheet',
    cells: {
      A1: { v: 'Sales Tracker 2026', b: true },
      A3: { v: 'Product', b: true }, B3: { v: 'Jan', b: true }, C3: { v: 'Feb', b: true }, D3: { v: 'Mar', b: true }, E3: { v: 'Total', b: true }, F3: { v: 'Average', b: true }, G3: { v: 'Status', b: true },
      A4: { v: 'Basic plan' }, B4: { v: '120' }, C4: { v: '135' }, D4: { v: '150' },
      A5: { v: 'Standard plan' }, B5: { v: '80' }, C5: { v: '76' }, D5: { v: '90' },
      A6: { v: 'Premium plan' }, B6: { v: '30' }, C6: { v: '42' }, D6: { v: '51' },
      A7: { v: 'Add-ons' }, B7: { v: '210' }, C7: { v: '190' }, D7: { v: '205' },
      ...Object.fromEntries(
        [4, 5, 6, 7].flatMap((r) => [
          [`E${r}`, { v: `=SUM(B${r}:D${r})` }],
          [`F${r}`, { v: `=ROUND(AVERAGE(B${r}:D${r}),1)` }],
          [`G${r}`, { v: `=IF(D${r}>=B${r},"Growing","Falling")` }],
        ])
      ),
      A9: { v: 'Total', b: true },
      B9: { v: '=SUM(B4:B7)', b: true }, C9: { v: '=SUM(C4:C7)', b: true }, D9: { v: '=SUM(D4:D7)', b: true }, E9: { v: '=SUM(E4:E7)', b: true },
      A10: { v: 'Best month' }, B10: { v: '=MAX(B9:D9)' },
    },
  },

  'slides-pitch': {
    kind: 'slides',
    theme: 'midnight',
    slides: [
      { layout: 'title', title: 'Company Name', body: 'One line that explains what you do' },
      { layout: 'content', title: 'The problem', body: 'Who is in pain today?\nHow big and how frequent is the pain?\nWhat do people use now, and why it falls short' },
      { layout: 'content', title: 'Our solution', body: 'What the product does in one sentence\nThe moment customers say “wow”\nWhy now is the right time' },
      { layout: 'content', title: 'Market size', body: 'TAM: total market you could ever serve\nSAM: the part you can reach today\nSOM: what you can win in 3 years' },
      { layout: 'content', title: 'Business model', body: 'How you make money\nPricing and average revenue per customer\nUnit economics: CAC vs lifetime value' },
      { layout: 'content', title: 'Traction', body: 'Users / revenue growth month over month\nKey partnerships or pilots\nWhat customers say' },
      { layout: 'content', title: 'Team', body: 'Founder — relevant experience\nCo-founder — relevant experience\nAdvisors' },
      { layout: 'section', title: 'The ask', body: 'Raising $500K to reach 10,000 customers in 18 months' },
    ],
  },
  'slides-report': {
    kind: 'slides',
    theme: 'forest',
    slides: [
      { layout: 'title', title: 'Project Status Report', body: 'Project name · Reporting period' },
      { layout: 'content', title: 'Summary', body: 'Overall status: On track\nBudget used: 62%\nNext milestone: Beta launch, 15 Nov' },
      { layout: 'content', title: 'Completed this period', body: 'Finished user authentication\nMigrated data to the new database\nCompleted security review' },
      { layout: 'content', title: 'Risks & issues', body: 'Vendor API delay — mitigation: mock service\nTwo team members on leave in November\nScope request from sales under review' },
      { layout: 'content', title: 'Next steps', body: 'Start beta with 50 customers\nFinalise pricing page\nPrepare launch communication' },
      { layout: 'section', title: 'Questions?', body: 'Project lead · email@example.com' },
    ],
  },
};
