/**
 * Runs once when the server starts, before it accepts a request.
 *
 * The environment check belongs here rather than at first use: a production
 * deployment with a forgeable AUTH_SECRET should refuse to start, not serve
 * an unprotected admin area until somebody happens to notice. In development
 * the same check only warns, so a fresh clone still runs.
 */
export async function register() {
  const { assertEnv } = await import('@/lib/env');
  assertEnv();
}
