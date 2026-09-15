'use client';

import { useMemo, useState } from 'react';
import { US_STATES } from '@/lib/constants';
import type { SuperQuote } from '@/modules/engine/types';
import {
  visibleQuestions,
  type AnswerMap,
  type QuestionRecord,
} from '@/modules/questionnaire';
import { QuestionField } from '@/components/quote/QuestionField';

export function PreviewTool({ questions }: { questions: QuestionRecord[] }) {
  const [stateCode, setStateCode] = useState('TX');
  const [age, setAge] = useState('65');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [tobaccoUse, setTobaccoUse] = useState(false);
  const [faceAmount, setFaceAmount] = useState('10000');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [asOf, setAsOf] = useState('');
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [quote, setQuote] = useState<SuperQuote | null>(null);
  const [facts, setFacts] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => visibleQuestions(questions, answers), [questions, answers]);

  return (
    <div className="stack">
      <div className="card">
        <div
          style={{
            display: 'grid',
            gap: '0 1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
          }}
        >
          <label className="field">
            <span className="label">State</span>
            <select className="select" value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.code}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Age</span>
            <input className="input" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Sex</span>
            <select
              className="select"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Face amount</span>
            <input
              className="input"
              type="number"
              value={faceAmount}
              onChange={(e) => setFaceAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">As-of date</span>
            <input className="input" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </label>
          <div className="field">
            <span className="label">Tobacco</span>
            <button
              type="button"
              className="choice"
              aria-pressed={tobaccoUse}
              onClick={() => setTobaccoUse((v) => !v)}
            >
              {tobaccoUse ? 'Tobacco' : 'Non-tobacco'}
            </button>
          </div>
          <div className="field">
            <span className="label">Include inactive</span>
            <button
              type="button"
              className="choice"
              aria-pressed={includeInactive}
              onClick={() => setIncludeInactive((v) => !v)}
            >
              {includeInactive ? 'Yes' : 'No'}
            </button>
          </div>
        </div>

        {error ? <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{error}</p> : null}

        <button
          type="button"
          className="btn btn-gold"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const response = await fetch('/api/admin/preview', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  stateCode,
                  age: Number(age),
                  sex,
                  tobaccoUse,
                  faceAmount: Number(faceAmount),
                  answers,
                  includeInactive,
                  ...(asOf ? { asOf } : {}),
                }),
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(payload.error ?? 'Preview failed.');
              setQuote(payload.quote);
              setFacts(payload.facts);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Running…' : 'Run preview'}
        </button>
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>
          Health answers ({visible.length} questions on screen)
        </summary>
        <div style={{ marginTop: '1rem' }}>
          {visible.map((question) => (
            <QuestionField
              key={question.code}
              question={question}
              value={answers[question.code]}
              onChange={(value) => setAnswers({ ...answers, [question.code]: value })}
            />
          ))}
        </div>
      </details>

      {quote ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Carrier / product</th>
                  <th>Category</th>
                  <th>Premium</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {quote.options.map((option, index) => (
                  <tr key={option.productId}>
                    <td>{index + 1}</td>
                    <td>
                      <div style={{ fontWeight: 650 }}>{option.carrierName}</div>
                      <div className="tiny muted">{option.productName}</div>
                    </td>
                    <td className="tiny">{option.categoryLabel}</td>
                    <td>
                      {option.monthlyPremium == null
                        ? 'Rate unavailable'
                        : `$${option.monthlyPremium.toFixed(2)}`}
                    </td>
                    <td className="tiny">{option.recommendation}</td>
                  </tr>
                ))}
                {quote.unavailable.map((option) => (
                  <tr key={`x-${option.productId}`} style={{ opacity: 0.6 }}>
                    <td>—</td>
                    <td>
                      <div style={{ fontWeight: 650 }}>{option.carrierName}</div>
                      <div className="tiny muted">{option.productName}</div>
                    </td>
                    <td className="tiny">Not available</td>
                    <td>—</td>
                    <td className="tiny">{option.exclusions.map((e) => e.message).join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {facts ? (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Extracted facts</summary>
          <pre className="mono" style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
            {JSON.stringify(facts, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
