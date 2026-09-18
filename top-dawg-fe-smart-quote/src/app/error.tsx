'use client';

/**
 * Last-resort boundary. Without it Next.js shows a bare "Something went wrong."
 * with no way forward, which tells an agent in the field nothing and tells the
 * operator nothing either. This names the failure and points at /api/health,
 * which reports configuration problems by variable name.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <div className="card">
        <h1>This page could not load</h1>
        <p>
          The quoter hit a server error. No client information was saved. Nothing here is a
          carrier decision — it is a fault in this site.
        </p>
        <p>
          <strong>Details:</strong> {error.message || 'No message was reported.'}
          {error.digest ? ` (reference ${error.digest})` : null}
        </p>
        <p>
          If this keeps happening, open <a href="/api/health">/api/health</a>. It names any
          misconfigured setting and says whether the rate database is reachable.
        </p>
        <p>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
        </p>
      </div>
    </main>
  );
}
