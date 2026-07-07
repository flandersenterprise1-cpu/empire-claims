/**
 * Seed the first admin account for the back office.
 *
 *   npm run seed:admin -- <username> <password> [displayName]
 *
 * or set ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_NAME env vars.
 *
 * Requires DATABASE_URL to be set. Safe to run once — it refuses to create a
 * duplicate username. You can also create the first admin from the UI at /admin.
 */
import bcrypt from "bcryptjs";
import { createCredential, getCredentialByUsername } from "../server/db";
import { ENV } from "../server/_core/env";

async function main() {
  if (!ENV.databaseUrl) {
    console.error("DATABASE_URL is not set. Configure your database first.");
    process.exit(1);
  }

  const [, , argUser, argPass, argName] = process.argv;
  const username = argUser ?? process.env.ADMIN_USERNAME ?? "admin";
  const password = argPass ?? process.env.ADMIN_PASSWORD;
  const name = argName ?? process.env.ADMIN_NAME ?? username;

  if (!password || password.length < 8) {
    console.error(
      "A password of at least 8 characters is required.\n" +
        "Usage: npm run seed:admin -- <username> <password> [displayName]",
    );
    process.exit(1);
  }

  const existing = await getCredentialByUsername(username);
  if (existing) {
    console.error(`User "${username}" already exists. Nothing to do.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await createCredential({ username, passwordHash, name, role: "admin" });
  console.log(`Created admin account "${username}". You can now log in at /admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
