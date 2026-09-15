/**
 * Authentication for the administrative area.
 *
 * bcrypt password hashes + a signed (HS256) session cookie. `tokenVersion`
 * on the user row lets an administrator invalidate every outstanding session.
 * Agent accounts and subscriptions can be layered on later without changing
 * this contract — the role is already carried in the token.
 */
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';

export const SESSION_COOKIE = 'tdfe_session';
const BCRYPT_ROUNDS = 12;

export type UserRole = 'admin' | 'agent';

export interface SessionUser {
  id: number;
  email: string;
  role: UserRole;
  displayName: string | null;
}

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or shorter than 32 characters. See .env.example for how to generate one.',
    );
  }
  return new TextEncoder().encode(value);
}

function sessionHours(): number {
  const raw = Number(process.env.AUTH_SESSION_HOURS ?? 12);
  return Number.isFinite(raw) && raw > 0 ? raw : 12;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface TokenClaims {
  sub: string;
  email: string;
  role: UserRole;
  tv: number;
}

export async function createSessionToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role, tv: claims.tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('top-dawg-fe-smart-quote')
    .setExpirationTime(`${sessionHours()}h`)
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: 'top-dawg-fe-smart-quote',
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      role: (payload.role as UserRole) ?? 'agent',
      tv: Number(payload.tv ?? 0),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionHours() * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, re-checking the database on every request. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await readSessionToken(token);
  if (!claims) return null;

  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(claims.sub)))
    .limit(1);

  if (!row || !row.isActive || row.tokenVersion !== claims.tv) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    displayName: row.displayName ?? null,
  };
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('Sign in to continue.', 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new AuthorizationError('Administrator access is required.', 403);
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/* Login throttling                                                            */
/* -------------------------------------------------------------------------- */

const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

export function registerFailedLogin(key: string): void {
  const now = Date.now();
  const existing = attempts.get(key);
  if (!existing || now - existing.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  existing.count += 1;
}

export function isLoginThrottled(key: string): boolean {
  const existing = attempts.get(key);
  if (!existing) return false;
  if (Date.now() - existing.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return existing.count >= MAX_ATTEMPTS;
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
