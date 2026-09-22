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

  // Which carriers this deployment can actually quote, and how many rate rows
  // each holds. Without this, "carrier X is not showing" cannot be told apart
  // from "you are looking at an older deployment", and an operator with a
  // browser has no way to settle it. Names and counts only.
  let quoting: Array<{ carrier: string; rateRows: number }> | null = null;
  if (schemaReady) {
    try {
      const [{ getDb }, { sql }] = await Promise.all([
        import('@/db/client'),
        import('drizzle-orm'),
      ]);
      const rows = await getDb().execute(sql`
        select c.name as carrier, count(re.id)::int as rate_rows
        from carriers c
        join products p on p.carrier_id = c.id and p.status = 'active'
        left join rate_tables rt on rt.product_id = p.id and rt.status = 'published'
        left join rate_entries re on re.rate_table_id = rt.id
        where c.status = 'active' and c.is_fictional_sample = false
        group by c.name
        order by c.name
      `);
      quoting = (rows as unknown as Array<{ carrier: string; rate_rows: number }>).map((r) => ({
        carrier: r.carrier,
        rateRows: Number(r.rate_rows),
      }));
    } catch {
      quoting = null;
    }
  }

  const healthy = database === 'ok' && schemaReady === true && problems.length === 0;

  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      // The commit this deployment was built from. Vercel sets it at build
      // time; anywhere else it reads "local".
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      database,
      schemaReady,
      environment: problems.length === 0 ? 'ok' : problems.map((p) => p.variable),
      quoting,
      detail,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
