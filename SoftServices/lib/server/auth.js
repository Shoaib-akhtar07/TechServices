import 'server-only';
import CredentialsProvider from 'next-auth/providers/credentials';
import { cache } from 'react';
import { api, apiOrNull, sessionToken } from './api';

// Accounts live in the .NET API. NextAuth only keeps the API token inside its encrypted session
// cookie; the token is never sent to the browser (see the session callback).

export function isActive(sub) {
  return !!sub && ['active', 'trialing'].includes(sub.status) && new Date(sub.currentPeriodEnd) > new Date();
}

/** `user` as returned by the admin users API (has `admin`) or by getAccess(). */
export const isAdmin = (user) => !!user?.admin;

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        const email = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        if (!email || !password) return null;
        try {
          const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password }, token: null });
          return { id: user.id, email: user.email, name: user.name, apiToken: token };
        } catch (e) {
          // NextAuth passes a thrown error's message to the login form as `error`.
          if (e?.status === 403) throw new Error('suspended');
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.apiToken = user.apiToken;
      }
      return token;
    },
    // Pro and admin status come from the API on every session check, so they update as soon as a
    // payment lands or an admin changes them (no re-login needed).
    async session({ session, token }) {
      if (token?.id && token.apiToken) {
        session.user.id = token.id;
        const me = await apiOrNull('/auth/me', { token: token.apiToken }).catch(() => null);
        session.user.pro = !!me?.pro;
        session.user.admin = !!me?.admin;
        session.user.author = !!me?.author;
      }
      return session;
    },
  },
};

const NO_ACCESS = { user: null, sub: null, pro: false, paid: false, admin: false, author: false, usage: { today: 0, limit: 0 } };

/**
 * Current user + subscription for server code (one API call per request).
 * `pro` = may use Pro features (paid or free mode); `paid` = has an active subscription.
 */
export const getAccess = cache(async () => {
  if (!(await sessionToken())) return NO_ACCESS;
  const me = await apiOrNull('/auth/me').catch((e) => {
    console.error('Could not load the account from the API', e.message);
    return null;
  });
  if (!me) return NO_ACCESS;
  const user = { id: me.id, email: me.email, name: me.name, role: me.role, createdAt: me.createdAt, hasStripeBilling: me.hasStripeBilling };
  return { user, sub: me.subscription, pro: me.pro, paid: me.paid, admin: me.admin, author: me.author, usage: me.usage };
});

/** Development only (and only when the API allows it too): "Activate test subscription" buttons. */
export const testBillingEnabled = () => process.env.NODE_ENV !== 'production' && process.env.ENABLE_TEST_BILLING === 'true';
