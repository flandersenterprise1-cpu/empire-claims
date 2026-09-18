/**
 * Runs once when the server starts, before it accepts a request.
 *
 * This logs environment problems rather than throwing. An earlier version
 * aborted startup in production, on the reasoning that a forgeable
 * AUTH_SECRET is an unprotected admin area rather than a warning. That was
 * the wrong trade: crashing the process makes EVERY route return a bare 500,
 * including /api/health, so the operator is left with a dead site and no way
 * to find out which variable is wrong.
 *
 * The admin area protects itself regardless -- the auth module refuses to sign
 * or verify a session when AUTH_SECRET is missing or too short, so a
 * misconfigured deployment cannot issue admin sessions whether or not the
 * process is running. GET /api/health reports every problem by name.
 */
export async function register() {
  const { inspectEnv, formatEnvProblems } = await import('@/lib/env');
  const problems = inspectEnv();
  if (problems.length > 0) {
    console.error(`[env] ${formatEnvProblems(problems)}`);
    console.error('[env] The site is serving anyway. GET /api/health lists these by name.');
  }
}
