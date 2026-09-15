import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { describe } from 'vitest';
import * as schema from '@/db/schema';
import { runSeed } from '@/db/seed';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Integration tests need a real PostgreSQL database. Set TEST_DATABASE_URL to
 * run them; without it they are skipped rather than failing the suite.
 */
export const describeIfDb = TEST_DATABASE_URL ? describe : describe.skip;

export async function setupTestDb() {
  if (!TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is not set.');
  const sql = postgres(TEST_DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema });

  // Start from a clean schema so every run is deterministic.
  await sql.unsafe('drop schema if exists public cascade; create schema public;');
  await sql.unsafe('drop schema if exists drizzle cascade;');
  await migrate(db, { migrationsFolder: './drizzle' });
  await runSeed(db, { demoCarrier: true });

  return { db, sql };
}
