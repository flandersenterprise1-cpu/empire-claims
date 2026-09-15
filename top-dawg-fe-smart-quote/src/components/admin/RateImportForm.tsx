'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RATE_CSV_TEMPLATE_HEADERS } from '@/modules/rates/import';

interface Props {
  productId: number;
  benefitType: string;
  documents: Array<{ value: string; label: string }>;
}

interface ImportResult {
  status: string;
  accepted: number;
  rejected: number;
  rateTableId: number | null;
  errors: Array<{ row: number; message: string }>;
}

/** Uploads a rate CSV. The result is always a DRAFT table that must be published. */
export function RateImportForm({ productId, benefitType, documents }: Props) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [filename, setFilename] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [policyFee, setPolicyFee] = useState('0');
  const [sourceDocumentId, setSourceDocumentId] = useState('');
  const [sourcePage, setSourcePage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Import a rate table (CSV)</summary>

      <p className="hint" style={{ marginTop: '0.75rem' }}>
        Required columns: <span className="mono">{RATE_CSV_TEMPLATE_HEADERS.join(', ')}</span>.
        <br />
        <span className="mono">annual_premium</span> and <span className="mono">rate_per_thousand</span>{' '}
        are optional. Use <span className="mono">face_amount = 0</span> only for per-$1,000 rows.
        Every import lands as a draft and is invisible to agents until you publish it.
      </p>

      <form
        style={{ marginTop: '1rem' }}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          setResult(null);
          try {
            const response = await fetch(`/api/admin/products/${productId}/rates`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                csv,
                filename: filename || 'pasted-rates.csv',
                benefitType,
                stateCode: stateCode || null,
                effectiveDate,
                monthlyPolicyFee: Number(policyFee || 0),
                sourceDocumentId: sourceDocumentId ? Number(sourceDocumentId) : null,
                sourcePage: sourcePage || null,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok && !payload.errors) {
              throw new Error(payload.error ?? 'Import failed.');
            }
            setResult(payload as ImportResult);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '0 1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
          }}
        >
          <label className="field">
            <span className="label">Effective date</span>
            <input
              className="input"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">State (blank = all)</span>
            <input
              className="input"
              maxLength={2}
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
            />
          </label>
          <label className="field">
            <span className="label">Monthly policy fee</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={policyFee}
              onChange={(e) => setPolicyFee(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">File label</span>
            <input className="input" value={filename} onChange={(e) => setFilename(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Source document</span>
            <select
              className="select"
              value={sourceDocumentId}
              onChange={(e) => setSourceDocumentId(e.target.value)}
            >
              <option value="">—</option>
              {documents.map((doc) => (
                <option key={doc.value} value={doc.value}>
                  {doc.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Source page</span>
            <input className="input" value={sourcePage} onChange={(e) => setSourcePage(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="label">Upload a file</span>
          <input
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFilename(file.name);
              setCsv(await file.text());
            }}
          />
        </label>

        <label className="field">
          <span className="label">…or paste the CSV</span>
          <textarea
            className="textarea mono"
            style={{ minHeight: '10rem' }}
            value={csv}
            placeholder={'age,sex,tobacco_class,face_amount,monthly_premium\n65,female,non_tobacco,10000,42.18'}
            onChange={(e) => setCsv(e.target.value)}
          />
        </label>

        {error ? <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{error}</p> : null}

        {result ? (
          <div
            className={`notice ${result.status === 'failed' ? 'notice-danger' : 'notice-caution'}`}
            style={{ marginBottom: '1rem' }}
          >
            <strong>
              {result.status === 'failed'
                ? 'Import rejected.'
                : `Imported ${result.accepted} rate(s) as a DRAFT table.`}
            </strong>
            {result.rejected > 0 ? <div>{result.rejected} row(s) rejected:</div> : null}
            {result.errors?.length ? (
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                {result.errors.slice(0, 15).map((issue) => (
                  <li key={`${issue.row}-${issue.message}`} className="tiny">
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <button className="btn btn-primary" disabled={busy || csv.trim() === ''}>
          {busy ? 'Importing…' : 'Import as draft'}
        </button>
      </form>
    </details>
  );
}
