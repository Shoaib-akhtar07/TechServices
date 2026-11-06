import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Privacy Policy', description: `How ${SITE.name} handles your data and files: browser tools never upload them, and server tools delete them as soon as your download is ready.`, alternates: { canonical: '/privacy/' } };

export default function Privacy() {
  return (
    <StaticPage
      title="Privacy policy"
      blocks={[
        { p: 'Last updated: October 2026.' },
        { h2: 'Free tools' },
        { p: `Files you open with the free ${SITE.name} tools are processed entirely inside your browser. They are not uploaded to, stored on or transmitted to our servers or any third party.` },
        { h2: 'Pro tools' },
        { p: 'Pro tools (PDF to Word/Excel/PowerPoint, Office to PDF, OCR, Protect and Unlock PDF) need server processing. Your file is sent over an encrypted HTTPS connection, processed in memory and in a temporary folder, and deleted as soon as the result is returned to you. We do not keep copies, read your documents or use them to train any model. Passwords you enter for Protect/Unlock PDF are used only for that request and are never stored.' },
        { h2: 'Your account' },
        { p: 'When you create an account we store your name, email address and a securely hashed password (we never store the password itself), plus your subscription status.' },
        { h2: 'Payments' },
        { p: 'Payments are handled by Stripe. Your card details go directly to Stripe and never touch our servers. We receive only your subscription status, plan and renewal date. See Stripe’s privacy policy for details.' },
        { h2: 'Cookies and local storage' },
        { p: 'We use a strictly necessary session cookie to keep you logged in, and local storage to remember your light/dark theme. If we add analytics or advertising, this policy will be updated to name the providers.' },
        { h2: 'Deleting your data' },
        { p: `Email ${SITE.email} from your account address to delete your account and all associated data.` },
      ]}
    />
  );
}
