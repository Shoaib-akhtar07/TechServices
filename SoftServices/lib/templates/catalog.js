// Public list of templates (names only). Pro template *content* lives on the server
// (lib/server/pro-templates.js) and is only sent to subscribers via /api/templates/<id>/.
export const TEMPLATE_CATALOG = [
  { id: 'doc-blank', kind: 'doc', name: 'Blank document', desc: 'Start from an empty page' },
  { id: 'doc-letter', kind: 'doc', name: 'Simple letter', desc: 'Formal letter layout' },
  { id: 'doc-resume', kind: 'doc', name: 'Professional resume', desc: 'Clean one-page CV', pro: true },
  { id: 'doc-invoice', kind: 'doc', name: 'Service invoice', desc: 'Bill a client in minutes', pro: true },
  { id: 'doc-proposal', kind: 'doc', name: 'Business proposal', desc: 'Win your next project', pro: true },
  { id: 'doc-minutes', kind: 'doc', name: 'Meeting minutes', desc: 'Agenda, decisions, action items', pro: true },

  { id: 'sheet-blank', kind: 'sheet', name: 'Blank sheet', desc: 'Empty spreadsheet' },
  { id: 'sheet-budget', kind: 'sheet', name: 'Monthly budget', desc: 'Income, expenses, savings' },
  { id: 'sheet-invoice', kind: 'sheet', name: 'Invoice calculator', desc: 'Quantities, tax and totals', pro: true },
  { id: 'sheet-sales', kind: 'sheet', name: 'Sales tracker', desc: 'Monthly sales by product', pro: true },

  { id: 'slides-blank', kind: 'slides', name: 'Blank presentation', desc: 'One title slide' },
  { id: 'slides-simple', kind: 'slides', name: 'Simple presentation', desc: 'Intro, points, thank you' },
  { id: 'slides-pitch', kind: 'slides', name: 'Startup pitch deck', desc: '8 slides investors expect', pro: true },
  { id: 'slides-report', kind: 'slides', name: 'Project status report', desc: 'Progress, risks, next steps', pro: true },
];
