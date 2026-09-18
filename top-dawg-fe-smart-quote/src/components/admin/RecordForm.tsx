'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'json';

export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** Rendered full width even in a two-column grid. */
  wide?: boolean;
}

interface Props {
  endpoint: string;
  method?: 'POST' | 'PATCH' | 'PUT';
  fields: FieldSpec[];
  initial?: Record<string, unknown>;
  /** Fixed values merged into every submission (e.g. carrierId). */
  constant?: Record<string, unknown>;
  submitLabel: string;
  summary?: string;
  /** Open by default instead of collapsing into a <details>. */
  alwaysOpen?: boolean;
  onSaved?: () => void;
}

function initialValue(field: FieldSpec, initial: Record<string, unknown> | undefined) {
  const raw = initial?.[field.name];
  if (field.type === 'checkbox') return raw === true;
  if (field.type === 'multiselect') return Array.isArray(raw) ? raw : [];
  if (field.type === 'json') return raw == null ? '' : JSON.stringify(raw, null, 2);
  return raw == null ? '' : String(raw);
}

/**
 * One generic admin form. Values are coerced on the way out and every payload
 * is re-validated on the server — this is convenience, not the security layer.
 */
export function RecordForm({
  endpoint,
  method = 'POST',
  fields,
  initial,
  constant,
  submitLabel,
  summary,
  alwaysOpen,
  onSaved,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, initialValue(field, initial)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const body = () => {
    const payload: Record<string, unknown> = { ...constant };
    for (const field of fields) {
      const value = values[field.name];
      switch (field.type) {
        case 'number': {
          if (value === '' || value == null) payload[field.name] = null;
          else payload[field.name] = Number(value);
          break;
        }
        case 'checkbox':
          payload[field.name] = Boolean(value);
          break;
        case 'multiselect':
          payload[field.name] = value;
          break;
        case 'json': {
          const text = String(value ?? '').trim();
          payload[field.name] = text === '' ? null : JSON.parse(text);
          break;
        }
        default:
          payload[field.name] = value === '' ? null : value;
      }
    }
    return payload;
  };

  const form = (
    <form
      style={{ marginTop: summary ? '1rem' : 0 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        setIssues([]);
        try {
          const response = await fetch(endpoint, {
            method,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body()),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            setIssues(payload.issues ?? []);
            throw new Error(payload.error ?? 'The request failed.');
          }
          setSaved(true);
          onSaved?.();
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
        }}
      >
        {fields.map((field) => (
          <label
            className="field"
            key={field.name}
            style={field.wide ? { gridColumn: '1 / -1' } : undefined}
          >
            <span className="label">{field.label}</span>
            {renderInput(field, values[field.name], (value) => set(field.name, value))}
            {field.help ? <span className="hint">{field.help}</span> : null}
            {issues
              .filter((issue) => issue.path === field.name)
              .map((issue) => (
                <span key={issue.message} className="hint" style={{ color: 'var(--color-danger)' }}>
                  {issue.message}
                </span>
              ))}
          </label>
        ))}
      </div>

      {error ? <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{error}</p> : null}
      {saved ? <p className="notice" style={{ marginBottom: '1rem' }}>Saved.</p> : null}

      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );

  if (alwaysOpen || !summary) return <div className="card">{form}</div>;

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 650 }}>{summary}</summary>
      {form}
    </details>
  );
}

function renderInput(field: FieldSpec, value: unknown, onChange: (value: unknown) => void) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="textarea"
          required={field.required}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'json':
      return (
        <textarea
          className="textarea mono"
          style={{ minHeight: '9rem' }}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'select':
      return (
        <select
          className="select"
          required={field.required}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="choice-row">
          {(field.options ?? []).map((option) => {
            const isOn = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className="choice"
                aria-pressed={isOn}
                onClick={() =>
                  onChange(
                    isOn ? selected.filter((v) => v !== option.value) : [...selected, option.value],
                  )
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'checkbox':
      return (
        <button
          type="button"
          className="choice"
          aria-pressed={value === true}
          onClick={() => onChange(!value)}
          style={{ maxWidth: '12rem' }}
        >
          {value === true ? 'Yes' : 'No'}
        </button>
      );
    case 'number':
      return (
        <input
          className="input"
          type="number"
          inputMode="decimal"
          required={field.required}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'date':
      return (
        <input
          className="input"
          type="date"
          required={field.required}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <input
          className="input"
          type="text"
          required={field.required}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
