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
  AIG_CAPTURES,
  AIG_MONTHLY_FACTOR,
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

  it('reproduces the male tobacco $20,000 quote', () => {
    const at20k = (slug: string) => {
      const capture = AFLAC_CAPTURES.find(
        (c) => c.productSlug === slug && c.sex === 'male' && c.tobaccoClass === 'tobacco',
      )!;
      return expandCapture(capture, AFLAC_ANNUAL_FEE, AFLAC_MONTHLY_FACTOR, 'up').find(
        (r) => r.faceAmount === 20000,
      )!.annualPremium;
    };
    expect(at20k('aflac-fe-preferred')).toBe('1950.80');
    expect(at20k('aflac-fe-standard')).toBe('2842.20');
    expect(at20k('aflac-fe-modified')).toBe('3265.20');
  });

  it('covers all four sex and tobacco classes', () => {
    const classes = new Set(AFLAC_CAPTURES.map((c) => `${c.sex}/${c.tobaccoClass}`));
    expect([...classes].sort()).toEqual([
      'female/non_tobacco',
      'female/tobacco',
      'male/non_tobacco',
      'male/tobacco',
    ]);
  });

  it('covers only age 65, so no other age can be priced from these', () => {
    expect([...new Set(AFLAC_CAPTURES.map((c) => c.age))]).toEqual([65]);
  });
});

describe('Mutual of Omaha, recovered from the quick quoter', () => {
  it('reproduces the $10,000 quotes and the $20,000 quotes that pinned the fee', () => {
    // Named explicitly: there are three Level cells and they are only two
    // dollars apart, so "the first one" is not a safe way to pick.
    const level = MOO_CAPTURES.find(
      (c) =>
        c.productSlug === 'living-promise-level' &&
        c.sex === 'female' &&
        c.tobaccoClass === 'tobacco',
    )!;
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

  it('reproduces the male and female non-tobacco quotes at both face amounts', () => {
    const at = (sex: 'male' | 'female', face: number) => {
      const capture = MOO_CAPTURES.find(
        (c) => c.productSlug === 'living-promise-level' && c.sex === sex && c.tobaccoClass === 'non_tobacco',
      )!;
      return expandCapture(capture, MOO_ANNUAL_FEE['living-promise-level'], MOO_MONTHLY_FACTOR, 'nearest')
        .find((r) => r.faceAmount === face)!.annualPremium;
    };
    expect(at('female', 10000)).toBe('460.80');
    expect(at('female', 20000)).toBe('885.60');
    expect(at('male', 10000)).toBe('634.60');
    expect(at('male', 20000)).toBe('1233.20');
  });

  it('keeps male non-tobacco and female tobacco apart, two dollars from each other', () => {
    const rate = (sex: 'male' | 'female', tob: 'non_tobacco' | 'tobacco') =>
      MOO_CAPTURES.find(
        (c) => c.productSlug === 'living-promise-level' && c.sex === sex && c.tobaccoClass === tob,
      )!.ratePerThousand;
    expect(rate('male', 'non_tobacco')).toBe(59.86);
    expect(rate('female', 'tobacco')).toBe(60.06);
    // A man must not come out cheaper than a woman of the same class.
    expect(rate('male', 'non_tobacco')).toBeGreaterThan(rate('female', 'non_tobacco'));
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

describe('AIG / Corebridge, recovered from the FE quoter', () => {
  it('derives the modal factor as the ratio of the two quoter screens', () => {
    // The Monthly screen printed these per $1,000; the Annual screen printed
    // the rates below. The factor is the quotient, not an estimate.
    const pairs: Array<[number, number]> = [
      [65.85, 5.8604], // Legacy Max, non-tobacco
      [94.71, 8.4292], // Legacy Max, tobacco
      [79.45, 7.071], // Legacy Graded
    ];
    for (const [annual, monthly] of pairs) {
      expect(monthly / annual).toBeCloseTo(AIG_MONTHLY_FACTOR, 5);
    }
  });

  it('reproduces the monthly policy fees the quoter implied', () => {
    expect(36 * AIG_MONTHLY_FACTOR).toBeCloseTo(3.21, 1);
    expect(12 * AIG_MONTHLY_FACTOR).toBeCloseTo(1.06, 1);
  });

  it('withholds GIWL, whose two screens do not reconcile', () => {
    expect(AIG_CAPTURES.some((c) => c.productSlug === 'giwl')).toBe(false);
  });

  it('covers male 65 only', () => {
    expect([...new Set(AIG_CAPTURES.map((c) => `${c.sex}/${c.age}`))]).toEqual(['male/65']);
  });
});
