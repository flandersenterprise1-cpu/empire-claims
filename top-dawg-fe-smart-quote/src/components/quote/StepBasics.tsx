'use client';

import { useState } from 'react';
import {
  COVERAGE_STEP,
  MAX_COVERAGE,
  MIN_COVERAGE,
  US_STATES,
} from '@/lib/constants';

export interface BasicsValues {
  stateCode: string;
  ageMode: 'age' | 'dob';
  age: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | '';
  tobaccoUse: boolean | null;
  faceAmount: number;
  monthlyBudget: string;
}

export const EMPTY_BASICS: BasicsValues = {
  stateCode: '',
  ageMode: 'dob',
  age: '',
  dateOfBirth: '',
  sex: '',
  tobaccoUse: null,
  faceAmount: 10000,
  monthlyBudget: '',
};

const COVERAGE_OPTIONS = Array.from(
  { length: (MAX_COVERAGE - MIN_COVERAGE) / COVERAGE_STEP + 1 },
  (_, index) => MIN_COVERAGE + index * COVERAGE_STEP,
);

interface Props {
  values: BasicsValues;
  onChange: (values: BasicsValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  errors: Record<string, string>;
}

export function StepBasics({ values, onChange, onSubmit, submitting, errors }: Props) {
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof BasicsValues>(key: K, value: BasicsValues[K]) =>
    onChange({ ...values, [key]: value });

  const missing =
    !values.stateCode ||
    !values.sex ||
    values.tobaccoUse === null ||
    (values.ageMode === 'age' ? !values.age : !values.dateOfBirth);

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!missing) onSubmit();
      }}
    >
      <h2 style={{ fontSize: '1.3rem' }}>Client basics</h2>
      <p className="muted small" style={{ marginTop: '0.35rem', marginBottom: '1.5rem' }}>
        Six fields. No name, Social Security number, banking or beneficiary information is
        collected anywhere in this quote.
      </p>

      <label className="field">
        <span className="label">State</span>
        <select
          className="select"
          value={values.stateCode}
          onChange={(event) => set('stateCode', event.target.value)}
        >
          <option value="">Select a state…</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        {errors.stateCode ? <span className="hint" style={{ color: 'var(--color-danger)' }}>{errors.stateCode}</span> : null}
      </label>

      <div className="field">
        <span className="label">Age or date of birth</span>
        <div className="choice-row" style={{ marginBottom: '0.6rem' }}>
          <button
            type="button"
            className="choice"
            aria-pressed={values.ageMode === 'dob'}
            onClick={() => set('ageMode', 'dob')}
          >
            Enter date of birth
          </button>
          <button
            type="button"
            className="choice"
            aria-pressed={values.ageMode === 'age'}
            onClick={() => set('ageMode', 'age')}
          >
            Enter age only
          </button>
        </div>
        {values.ageMode === 'age' ? (
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            placeholder="e.g. 68"
            value={values.age}
            onChange={(event) => set('age', event.target.value)}
          />
        ) : null}
        {values.ageMode === 'age' ? (
          <span className="hint">
            Carriers that rate on age nearest birthday — Combined Insurance among them — cannot be
            priced from an age alone, because 66 may rate as 66 or 67 depending on the birthday.
            They will read &ldquo;Rate unavailable&rdquo;. Enter the date of birth to price every
            carrier.
          </span>
        ) : null}
        {values.ageMode === 'dob' ? (
          <>
            <input
              className="input"
              type="date"
              value={values.dateOfBirth}
              onChange={(event) => set('dateOfBirth', event.target.value)}
            />
            <span className="hint">
              Used to work out the age, then discarded. The date of birth is never stored.
            </span>
          </>
        ) : null}
        {(errors.age || errors.dateOfBirth) ? (
          <span className="hint" style={{ color: 'var(--color-danger)' }}>
            {errors.age ?? errors.dateOfBirth}
          </span>
        ) : null}
      </div>

      <div className="field">
        <span className="label">Sex (as the carrier rates it)</span>
        <div className="choice-row">
          {(['female', 'male'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="choice"
              aria-pressed={values.sex === option}
              onClick={() => set('sex', option)}
            >
              {option === 'female' ? 'Female' : 'Male'}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Tobacco or nicotine use in the last 12 months</span>
        <div className="choice-row">
          <button
            type="button"
            className="choice"
            aria-pressed={values.tobaccoUse === false}
            onClick={() => set('tobaccoUse', false)}
          >
            No
          </button>
          <button
            type="button"
            className="choice"
            aria-pressed={values.tobaccoUse === true}
            onClick={() => set('tobaccoUse', true)}
          >
            Yes
          </button>
        </div>
      </div>

      <label className="field">
        <span className="label">Desired coverage</span>
        <select
          className="select"
          value={values.faceAmount}
          onChange={(event) => set('faceAmount', Number(event.target.value))}
        >
          {COVERAGE_OPTIONS.map((amount) => (
            <option key={amount} value={amount}>
              ${amount.toLocaleString()}
            </option>
          ))}
        </select>
        <span className="hint">
          ${MIN_COVERAGE.toLocaleString()}–${MAX_COVERAGE.toLocaleString()}. Each product’s own
          minimum, maximum and increment is applied on the results screen.
        </span>
        {errors.faceAmount ? <span className="hint" style={{ color: 'var(--color-danger)' }}>{errors.faceAmount}</span> : null}
      </label>

      <label className="field">
        <span className="label">Maximum monthly budget (optional)</span>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={1}
          placeholder="e.g. 75"
          value={values.monthlyBudget}
          onChange={(event) => set('monthlyBudget', event.target.value)}
        />
      </label>

      {touched && missing ? (
        <p className="notice notice-caution" style={{ marginBottom: '1rem' }}>
          Fill in state, age, sex and tobacco use to continue.
        </p>
      ) : null}
      {errors.form ? (
        <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>{errors.form}</p>
      ) : null}

      <button type="submit" className="btn btn-gold" disabled={submitting}>
        {submitting ? 'Starting…' : 'Continue to health interview'}
      </button>
    </form>
  );
}
