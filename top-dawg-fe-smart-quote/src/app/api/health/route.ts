import { inspectEnv } from '@/lib/env';

/**
 * Liveness and readiness for load balancers, uptime checks and operators.
 *
 * This route must answer even when the deployment is badly misconfigured,
 * because that is exactly when somebody needs it. Everything it touches is
 * therefore imported lazily and wrapped: a missing DATABASE_URL, an
 * unreachable database and a broken schema all produce a report rather than
 * a 500 with no explanation.
 *
 * It reveals variable NAMES and a short error class, never values, never the
 * connection string and never a stack trace.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Innermost message in an error's cause chain, plus its code if it has one. */
function describe(err: unknown): string {
  let current: unknown = err;
  let message = String(err);
  let code: string | undefined;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    message = current.message;
    const maybe = (current as { code?: unknown }).code;
    if (typeof maybe === 'string') code = maybe;
    if (!current.cause) break;
    current = current.cause;
  }
  return code ? `${code}: ${message}` : message;
}

export async function GET() {
  const problems = inspectEnv();

  let database: 'ok' | 'unreachable' | 'not_configured' = 'not_configured';
  let detail: string | null = null;

  if (!process.env.DATABASE_URL) {
    detail = 'DATABASE_URL is not set on this deployment.';
  } else {
    try {
      const [{ getDb }, { sql }] = await Promise.all([
        import('@/db/client'),
        import('drizzle-orm'),
      ]);
      await getDb().execute(sql`select 1`);
      database = 'ok';
    } catch (err) {
      database = 'unreachable';
      // A short, non-identifying summary: enough to tell a wrong password from
      // a wrong host from a missing schema, without leaking the URL.
      // The driver wraps the real fault ("Failed query: select 1" on its own
      // explains nothing), so walk the cause chain and report the innermost
      // message, which is where the DNS, TLS or authentication error lives.
      detail = describe(err).slice(0, 200);
    }
  }

  let schemaReady: boolean | null = null;
  if (database === 'ok') {
    try {
      const [{ getDb }, { sql }] = await Promise.all([
        import('@/db/client'),
        import('drizzle-orm'),
      ]);
      const rows = await getDb().execute(
        sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
      );
      const n = Number((rows as unknown as Array<{ n: number }>)[0]?.n ?? 0);
      schemaReady = n > 0;
      if (!schemaReady) {
        detail = 'The database is reachable but empty. Run `npm run setup` against it.';
      }
    } catch {
      schemaReady = null;
    }
  }

  const healthy = database === 'ok' && schemaReady === true && problems.length === 0;

  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      schemaReady,
      environment: problems.length === 0 ? 'ok' : problems.map((p) => p.variable),
      detail,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
