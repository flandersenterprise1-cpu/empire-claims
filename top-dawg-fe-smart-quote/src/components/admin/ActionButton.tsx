'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  url: string;
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  label: string;
  busyLabel?: string;
  className?: string;
  confirm?: string;
  onDone?: (payload: unknown) => void;
}

/** Fires one admin mutation and refreshes the server-rendered page. */
export function ActionButton({
  url,
  method = 'POST',
  body,
  label,
  busyLabel,
  className = 'btn btn-sm btn-ghost',
  confirm,
  onDone,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          try {
            const response = await fetch(url, {
              method,
              headers: body ? { 'content-type': 'application/json' } : undefined,
              body: body ? JSON.stringify(body) : undefined,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
            onDone?.(payload);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (busyLabel ?? 'Working…') : label}
      </button>
      {error ? (
        <span className="tiny" style={{ color: 'var(--color-danger)', maxWidth: '22rem' }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
