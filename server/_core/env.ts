// Centralized environment configuration for the server.
// All secrets/config come from environment variables so the app is
// portable across any host (no Manus platform dependency).

export const ENV = {
  /** Secret used to sign admin session JWTs. MUST be set in production. */
  cookieSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  /** MySQL connection string. When empty the app runs without a database. */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Optional: openId of the platform owner (legacy; unused without OAuth). */
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
