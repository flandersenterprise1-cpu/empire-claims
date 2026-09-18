import { redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from '@/modules/auth';

/** Server-component guard for every protected admin page. */
export async function adminGuard(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'admin') redirect('/admin/login?denied=1');
  return user;
}
