'use client';

import type { HeightWeightAnswer, QuestionRecord } from '@/modules/questionnaire';

interface Props {
  question: QuestionRecord;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders one interview question. Large controls, one decision per screen row. */
export function QuestionField({ question, value, onChange }: Props) {
  const describedBy = question.helpText ? `${question.code}-help` : undefined;

  return (
    <fieldset
      style={{ border: 0, padding: 0, margin: '0 0 1.4rem' }}
      aria-describedby={describedBy}
    >
      <legend style={{ fontWeight: 600, padding: 0, fontSize: '1.02rem' }}>
        {question.prompt}
      </legend>
      {question.helpText ? (
        <p id={describedBy} className="hint" style={{ marginBottom: '0.6rem' }}>
          {question.helpText}
        </p>
      ) : null}

      <div style={{ marginTop: '0.6rem' }}>{renderControl(question, value, onChange)}</div>
    </fieldset>
  );
}

function renderControl(
  question: QuestionRecord,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  switch (question.answerType) {
    case 'boolean':
      return (
        <div className="choice-row">
          {[
            { label: 'No', v: false },
            { label: 'Yes', v: true },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              className="choice"
              aria-pressed={value === option.v}
              onClick={() => onChange(option.v)}
            >
              {option.label}
            </button>
          ))}
        </div>
      );

    case 'single_select':
      return (
        <div className="choice-row">
          {(question.options ?? []).map((option) => (
            <button
              key={option.value}
              type="button"
              className="choice"
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      );

    case 'multi_select': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="choice-row">
          {(question.options ?? []).map((option) => {
            const isOn = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className="choice"
                aria-pressed={isOn}
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((v) => v !== option.value)
                      : [...selected.filter((v) => v !== 'none' || option.value === 'none'), option.value],
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

    case 'integer':
    case 'months_ago':
    case 'decimal':
      return (
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          step={question.answerType === 'decimal' ? '0.1' : '1'}
          value={value == null ? '' : String(value)}
          placeholder={question.answerType === 'months_ago' ? 'Number of months' : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : Number(event.target.value))
          }
        />
      );

    case 'height_weight': {
      const hw = (value ?? {}) as HeightWeightAnswer;
      const update = (patch: Partial<HeightWeightAnswer>) => onChange({ ...hw, ...patch });
      return (
        <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <label className="tiny muted">
            Feet
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={3}
              max={8}
              value={hw.feet ?? ''}
              onChange={(e) => update({ feet: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <label className="tiny muted">
            Inches
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              value={hw.inches ?? ''}
              onChange={(e) => update({ inches: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <label className="tiny muted">
            Pounds
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={50}
              max={600}
              value={hw.pounds ?? ''}
              onChange={(e) => update({ pounds: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
        </div>
      );
    }

    case 'medication_list': {
      const list = Array.isArray(value) ? (value as string[]).join('\n') : String(value ?? '');
      return (
        <textarea
          className="textarea"
          value={list}
          placeholder={'metformin\nlisinopril'}
          onChange={(event) =>
            onChange(
              event.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            )
          }
        />
      );
    }

    default:
      return (
        <textarea
          className="textarea"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
