import { describe, expect, it } from 'vitest';
import { collectFactPaths, evaluateCriteria } from '@/modules/engine/criteria';
import { facts } from '../fixtures/sample-carriers';

describe('criteria evaluation', () => {
  it('treats an empty criteria tree as always matching', () => {
    expect(evaluateCriteria(null, facts())).toBe('true');
    expect(evaluateCriteria({}, facts())).toBe('true');
  });

  it('evaluates equality, membership and comparison operators', () => {
    const f = facts({ 'diabetes.treatment': 'insulin', 'cardiac.lastEventMonthsAgo': 18 });
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.treatment', op: 'eq', value: 'insulin' }] }, f)).toBe('true');
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.treatment', op: 'ne', value: 'insulin' }] }, f)).toBe('false');
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.treatment', op: 'in', value: ['pills', 'insulin'] }] }, f)).toBe('true');
    expect(evaluateCriteria({ all: [{ fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 24 }] }, f)).toBe('true');
    expect(evaluateCriteria({ all: [{ fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 24 }] }, f)).toBe('false');
  });

  it('handles array membership with contains_any and contains_none', () => {
    const f = facts({ 'diabetes.complications': ['neuropathy', 'retinopathy'] });
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.complications', op: 'contains_any', value: ['amputation', 'neuropathy'] }] }, f)).toBe('true');
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.complications', op: 'contains_none', value: ['amputation'] }] }, f)).toBe('true');
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.complications', op: 'contains_none', value: ['neuropathy'] }] }, f)).toBe('false');
  });

  it('returns unknown when a referenced fact was never established', () => {
    expect(evaluateCriteria({ all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] }, facts())).toBe('unknown');
  });

  it('returns unknown when a required answer is explicitly outstanding', () => {
    const f = facts({ 'diabetes.present': true }, { unknownPaths: ['diabetes.treatment'] });
    expect(evaluateCriteria({ all: [{ fact: 'diabetes.treatment', op: 'eq', value: 'insulin' }] }, f)).toBe('unknown');
  });

  it('treats a fact ruled out by branching as known absent, not unknown', () => {
    const f = facts({ 'kidney.present': false }, { absentPaths: ['kidney.dialysis', 'kidney.stage'] });
    expect(evaluateCriteria({ all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] }, f)).toBe('false');
    expect(evaluateCriteria({ all: [{ fact: 'kidney.stage', op: 'in', value: ['stage_4'] }] }, f)).toBe('false');
    // Negative assertions about an absent fact are satisfied.
    expect(evaluateCriteria({ all: [{ fact: 'kidney.stage', op: 'nin', value: ['stage_4'] }] }, f)).toBe('true');
  });

  it('short-circuits an AND group to false even when a sibling is unknown', () => {
    const f = facts({ 'cancer.present': false });
    expect(
      evaluateCriteria(
        {
          all: [
            { fact: 'cancer.present', op: 'eq', value: true },
            { fact: 'cancer.type', op: 'eq', value: 'lung' },
          ],
        },
        f,
      ),
    ).toBe('false');
  });

  it('propagates unknown through an AND group that is otherwise satisfied', () => {
    const f = facts({ 'cancer.present': true });
    expect(
      evaluateCriteria(
        {
          all: [
            { fact: 'cancer.present', op: 'eq', value: true },
            { fact: 'cancer.type', op: 'eq', value: 'lung' },
          ],
        },
        f,
      ),
    ).toBe('unknown');
  });

  it('resolves OR and NONE groups with tri-state logic', () => {
    const f = facts({ 'build.bmi': 55 });
    expect(evaluateCriteria({ any: [{ fact: 'build.bmi', op: 'gt', value: 50 }, { fact: 'build.bmi', op: 'lt', value: 16 }] }, f)).toBe('true');
    expect(evaluateCriteria({ none: [{ fact: 'build.bmi', op: 'gt', value: 50 }] }, f)).toBe('false');
    expect(evaluateCriteria({ none: [{ fact: 'build.bmi', op: 'gt', value: 60 }] }, f)).toBe('true');
  });

  it('supports nested groups', () => {
    const f = facts({ 'cancer.treatmentStatus': 'completed', 'cancer.lastTreatmentMonthsAgo': 30 });
    const criteria = {
      any: [
        { fact: 'cancer.type', op: 'eq' as const, value: 'basal_squamous_skin' },
        {
          all: [
            { fact: 'cancer.treatmentStatus', op: 'eq' as const, value: 'completed' },
            { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte' as const, value: 24 },
          ],
        },
      ],
    };
    expect(evaluateCriteria(criteria, f)).toBe('true');
  });

  it('lists every fact path a rule depends on', () => {
    const paths = collectFactPaths({
      all: [{ fact: 'a.one', op: 'eq', value: 1 }, { any: [{ fact: 'b.two', op: 'exists' }] }],
    });
    expect(paths.sort()).toEqual(['a.one', 'b.two']);
  });
});
