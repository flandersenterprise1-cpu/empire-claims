import { ok, route } from '@/lib/api';
import { clearSessionCookie } from '@/modules/auth';

export const POST = route(async () => {
  await clearSessionCookie();
  return ok({ signedOut: true });
});
