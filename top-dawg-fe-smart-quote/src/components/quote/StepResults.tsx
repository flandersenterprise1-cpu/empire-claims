'use client';

import { useState } from 'react';
import { BENEFIT_TYPE_LABELS, CONFIDENCE_LABELS } from '@/lib/constants';
import type { QuoteOption, ResultCategory, SuperQuote } from '@/modules/engine/types';

const CATEGORY_BADGE: Record<ResultCategory, string> = {
  strong_level: 'badge-positive',
  possible_level: 'badge-gold',
  likely_graded: 'badge-caution',
  guaranteed_issue_only: 'badge-caution',
  requires_verification: 'badge-neutral',
  do_not_submit: 'badge-danger',
};

function money(value: number | null): string {
  return value == null ? 'Rate unavailable' : `$${value.toFixed(2)}/mo`;
}

export function StepResults({
  quote,
  onRestart,
  onEditHealth,
}: {
  quote: SuperQuote;
  onRestart: () => void;
  onEditHealth: () => void;
}) {
  const submittable = quote.options.filter((option) => option.category !== 'do_not_submit');
  const blocked = quote.options.filter((option) => option.category === 'do_not_submit');
  // The fictional-data warning already has its own banner above.
  const otherNotices = quote.notices.filter((notice) => !notice.includes('FICTIONAL'));

  return (
    <div className="stack">
      {quote.containsFictionalSampleData ? (
        <p className="notice notice-fiction">
          Contains FICTIONAL sample carrier data. These are not real rates or real underwriting
          decisions — they exist so the engine can be demonstrated before verified carrier
          documentation is loaded.
        </p>
      ) : null}

      <section className="card">
        <h2 style={{ fontSize: '1.3rem' }}>Super Quote</h2>
        <p className="muted small" style={{ marginTop: '0.3rem' }}>
          {quote.intake.stateCode} · age {quote.intake.age} ·{' '}
          {quote.intake.sex === 'female' ? 'female' : 'male'} ·{' '}
          {quote.intake.tobaccoUse ? 'tobacco' : 'non-tobacco'} · $
          {quote.intake.faceAmount.toLocaleString()} face
          {quote.intake.monthlyBudget ? ` · budget $${Number(quote.intake.monthlyBudget).toFixed(2)}/mo` : ''}
        </p>

        {quote.best ? (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '10px',
              background: 'var(--color-gold-soft)',
              border: '1px solid #e0cf9d',
            }}
          >
            <p className="badge badge-gold">Best recommendation</p>
            <p style={{ fontWeight: 750, fontSize: '1.05rem', marginTop: '0.5rem' }}>
              {quote.best.carrierName} — {quote.best.productName}
            </p>
            <p className="small" style={{ marginTop: '0.2rem' }}>
              {quote.best.categoryLabel} · {money(quote.best.monthlyPremium)}
            </p>
          </div>
        ) : (
          <p className="notice notice-danger" style={{ marginTop: '1rem' }}>
            No product can be recommended for this client on the carriers currently active. Review
            the blocked results below for the reason.
          </p>
        )}

        {quote.backup ? (
          <p className="small muted" style={{ marginTop: '0.75rem' }}>
            <strong>Backup:</strong> {quote.backup.carrierName} — {quote.backup.productName} (
            {quote.backup.categoryLabel}, {money(quote.backup.monthlyPremium)})
          </p>
        ) : null}
      </section>

      {otherNotices.length > 0 ? (
        <div className="stack-sm">
          {otherNotices.map((notice) => (
            <p className="notice notice-caution" key={notice}>
              {notice}
            </p>
          ))}
        </div>
      ) : null}

      {submittable.length > 0 ? (
        <section className="stack-sm">
          <h3 style={{ fontSize: '1.05rem' }}>Ranked results</h3>
          {submittable.map((option, index) => (
            <OptionCard
              key={`${option.productId}`}
              option={option}
              rank={index + 1}
              isBest={option === quote.best}
              isBackup={option === quote.backup}
            />
          ))}
        </section>
      ) : null}

      {blocked.length > 0 ? (
        <section className="stack-sm">
          <h3 style={{ fontSize: '1.05rem' }}>Do not submit</h3>
          {blocked.map((option) => (
            <OptionCard key={`${option.productId}`} option={option} rank={null} />
          ))}
        </section>
      ) : null}

      {quote.unavailable.length > 0 ? (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>
            Not available for this client ({quote.unavailable.length})
          </summary>
          <ul className="small muted" style={{ marginTop: '0.75rem', paddingLeft: '1.1rem' }}>
            {quote.unavailable.map((option) => (
              <li key={option.productId} style={{ marginBottom: '0.4rem' }}>
                <strong>{option.carrierName}</strong> — {option.productName}:{' '}
                {option.exclusions.map((e) => e.message).join(' ')}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="notice">{quote.disclaimer}</p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={onEditHealth}>
          Change health answers
        </button>
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Start a new quote
        </button>
      </div>

      <p className="tiny muted">
        Engine v{quote.engineVersion} · generated {new Date(quote.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function OptionCard({
  option,
  rank,
  isBest,
  isBackup,
}: {
  option: QuoteOption;
  rank: number | null;
  isBest?: boolean;
  isBackup?: boolean;
}) {
  const [showTrace, setShowTrace] = useState(false);

  return (
    <article className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <p style={{ fontWeight: 750, fontSize: '1.05rem' }}>
            {rank ? `${rank}. ` : ''}
            {option.carrierName}
          </p>
          <p className="small muted">{option.productName}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 750, fontSize: '1.15rem' }}>{money(option.monthlyPremium)}</p>
          <p className="tiny muted">${option.faceAmount.toLocaleString()} face amount</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.85rem 0' }}>
        <span className={`badge ${CATEGORY_BADGE[option.category]}`}>{option.categoryLabel}</span>
        <span className="badge badge-neutral">
          {BENEFIT_TYPE_LABELS[option.benefitType] ?? option.benefitType}
        </span>
        <span className="badge badge-neutral">{CONFIDENCE_LABELS[option.confidence]}</span>
        {option.waitingPeriodMonths > 0 ? (
          <span className="badge badge-caution">{option.waitingPeriodMonths}-month wait</span>
        ) : null}
        {isBest ? <span className="badge badge-gold">Best</span> : null}
        {isBackup ? <span className="badge badge-gold">Backup</span> : null}
        {option.isFictionalSample ? <span className="badge badge-danger">Fictional sample</span> : null}
      </div>

      <p className="small">{option.recommendation}</p>

      {option.underwritingConcerns.length > 0 ? (
        <ul className="small muted" style={{ marginTop: '0.7rem', paddingLeft: '1.1rem' }}>
          {option.underwritingConcerns.map((concern) => (
            <li key={concern} style={{ marginBottom: '0.25rem' }}>
              {concern}
            </li>
          ))}
        </ul>
      ) : null}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {option.applicationUrl ? (
          <a
            className="btn btn-sm btn-primary"
            href={option.applicationUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open application
          </a>
        ) : null}
        {option.trace.length > 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowTrace((value) => !value)}
          >
            {showTrace ? 'Hide' : 'Show'} the {option.trace.length} rule(s) behind this
          </button>
        ) : null}
      </div>

      {showTrace ? (
        <div className="stack-sm" style={{ marginTop: '0.9rem' }}>
          {option.trace.map((entry) => (
            <div
              key={`${entry.ruleId}-${entry.ruleVersion}`}
              style={{
                borderLeft: '3px solid var(--color-gold)',
                paddingLeft: '0.75rem',
              }}
            >
              <p className="tiny mono muted">
                {entry.ruleCategory} · {entry.conditionCode} · result {entry.result} · rule #
                {entry.ruleId} v{entry.ruleVersion} · {entry.verificationStatus} · effective{' '}
                {entry.effectiveDate}
                {entry.sourceDocumentTitle ? ` · ${entry.sourceDocumentTitle}` : ''}
                {entry.sourcePage ? ` (${entry.sourcePage})` : ''}
              </p>
              <p className="small">{entry.explanation}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
