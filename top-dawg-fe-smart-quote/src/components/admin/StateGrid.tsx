'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { US_STATES } from '@/lib/constants';

interface Props {
  productId: number;
  available: string[];
}

/** Tap states on or off, then save the whole map in one request. */
export function StateGrid({ productId, available }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(available));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (code: string) => {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem' }}>State availability</h3>
          <p className="muted small" style={{ marginTop: '0.25rem' }}>
            {selected.size} of {US_STATES.length} states marked available.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSaved(false);
              setSelected(new Set(US_STATES.map((s) => s.code)));
            }}
          >
            Select all
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSaved(false);
              setSelected(new Set());
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '0.4rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(4.2rem, 1fr))',
          margin: '1rem 0',
        }}
      >
        {US_STATES.map((state) => (
          <button
            key={state.code}
            type="button"
            className="choice"
            style={{ minHeight: '2.75rem', padding: '0.35rem', fontSize: '0.875rem' }}
            aria-pressed={selected.has(state.code)}
            aria-label={state.name}
            onClick={() => toggle(state.code)}
          >
            {state.code}
          </button>
        ))}
      </div>

      {error ? <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{error}</p> : null}
      {saved ? <p className="notice" style={{ marginBottom: '1rem' }}>State availability saved.</p> : null}

      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const response = await fetch(`/api/admin/products/${productId}/states`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                states: US_STATES.map((state) => ({
                  stateCode: state.code,
                  isAvailable: selected.has(state.code),
                })),
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error ?? 'Could not save.');
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving…' : 'Save state availability'}
      </button>
    </div>
  );
}
