/**
 * Environment validation.
 *
 * This platform is deployed to a public URL and holds health answers about
 * real people, so the settings that protect it must be checked at boot rather
 * than discovered at the first request. A missing AUTH_SECRET is not a runtime
 * inconvenience; it is an unprotected admin area.
 *
 * Development is deliberately lenient so `npm run dev` works from a fresh
 * clone. Production is not: every problem below aborts startup.
 */

export interface EnvProblem {
  variable: string;
  message: string;
}

const MIN_SECRET_LENGTH = 32;

const PLACEHOLDER_SECRETS = [
  'change-me-to-a-long-random-string-at-least-32-chars',
  'dev-only-secret-value-that-is-long-enough-1234567890',
];

const PLACEHOLDER_PASSWORDS = ['ChangeMe!2024', 'password', 'admin'];

/** Every problem with the current environment, worst first. */
export function inspectEnv(
  env: NodeJS.ProcessEnv = process.env,
  isProduction = env.NODE_ENV === 'production',
): EnvProblem[] {
  const problems: EnvProblem[] = [];

  if (!env.DATABASE_URL) {
    problems.push({ variable: 'DATABASE_URL', message: 'is not set.' });
  } else if (isProduction && /localhost|127\.0\.0\.1/.test(env.DATABASE_URL)) {
    problems.push({
      variable: 'DATABASE_URL',
      message: 'points at localhost, which is almost never right in production.',
    });
  } else if (isProduction && !/sslmode=/.test(env.DATABASE_URL)) {
    problems.push({
      variable: 'DATABASE_URL',
      message:
        'has no sslmode. Health answers travel over this connection; append ?sslmode=require unless the database is on a private network.',
    });
  }

  const secret = env.AUTH_SECRET;
  if (!secret) {
    problems.push({ variable: 'AUTH_SECRET', message: 'is not set. Admin sessions cannot be signed.' });
  } else {
    if (secret.length < MIN_SECRET_LENGTH) {
      problems.push({
        variable: 'AUTH_SECRET',
        message: `is ${secret.length} characters; it must be at least ${MIN_SECRET_LENGTH}.`,
      });
    }
    if (isProduction && PLACEHOLDER_SECRETS.includes(secret)) {
      problems.push({
        variable: 'AUTH_SECRET',
        message: 'is still the example value from .env.example. Anyone reading the repo can forge an admin session.',
      });
    }
  }

  if (isProduction && PLACEHOLDER_PASSWORDS.includes(env.SEED_ADMIN_PASSWORD ?? '')) {
    problems.push({
      variable: 'SEED_ADMIN_PASSWORD',
      message: 'is still an example password.',
    });
  }

  if (isProduction && env.SEED_DEMO_CARRIER === 'true') {
    problems.push({
      variable: 'SEED_DEMO_CARRIER',
      message:
        'is "true". That seeds a FICTIONAL carrier with invented rates; it must never exist in a database an agent quotes from.',
    });
  }

  const hours = Number(env.AUTH_SESSION_HOURS ?? 12);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
    problems.push({
      variable: 'AUTH_SESSION_HOURS',
      message: `is "${env.AUTH_SESSION_HOURS}"; expected a number of hours between 1 and 720.`,
    });
  }

  const retention = Number(env.QUOTE_RETENTION_DAYS ?? 30);
  if (!Number.isFinite(retention) || retention <= 0 || retention > 3650) {
    problems.push({
      variable: 'QUOTE_RETENTION_DAYS',
      message: `is "${env.QUOTE_RETENTION_DAYS}"; expected a number of days between 1 and 3650.`,
    });
  }

  return problems;
}

export function formatEnvProblems(problems: EnvProblem[]): string {
  const lines = problems.map((p) => `  - ${p.variable} ${p.message}`);
  return `Environment is not fit to serve:\n${lines.join('\n')}\n\nSee .env.example.`;
}

/** Throws in production if anything is wrong; warns otherwise. */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
  const isProduction = env.NODE_ENV === 'production';
  const problems = inspectEnv(env, isProduction);
  if (problems.length === 0) return;
  const message = formatEnvProblems(problems);
  if (isProduction) throw new Error(message);
  console.warn(`[env] ${message}`);
}
