import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError } from '@/modules/auth';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Node socket failures and postgres driver faults, at any depth of cause. */
const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_DESTROYED',
  'CONNECTION_ENDED',
]);

function isInfrastructureError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (current.name === 'PostgresError') return true;
    if (current.message.startsWith('Failed query:')) return true;
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') {
      // Node network codes, or a five-character SQLSTATE from PostgreSQL.
      if (NETWORK_CODES.has(code)) return true;
      if (/^[0-9A-Z]{5}$/.test(code)) return true;
    }
    if (!current.cause) break;
    current = current.cause;
  }
  return false;
}

/** Wraps a route handler so validation and authorization failures map cleanly. */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthorizationError) return fail(err.message, err.status);
      if (err instanceof ZodError) {
        return fail('Please correct the highlighted fields.', 422, {
          issues: err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      // Never leak stack traces to the client.
      console.error('[api]', err);
      if (isInfrastructureError(err)) {
        // The driver's message is the whole failed statement with its bound
        // parameters -- here, the client's own answers -- which has no place
        // in a browser. It is also not the agent's mistake to correct.
        return fail(
          'The rate database is not available right now. Nothing was saved. ' +
            'Try again shortly; if it persists, open /api/health.',
          503,
        );
      }
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      return fail(message, 400);
    }
  };
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}
