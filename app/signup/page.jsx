import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Create account', robots: { index: false, follow: true }, alternates: { canonical: '/signup/' } };

export default function Signup() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
