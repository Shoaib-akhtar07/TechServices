import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getAccess } from './auth';

/** Use at the top of every admin page and server action. Non-admins get a plain 404. */
export async function requireAdmin() {
  const access = await getAccess();
  if (!access.user) redirect('/login/?next=/admin/');
  if (!access.admin) notFound();
  return access;
}
