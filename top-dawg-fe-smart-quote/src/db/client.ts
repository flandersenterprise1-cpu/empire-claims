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

/**
 * Connection options for a URL, with TLS decided by where the host is.
 *
 * Managed PostgreSQL (Neon, Supabase, RDS, Render) refuses an unencrypted
 * connection. postgres.js does not negotiate TLS on its own -- it only does so
 * when the URL carries sslmode, and a connection string copied from a console
 * does not always include it. Left alone that produces a refused connection
 * whose message says nothing about TLS, which is a long way to travel for a
 * missing query parameter.
 *
 * So: anything that is not loopback gets TLS. An explicit sslmode in the URL
 * always wins, including sslmode=disable, so a self-hosted database on a
 * private network can still opt out deliberately.
 *
 * Pooled connections are also capped lower than a long-running server would
 * want. Serverless platforms run many instances of this process at once, and
 * ten sockets apiece exhausts a small database's connection limit quickly.
 */
export function connectionOptions(url: string): { max: number; ssl?: 'require' } {
  const max = process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : 5;
  let host = '';
  let hasExplicitSslMode = false;
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    hasExplicitSslMode = parsed.searchParams.has('sslmode');
  } catch {
    // An unparseable URL is postgres.js's problem to report, not ours to guess at.
    return { max };
  }
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
  if (hasExplicitSslMode || isLocal) return { max };
  return { max, ssl: 'require' };
}

export function getSql() {
  if (!globalForDb.__topdawgSql) {
    const url = connectionString();
    globalForDb.__topdawgSql = postgres(url, connectionOptions(url));
  }
  return globalForDb.__topdawgSql;
}

/** Shared application database handle. */
export function getDb() {
  return drizzle(getSql(), { schema });
}

/** Creates an isolated handle (used by scripts and integration tests). */
export function createDb(url: string) {
  const sql = postgres(url, { ...connectionOptions(url), max: 4 });
  return { db: drizzle(sql, { schema }), sql };
}

export { schema };
