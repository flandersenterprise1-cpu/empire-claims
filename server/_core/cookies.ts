import type { Request } from "express";

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "none" | "lax";
  path: "/";
}

/**
 * Cookie options for session cookies.
 *
 * Over HTTPS we use `secure` + `sameSite: "none"` so the cookie works when the
 * site is served behind a proxy / on a custom domain. Over plain HTTP (local
 * development) we relax to `sameSite: "lax"` and drop `secure` so the cookie is
 * still stored and sent on same-origin requests.
 */
export function getSessionCookieOptions(req: Request): SessionCookieOptions {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isSecure =
    req.protocol === "https" ||
    forwardedProto === "https" ||
    (Array.isArray(forwardedProto) && forwardedProto.includes("https"));

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
    path: "/",
  };
}
