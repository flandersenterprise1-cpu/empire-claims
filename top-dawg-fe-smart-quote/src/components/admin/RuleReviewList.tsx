'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export interface ReviewRule {
  id: number;
  ruleCategory: string;
  conditionCode: string;
  result: string;
  benefitClassification: string | null;
  explanation: string;
  criteriaText: string;
  productName: string | null;
  stateCode: string | null;
  sourceTitle: string | null;
  sourcePage: string | null;
  effectiveDate: string;
  ruleVersion: number;
}

interface Props {
  carrierId: number;
  carrierName: string;
  rules: ReviewRule[];
  status: string;
}

const RESULT_TONE: Record<string, string> = {
  decline: 'badge-danger',
  graded: 'badge-caution',
  modified: 'badge-caution',
  refer: 'badge-neutral',
  requires_verification: 'badge-neutral',
  benefit_not_offered: 'badge-neutral',
  eligible: 'badge-positive',
};

export function RuleReviewList({ carrierId, carrierName, rules, status }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rules;
    return rules.filter((r) =>
      [r.ruleCategory, r.conditionCode, r.result, r.explanation, r.criteriaText, r.sourcePage ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [rules, filter]);

  const uncited = rules.filter((r) => !r.sourceTitle || !r.sourcePage).length;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply(target: 'verified' | 'archived') {
    const ids = visible.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    const verb = target === 'verified' ? 'Publish' : 'Archive';
    if (
      !window.confirm(
        `${verb} ${ids.length} rule${ids.length === 1 ? '' : 's'} for ${carrierName}?\n\n` +
          (target === 'verified'
            ? 'Published rules are used by the quoting engine immediately. Confirm you have checked each one against its source document.'
            : 'Archived rules are kept and versioned, but never evaluated.'),
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/rules/bulk-status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ruleIds: ids, status: target, expectedFrom: status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
      const skipped: Array<{ id: number; reason: string }> = payload.skipped ?? [];
      setMessage(
        `${payload.updated.length} rule${payload.updated.length === 1 ? '' : 's'} moved to ${target}.` +
          (skipped.length
            ? ` ${skipped.length} skipped because they changed since this page loaded — reload and check them.`
            : ''),
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedVisible = visible.filter((r) => selected.has(r.id)).length;

  return (
    <div className="stack">
      <div className="card" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            className="input"
            placeholder="Filter by condition, result, wording or page…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ flex: '1 1 16rem' }}
          />
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSelected(new Set(visible.map((r) => r.id)))}
            disabled={visible.length === 0}
          >
            Select all {visible.length === rules.length ? '' : `${visible.length} shown`}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
          >
            Clear
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: '0.75rem',
          }}
        >
          <strong className="small">
            {selectedVisible} of {visible.length} selected
          </strong>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || selectedVisible === 0}
            onClick={() => apply('verified')}
          >
            {busy ? 'Working…' : 'Publish selected'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy || selectedVisible === 0}
            onClick={() => apply('archived')}
          >
            Archive selected
          </button>
        </div>

        {message ? (
          <p className="small" style={{ marginTop: '0.6rem' }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="small" style={{ marginTop: '0.6rem', color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
        {uncited > 0 ? (
          <p className="tiny muted" style={{ marginTop: '0.6rem' }}>
            {uncited} rule{uncited === 1 ? '' : 's'} here cite no source document or page. Those are
            marked below — do not publish one you cannot trace.
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="muted small">Nothing to review.</p>
      ) : (
        <div className="stack">
          {visible.map((rule) => {
            const cited = Boolean(rule.sourceTitle && rule.sourcePage);
            const checked = selected.has(rule.id);
            return (
              <label
                key={rule.id}
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '0.85rem',
                  cursor: 'pointer',
                  borderColor: checked ? 'var(--color-accent)' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(rule.id)}
                  style={{ width: '1.15rem', height: '1.15rem', marginTop: '0.2rem' }}
                />
                <div className="stack-sm">
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <span className={`badge ${RESULT_TONE[rule.result] ?? 'badge-neutral'}`}>
                      {rule.result.replace(/_/g, ' ')}
                    </span>
                    {rule.benefitClassification ? (
                      <span className="badge badge-neutral">{rule.benefitClassification}</span>
                    ) : null}
                    <strong className="small">{rule.conditionCode.replace(/_/g, ' ')}</strong>
                    <span className="tiny muted">{rule.ruleCategory.replace(/_/g, ' ')}</span>
                    {rule.productName ? (
                      <span className="tiny muted">· {rule.productName}</span>
                    ) : (
                      <span className="tiny muted">· all products</span>
                    )}
                    {rule.stateCode ? (
                      <span className="tiny muted">· {rule.stateCode} only</span>
                    ) : null}
                  </div>

                  <p className="small">{rule.explanation}</p>

                  <p className="tiny" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                    Applies when: {rule.criteriaText}
                  </p>

                  <p className="tiny muted">
                    {cited ? (
                      <>
                        {rule.sourceTitle}, {rule.sourcePage}
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-danger)' }}>
                        No source document or page recorded
                      </span>
                    )}
                    {' · '}effective {rule.effectiveDate} · v{rule.ruleVersion}
                    {' · '}
                    <Link href={`/admin/rules/${rule.id}`}>open</Link>
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
