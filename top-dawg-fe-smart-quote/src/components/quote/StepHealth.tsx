'use client';

import { useMemo } from 'react';
import { HEALTH_CATEGORY_LABELS } from '@/lib/constants';
import {
  interviewProgress,
  visibleQuestions,
  type AnswerMap,
  type QuestionRecord,
} from '@/modules/questionnaire';
import { QuestionField } from './QuestionField';

interface Props {
  questions: QuestionRecord[];
  answers: AnswerMap;
  onAnswersChange: (answers: AnswerMap) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}

/**
 * The interview branches as you answer: follow-ups are computed on the client
 * with the very same pure module the server uses, so nothing lags and nothing
 * can drift between the two.
 */
export function StepHealth({
  questions,
  answers,
  onAnswersChange,
  onBack,
  onSubmit,
  submitting,
  error,
}: Props) {
  const visible = useMemo(() => visibleQuestions(questions, answers), [questions, answers]);
  const progress = useMemo(() => interviewProgress(questions, answers), [questions, answers]);

  const grouped = useMemo(() => {
    const map = new Map<string, QuestionRecord[]>();
    for (const question of visible) {
      const list = map.get(question.category) ?? [];
      list.push(question);
      map.set(question.category, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="stack">
      <div className="card card-tight">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '0.5rem',
          }}
        >
          <strong className="small">Health interview</strong>
          <span className="small muted">
            {progress.answered} of {progress.visible} answered
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="hint" style={{ marginTop: '0.6rem' }}>
          Follow-up questions appear only when they apply. A healthy client finishes in about a
          minute.
        </p>
      </div>

      {grouped.map(([category, items]) => (
        <section className="card" key={category}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1.1rem' }}>
            {HEALTH_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ')}
          </h3>
          {items.map((question) => (
            <QuestionField
              key={question.code}
              question={question}
              value={answers[question.code]}
              onChange={(value) => onAnswersChange({ ...answers, [question.code]: value })}
            />
          ))}
        </section>
      ))}

      {!progress.complete ? (
        <p className="notice notice-caution">
          {progress.requiredOutstanding.length} question(s) still need an answer. You can run the
          quote anyway — anything left blank comes back as “Requires underwriting verification”
          rather than a guess.
        </p>
      ) : null}
      {error ? <p className="notice notice-danger">{error}</p> : null}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-gold" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Building Super Quote…' : 'Build the Super Quote'}
        </button>
      </div>
    </div>
  );
}
