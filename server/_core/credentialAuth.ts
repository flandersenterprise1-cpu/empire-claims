/**
 * Credential-based authentication for the admin back office.
 * Uses a separate cookie (admin_session) so it coexists with Manus OAuth.
 * The session JWT stores { credentialId, role } and is verified server-side.
 * On authenticate, we return a synthetic User object so all existing
 * protectedProcedure / role checks work without modification.
 */

import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import { getCredentialById, updateCredentialLastLogin } from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import type { User } from "../../drizzle/schema";

export const ADMIN_COOKIE_NAME = "admin_session";

interface AdminSessionPayload {
  credentialId: number;
  role: string;
  name: string;
}

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "fallback-dev-secret");
}

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

export async function verifyAdminSession(
  cookieValue: string | undefined | null
): Promise<AdminSessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret(), { algorithms: ["HS256"] });
    const { credentialId, role, name } = payload as Record<string, unknown>;
    if (typeof credentialId !== "number" || typeof role !== "string") return null;
    return { credentialId: credentialId as number, role: role as string, name: (name as string) ?? "" };
  } catch {
    return null;
  }
}

export async function authenticateAdminRequest(req: Request): Promise<User | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[ADMIN_COOKIE_NAME];
  const session = await verifyAdminSession(sessionCookie);
  if (!session) return null;

  const credential = await getCredentialById(session.credentialId);
  if (!credential || !credential.isActive) return null;

  // Return a synthetic User object so all existing auth middleware works
  return {
    id: credential.id,
    openId: `credential:${credential.id}`,
    name: credential.name ?? credential.username,
    email: null,
    loginMethod: "credential",
    role: credential.role as User["role"],
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    lastSignedIn: credential.lastLoginAt ?? credential.createdAt,
  };
}

export function setAdminSessionCookie(res: Response, req: Request, token: string) {
  const opts = getSessionCookieOptions(req);
  res.cookie(ADMIN_COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
}

export function clearAdminSessionCookie(res: Response, req: Request) {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(ADMIN_COOKIE_NAME, { ...opts, maxAge: -1 });
}
