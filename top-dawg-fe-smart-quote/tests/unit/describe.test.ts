import { describe, expect, it } from 'vitest';
import { describeCriteria, humanizeFact } from '@/modules/rules/describe';

describe('humanizeFact', () => {
  it('splits camelCase and dotted paths', () => {
    expect(humanizeFact('cancer.lastTreatmentMonthsAgo')).toBe('cancer / last treatment months ago');
    expect(humanizeFact('build.bmi')).toBe('build / bmi');
    expect(humanizeFact('substance_abuse.present')).toBe('substance abuse / present');
  });
});

describe('describeCriteria', () => {
  it('renders a single criterion', () => {
    expect(describeCriteria({ all: [{ fact: 'hiv.present', op: 'eq', value: true }] })).toBe(
      'hiv / present is yes',
    );
  });

  it('joins an all-group with AND', () => {
    expect(
      describeCriteria({
        all: [
          { fact: 'respiratory.present', op: 'eq', value: true },
          { fact: 'respiratory.oxygenUse', op: 'eq', value: true },
        ],
      }),
    ).toBe('respiratory / present is yes AND respiratory / oxygen use is yes');
  });

  it('joins an any-group with OR and parenthesises when nested', () => {
    expect(
      describeCriteria({
        all: [
          { fact: 'cancer.present', op: 'eq', value: true },
          { any: [{ fact: 'build.bmi', op: 'lt', value: 15 }, { fact: 'build.bmi', op: 'gt', value: 48 }] },
        ],
      }),
    ).toBe('cancer / present is yes AND (build / bmi is less than 15 OR build / bmi is more than 48)');
  });

  it('renders list values and membership operators', () => {
    expect(
      describeCriteria({
        all: [
          { fact: 'neurological.conditions', op: 'contains_any', value: ['alzheimers', 'als'] },
        ],
      }),
    ).toBe('neurological / conditions includes any of alzheimers, als');
  });

  it('renders existence operators without a value', () => {
    expect(describeCriteria({ all: [{ fact: 'medications.list', op: 'exists' }] })).toBe(
      'medications / list was answered',
    );
  });

  it('negates a none-group', () => {
    expect(
      describeCriteria({ none: [{ fact: 'cancer.type', op: 'eq', value: 'basal_squamous_skin' }] }),
    ).toBe('NOT cancer / type is basal squamous skin');
  });

  it('says so when a rule has no conditions at all', () => {
    expect(describeCriteria(null)).toBe('always applies');
    expect(describeCriteria({})).toBe('always applies');
  });
});
