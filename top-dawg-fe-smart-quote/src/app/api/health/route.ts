import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { inspectEnv } from '@/lib/env';

/**
 * Liveness and readiness for load balancers and uptime checks.
 *
 * Reports whether the database actually answers, not merely whether the
 * process is up: a Next.js server with no database serves the quote wizard
 * and then fails at the first question, which looks healthy from outside.
 *
 * It deliberately reveals nothing beyond the names of misconfigured variables
 * -- never their values, never the connection string, never a stack trace.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const problems = inspectEnv();
  let database: 'ok' | 'unreachable' = 'unreachable';
  try {
    await getDb().execute(sql`select 1`);
    database = 'ok';
  } catch {
    database = 'unreachable';
  }

  const healthy = database === 'ok' && problems.length === 0;
  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      environment: problems.length === 0 ? 'ok' : problems.map((p) => p.variable),
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
