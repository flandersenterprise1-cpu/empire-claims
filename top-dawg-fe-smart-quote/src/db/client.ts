import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  __topdawgSql?: ReturnType<typeof postgres>;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL instance.',
    );
  }
  return url;
}

export function getSql() {
  if (!globalForDb.__topdawgSql) {
    globalForDb.__topdawgSql = postgres(connectionString(), { max: 10 });
  }
  return globalForDb.__topdawgSql;
}

/** Shared application database handle. */
export function getDb() {
  return drizzle(getSql(), { schema });
}

/** Creates an isolated handle (used by scripts and integration tests). */
export function createDb(url: string) {
  const sql = postgres(url, { max: 4 });
  return { db: drizzle(sql, { schema }), sql };
}

export { schema };
