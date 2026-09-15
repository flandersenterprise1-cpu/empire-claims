import { describe, expect, it } from 'vitest';
import { findRate, selectRateTable } from '@/modules/engine/rates';
import { INTAKE, bundle, rateEntries } from '../fixtures/sample-carriers';

const ASOF = '2026-01-01';

describe('exact rate-table matching', () => {
  it('returns the exact premium for a matching age, sex, class and face amount', () => {
    const rate = findRate(bundle('a', { rates: rateEntries(30) }), INTAKE, ASOF);
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(30);
  });

  it('charges the tobacco row for a tobacco client', () => {
    const b = bundle('a', { rates: rateEntries(30) });
    expect(findRate(b, { ...INTAKE, tobaccoUse: true }, ASOF).monthlyPremium).toBe(45);
    expect(findRate(b, { ...INTAKE, tobaccoUse: false }, ASOF).monthlyPremium).toBe(30);
  });

  it('scales with the face amount because each face has its own row', () => {
    const b = bundle('a', { rates: rateEntries(30) });
    expect(findRate(b, { ...INTAKE, faceAmount: 5000 }, ASOF).monthlyPremium).toBe(15);
    expect(findRate(b, { ...INTAKE, faceAmount: 15000 }, ASOF).monthlyPremium).toBe(45);
  });

  it('adds the monthly policy fee to the looked-up premium', () => {
    const b = bundle('a', { rates: rateEntries(30), monthlyPolicyFee: 2.5 });
    expect(findRate(b, INTAKE, ASOF).monthlyPremium).toBe(32.5);
  });

  it('uses a unisex row when the table does not split by sex', () => {
    const b = bundle('a', {
      rates: [
        { age: 65, sex: 'unisex', tobaccoClass: 'non_tobacco', faceAmount: 10000, monthlyPremium: 41.1 },
      ],
    });
    expect(findRate(b, INTAKE, ASOF).monthlyPremium).toBe(41.1);
  });

  it('uses a unismoke row for both tobacco and non-tobacco clients', () => {
    const b = bundle('a', {
      tobaccoClasses: ['unismoke'],
      rates: [
        { age: 65, sex: 'female', tobaccoClass: 'unismoke', faceAmount: 10000, monthlyPremium: 55 },
      ],
    });
    expect(findRate(b, { ...INTAKE, tobaccoUse: true }, ASOF).monthlyPremium).toBe(55);
    expect(findRate(b, { ...INTAKE, tobaccoUse: false }, ASOF).monthlyPremium).toBe(55);
  });
});

describe('rate unavailable', () => {
  it('reports unavailable instead of inventing a premium for a missing age', () => {
    const rate = findRate(bundle('a', { rates: rateEntries(30, { ages: [60, 70] }) }), INTAKE, ASOF);
    expect(rate.status).toBe('unavailable');
    expect(rate.monthlyPremium).toBeUndefined();
    expect(rate.reason).toContain('No verified rate');
  });

  it('reports unavailable for a face amount with no row, without interpolating', () => {
    const rate = findRate(
      bundle('a', { rates: rateEntries(30, { faces: [5000, 15000] }) }),
      INTAKE,
      ASOF,
    );
    expect(rate.status).toBe('unavailable');
  });

  it('never reads a draft rate table', () => {
    const rate = findRate(bundle('a', { rateStatus: 'draft' }), INTAKE, ASOF);
    expect(rate.status).toBe('unavailable');
    expect(rate.reason).toContain('No published rate table');
  });

  it('never reads an archived rate table', () => {
    expect(findRate(bundle('a', { rateStatus: 'archived' }), INTAKE, ASOF).status).toBe('unavailable');
  });

  it('ignores a rate table that has not taken effect yet', () => {
    expect(
      findRate(bundle('a', { rateEffectiveDate: '2027-01-01' }), INTAKE, ASOF).status,
    ).toBe('unavailable');
  });

  it('ignores a rate table whose end date has passed', () => {
    expect(
      findRate(bundle('a', { rateEndDate: '2025-06-30' }), INTAKE, ASOF).status,
    ).toBe('unavailable');
  });
});

describe('rate methodology', () => {
  it('refuses to compute a per-$1,000 premium unless the carrier methodology allows it', () => {
    const b = bundle('a', {
      rates: [
        { age: 65, sex: 'female', tobaccoClass: 'non_tobacco', faceAmount: 0, monthlyPremium: 0, ratePerThousand: 4.2 },
      ],
    });
    expect(findRate(b, INTAKE, ASOF).status).toBe('unavailable');
  });

  it('computes a per-$1,000 premium when the verified methodology permits it', () => {
    const b = bundle('a', {
      rateMethodology: 'per_thousand',
      allowInterpolation: true,
      monthlyPolicyFee: 3,
      rates: [
        { age: 65, sex: 'female', tobaccoClass: 'non_tobacco', faceAmount: 0, monthlyPremium: 0, ratePerThousand: 4.2 },
      ],
    });
    const rate = findRate(b, INTAKE, ASOF);
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(45); // 4.2 × 10 + 3
  });
});

describe('rate table selection', () => {
  it('prefers a state-specific table over the nationwide table', () => {
    const b = bundle('a');
    b.rateTables.push({
      ...b.rateTables[0],
      id: 99,
      stateCode: 'TX',
      version: 2,
      entries: [
        { age: 65, sex: 'female', tobaccoClass: 'non_tobacco', faceAmount: 10000, monthlyPremium: 12.34 },
      ],
    });
    expect(selectRateTable(b, 'TX', ASOF)?.id).toBe(99);
    expect(findRate(b, INTAKE, ASOF).monthlyPremium).toBe(12.34);
  });

  it('prefers the most recently effective table', () => {
    const b = bundle('a');
    b.rateTables.push({
      ...b.rateTables[0],
      id: 77,
      version: 2,
      effectiveDate: '2025-01-01',
      entries: [
        { age: 65, sex: 'female', tobaccoClass: 'non_tobacco', faceAmount: 10000, monthlyPremium: 99.99 },
      ],
    });
    expect(selectRateTable(b, 'TX', ASOF)?.version).toBe(2);
    expect(findRate(b, INTAKE, ASOF).monthlyPremium).toBe(99.99);
  });

  it('honours the as-of date when choosing between table versions', () => {
    const b = bundle('a');
    b.rateTables.push({
      ...b.rateTables[0],
      id: 78,
      version: 2,
      effectiveDate: '2025-01-01',
      entries: [
        { age: 65, sex: 'female', tobaccoClass: 'non_tobacco', faceAmount: 10000, monthlyPremium: 99.99 },
      ],
    });
    // Before the new table takes effect, the original one still applies.
    expect(findRate(b, INTAKE, '2024-06-01').monthlyPremium).toBe(30);
  });
});
