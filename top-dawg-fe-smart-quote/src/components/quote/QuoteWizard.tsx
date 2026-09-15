'use client';

import { useCallback, useState } from 'react';
import type { SuperQuote } from '@/modules/engine/types';
import type { AnswerMap, QuestionRecord } from '@/modules/questionnaire';
import { EMPTY_BASICS, StepBasics, type BasicsValues } from './StepBasics';
import { StepHealth } from './StepHealth';
import { StepResults } from './StepResults';

const STEP_LABELS = ['Client basics', 'Health interview', 'Super Quote'];

async function postJson(url: string, body: unknown, method: 'POST' | 'PUT' = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error ?? 'Something went wrong.') as Error & {
      issues?: Array<{ path: string; message: string }>;
    };
    error.issues = payload.issues;
    throw error;
  }
  return payload;
}

export function QuoteWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [basics, setBasics] = useState<BasicsValues>(EMPTY_BASICS);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [quote, setQuote] = useState<SuperQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [healthError, setHealthError] = useState<string | null>(null);

  const startQuote = useCallback(async () => {
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        stateCode: basics.stateCode,
        sex: basics.sex,
        tobaccoUse: basics.tobaccoUse,
        faceAmount: basics.faceAmount,
        monthlyBudget: basics.monthlyBudget === '' ? null : Number(basics.monthlyBudget),
        ...(basics.ageMode === 'age'
          ? { age: Number(basics.age) }
          : { dateOfBirth: basics.dateOfBirth }),
      };
      const created = await postJson('/api/quote/start', payload);
      setSessionId(created.quoteSessionId);

      const response = await fetch(`/api/quote/${created.quoteSessionId}/questions`);
      const data = await response.json();
      setQuestions(data.questions ?? []);
      setAnswers(data.answers ?? {});
      setStep(2);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const typed = err as Error & { issues?: Array<{ path: string; message: string }> };
      const next: Record<string, string> = {};
      for (const issue of typed.issues ?? []) next[issue.path || 'form'] = issue.message;
      if (Object.keys(next).length === 0) next.form = typed.message;
      setErrors(next);
    } finally {
      setBusy(false);
    }
  }, [basics]);

  const buildQuote = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    setHealthError(null);
    try {
      await postJson(`/api/quote/${sessionId}/answers`, answers, 'PUT');
      const result = await postJson(`/api/quote/${sessionId}/results`, {});
      setQuote(result.quote);
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setHealthError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [answers, sessionId]);

  const restart = useCallback(() => {
    setStep(1);
    setBasics(EMPTY_BASICS);
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setQuote(null);
    setErrors({});
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div>
      <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
        {STEP_LABELS.map((label, index) => {
          const position = index + 1;
          const state = position === step ? 'active' : position < step ? 'done' : 'todo';
          return (
            <li className="step" data-state={state} key={label}>
              <span className="step-bar" />
              <span>
                {position}. {label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <StepBasics
          values={basics}
          onChange={setBasics}
          onSubmit={startQuote}
          submitting={busy}
          errors={errors}
        />
      ) : null}

      {step === 2 ? (
        <StepHealth
          questions={questions}
          answers={answers}
          onAnswersChange={setAnswers}
          onBack={() => setStep(1)}
          onSubmit={buildQuote}
          submitting={busy}
          error={healthError}
        />
      ) : null}

      {step === 3 && quote ? (
        <StepResults quote={quote} onRestart={restart} onEditHealth={() => setStep(2)} />
      ) : null}
    </div>
  );
}
