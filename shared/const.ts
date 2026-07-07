// Shared constants used by both the server and (type-only) the client.

/** Legacy OAuth session cookie name. Retained so logout clears any stale cookie. */
export const COOKIE_NAME = "session";

/** One year in milliseconds — default session lifetime. */
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Default HTTP client timeout (ms). */
export const AXIOS_TIMEOUT_MS = 15_000;
