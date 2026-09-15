'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateCarrierForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Add a carrier</summary>
      <form
        style={{ marginTop: '1rem' }}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const response = await fetch('/api/admin/carriers', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                name,
                slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                notes: notes || null,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error ?? 'Could not create the carrier.');
            setName('');
            setSlug('');
            setNotes('');
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span className="label">Carrier name</span>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Slug (optional)</span>
          <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Notes</span>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <p className="hint" style={{ marginBottom: '1rem' }}>
          New carriers are created inactive and unverified. Load the source documents, products,
          rules and rate tables, then publish the module.
        </p>
        {error ? <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{error}</p> : null}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create carrier'}
        </button>
      </form>
    </details>
  );
}
