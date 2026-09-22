import { describe, expect, it } from 'vitest';
import {
  AFLAC_ANNUAL_FEE,
  AFLAC_CAPTURES,
  AFLAC_MONTHLY_FACTOR,
  CAPTURED_FACE_AMOUNTS,
  expandCapture,
  MOO_ANNUAL_FEE,
  MOO_CAPTURES,
  MOO_MONTHLY_FACTOR,
} from '@/db/carriers/quoter-derived-rates';

/**
 * These lock the stored figures to the premiums the carrier quoters actually
 * printed. If a capture is ever mistyped, or the rounding rule drifts, the
 * failure names the exact screen it no longer matches.
 */

const aflacAt10k = (slug: string, sex: 'male' | 'female', tob: 'non_tobacco' | 'tobacco') => {
  const capture = AFLAC_CAPTURES.find(
    (c) => c.productSlug === slug && c.sex === sex && c.tobaccoClass === tob,
  );
  if (!capture) return null;
  return expandCapture(capture, AFLAC_ANNUAL_FEE, AFLAC_MONTHLY_FACTOR, 'up').find(
    (r) => r.faceAmount === 10000,
  )!;
};

describe('Aflac, recovered from the rate quoter', () => {
  it('reproduces the annual premiums the quoter printed at $10,000, age 65', () => {
    expect(aflacAt10k('aflac-fe-preferred', 'female', 'non_tobacco')!.annualPremium).toBe('502.70');
    expect(aflacAt10k('aflac-fe-preferred', 'male', 'non_tobacco')!.annualPremium).toBe('637.80');
    expect(aflacAt10k('aflac-fe-standard', 'male', 'non_tobacco')!.annualPremium).toBe('866.20');
    expect(aflacAt10k('aflac-fe-modified', 'male', 'non_tobacco')!.annualPremium).toBe('1108.40');
  });

  it('rounds the monthly mode UP to the cent, as the quoter does', () => {
    // 866.20 x 0.0875 = 75.7925. The quoter prints 75.80; ordinary rounding
    // would print 75.79, so the rule is load-bearing, not cosmetic.
    expect(aflacAt10k('aflac-fe-standard', 'male', 'non_tobacco')!.monthlyPremium).toBe('75.80');
    expect(aflacAt10k('aflac-fe-preferred', 'female', 'non_tobacco')!.monthlyPremium).toBe('43.99');
  });

  it('holds male tobacco back, because it was never read off a requoted screen', () => {
    const maleTobacco = AFLAC_CAPTURES.filter(
      (c) => c.sex === 'male' && c.tobaccoClass === 'tobacco',
    );
    expect(maleTobacco).toEqual([]);
  });

  it('covers only age 65, so no other age can be priced from these', () => {
    expect([...new Set(AFLAC_CAPTURES.map((c) => c.age))]).toEqual([65]);
  });
});

describe('Mutual of Omaha, recovered from the quick quoter', () => {
  it('reproduces the $10,000 quotes and the $20,000 quotes that pinned the fee', () => {
    const level = MOO_CAPTURES.find((c) => c.productSlug === 'living-promise-level')!;
    const rows = expandCapture(
      level,
      MOO_ANNUAL_FEE['living-promise-level'],
      MOO_MONTHLY_FACTOR,
      'nearest',
    );
    expect(rows.find((r) => r.faceAmount === 10000)!.annualPremium).toBe('636.60');
    expect(rows.find((r) => r.faceAmount === 20000)!.annualPremium).toBe('1237.20');

    const graded = MOO_CAPTURES.find((c) => c.productSlug === 'living-promise-graded')!;
    const gradedRows = expandCapture(
      graded,
      MOO_ANNUAL_FEE['living-promise-graded'],
      MOO_MONTHLY_FACTOR,
      'nearest',
    );
    expect(gradedRows.find((r) => r.faceAmount === 10000)!.annualPremium).toBe('561.00');
    // The predicted figure the live quoter came back with, which is what
    // confirmed the $12 fee.
    expect(gradedRows.find((r) => r.faceAmount === 20000)!.annualPremium).toBe('1110.00');
  });

  it('covers only age 65', () => {
    expect([...new Set(MOO_CAPTURES.map((c) => c.age))]).toEqual([65]);
  });
});

describe('expandCapture', () => {
  it('covers every face amount the quote form offers', () => {
    expect(CAPTURED_FACE_AMOUNTS[0]).toBe(3000);
    expect(CAPTURED_FACE_AMOUNTS.at(-1)).toBe(25000);
    expect(expandCapture(AFLAC_CAPTURES[0], 48, 0.0875, 'up')).toHaveLength(
      CAPTURED_FACE_AMOUNTS.length,
    );
  });

  it('stays linear in the face amount, net of the fee', () => {
    const rows = expandCapture(AFLAC_CAPTURES[0], 48, 0.0875, 'up');
    const at10k = Number(rows.find((r) => r.faceAmount === 10000)!.annualPremium);
    const at20k = Number(rows.find((r) => r.faceAmount === 20000)!.annualPremium);
    expect(at20k - 48).toBeCloseTo((at10k - 48) * 2, 2);
  });
});
