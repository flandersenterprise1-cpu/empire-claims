import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { clientIp, fail, ok, route } from '@/lib/api';
import { recordAudit } from '@/modules/audit';
import {
  clearLoginAttempts,
  createSessionToken,
  isLoginThrottled,
  registerFailedLogin,
  setSessionCookie,
  verifyPassword,
} from '@/modules/auth';

const schema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(255),
  password: z.string().min(1).max(200),
});

export const POST = route(async (request: Request) => {
  const { email, password } = schema.parse(await request.json());
  const ip = clientIp(request);
  const throttleKey = `${ip ?? 'unknown'}|${email}`;

  if (isLoginThrottled(throttleKey)) {
    return fail('Too many sign-in attempts. Try again in a few minutes.', 429);
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Same response whether the account is missing, inactive or the password is
  // wrong, so the endpoint cannot be used to enumerate accounts.
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    registerFailedLogin(throttleKey);
    return fail('That email and password combination was not recognised.', 401);
  }

  clearLoginAttempts(throttleKey);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await setSessionCookie(
    await createSessionToken({
      sub: String(user.id),
      email: user.email,
      role: user.role as 'admin' | 'agent',
      tv: user.tokenVersion,
    }),
  );
  await recordAudit(db, {
    actor: { id: user.id, email: user.email },
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    summary: 'Signed in',
    ipAddress: ip,
  });

  return ok({ id: user.id, email: user.email, role: user.role });
});
