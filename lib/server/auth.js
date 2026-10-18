import 'server-only';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export function isActive(sub) {
  return !!sub && ['active', 'trialing'].includes(sub.status) && new Date(sub.currentPeriodEnd) > new Date();
}

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
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Pro status is read from the database on every session check, so it updates
    // as soon as the Stripe webhook lands (no re-login needed).
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
        const sub = await prisma.subscription.findUnique({ where: { userId: token.id } });
        session.user.pro = isActive(sub);
      }
      return session;
    },
  },
};

/** Current user + subscription for server code. */
export async function getAccess() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return { user: null, sub: null, pro: false };
  const user = await prisma.user.findUnique({ where: { id }, include: { subscription: true } });
  if (!user) return { user: null, sub: null, pro: false };
  return { user, sub: user.subscription, pro: isActive(user.subscription) };
}

export const testBillingEnabled = () => process.env.NODE_ENV !== 'production' && process.env.ENABLE_TEST_BILLING === 'true';
