import { describe, expect, it } from 'vitest';
import { checkAvailability, effectiveLimits } from '@/modules/engine/availability';
import { INTAKE, bundle } from '../fixtures/sample-carriers';

const ASOF = '2026-01-01';

describe('state availability', () => {
  it('accepts a product filed in the client’s state', () => {
    const reasons = checkAvailability(bundle('a', { states: ['TX', 'FL'] }), INTAKE, ASOF);
    expect(reasons).toHaveLength(0);
  });

  it('excludes a product not filed in the client’s state', () => {
    const reasons = checkAvailability(bundle('a', { states: ['FL'] }), INTAKE, ASOF);
    expect(reasons.map((r) => r.code)).toContain('state_unavailable');
  });

  it('excludes a product whose state row is marked unavailable', () => {
    const b = bundle('a', { states: ['TX'] });
    b.states[0].isAvailable = false;
    expect(checkAvailability(b, INTAKE, ASOF).map((r) => r.code)).toContain('state_unavailable');
  });

  it('respects a state filing that has not taken effect yet', () => {
    const b = bundle('a', { states: ['TX'] });
    b.states[0].effectiveDate = '2027-01-01';
    expect(checkAvailability(b, INTAKE, ASOF).map((r) => r.code)).toContain('state_unavailable');
  });

  it('excludes an inactive carrier and an inactive product', () => {
    expect(
      checkAvailability(bundle('a', { carrierStatus: 'inactive' }), INTAKE, ASOF).map((r) => r.code),
    ).toContain('carrier_inactive');
    expect(
      checkAvailability(bundle('a', { productStatus: 'inactive' }), INTAKE, ASOF).map((r) => r.code),
    ).toContain('product_inactive');
  });
});

describe('age eligibility', () => {
  it('accepts an age inside the issue range', () => {
    expect(checkAvailability(bundle('a', { minAge: 50, maxAge: 85 }), INTAKE, ASOF)).toHaveLength(0);
  });

  it('rejects an age below the minimum', () => {
    const reasons = checkAvailability(bundle('a', { minAge: 70 }), INTAKE, ASOF);
    expect(reasons.map((r) => r.code)).toContain('age_out_of_range');
  });

  it('rejects an age above the maximum', () => {
    const reasons = checkAvailability(bundle('a', { maxAge: 60 }), INTAKE, ASOF);
    expect(reasons.map((r) => r.code)).toContain('age_out_of_range');
  });

  it('treats the boundary ages as eligible', () => {
    expect(
      checkAvailability(bundle('a', { minAge: 65, maxAge: 65 }), INTAKE, ASOF),
    ).toHaveLength(0);
  });
});

describe('coverage minimums, maximums and increments', () => {
  it('rejects a face amount below the product minimum', () => {
    const reasons = checkAvailability(bundle('a', { minFace: 12000 }), INTAKE, ASOF);
    expect(reasons.map((r) => r.code)).toContain('face_below_minimum');
  });

  it('rejects a face amount above the product maximum', () => {
    const reasons = checkAvailability(bundle('a', { maxFace: 8000 }), INTAKE, ASOF);
    expect(reasons.map((r) => r.code)).toContain('face_above_maximum');
  });

  it('rejects a face amount that is not on the product’s increment', () => {
    const reasons = checkAvailability(
      bundle('a', { increment: 2500 }),
      { ...INTAKE, faceAmount: 11000 },
      ASOF,
    );
    expect(reasons.map((r) => r.code)).toContain('face_increment_mismatch');
  });

  it('accepts a face amount that lands exactly on the increment', () => {
    expect(
      checkAvailability(
        bundle('a', { increment: 2500, minFace: 5000, maxFace: 15000 }),
        { ...INTAKE, faceAmount: 12500 },
        ASOF,
      ),
    ).toHaveLength(0);
  });

  it('applies an age-banded face cap ahead of the product maximum', () => {
    const b = bundle('a', {
      maxFace: 25000,
      faceLimits: [
        { productId: 0, minAge: 76, maxAge: 85, minFaceAmount: 3000, maxFaceAmount: 15000 },
      ],
    });
    b.faceLimits[0].productId = b.product.id;

    expect(effectiveLimits(b, 70, 'TX').maxFaceAmount).toBe(25000);
    expect(effectiveLimits(b, 80, 'TX').maxFaceAmount).toBe(15000);

    const reasons = checkAvailability(b, { ...INTAKE, age: 80, faceAmount: 20000 }, ASOF);
    expect(reasons.map((r) => r.code)).toContain('face_above_maximum');
  });

  it('prefers a state-specific band over a nationwide band', () => {
    const b = bundle('a', {
      maxFace: 25000,
      faceLimits: [
        { productId: 0, minAge: 60, maxAge: 85, minFaceAmount: 3000, maxFaceAmount: 20000 },
        {
          productId: 0,
          minAge: 60,
          maxAge: 85,
          minFaceAmount: 3000,
          maxFaceAmount: 10000,
          stateCode: 'TX',
        },
      ],
    });
    for (const limit of b.faceLimits) limit.productId = b.product.id;

    expect(effectiveLimits(b, 65, 'TX').maxFaceAmount).toBe(10000);
    expect(effectiveLimits(b, 65, 'FL').maxFaceAmount).toBe(20000);
  });
});

describe('rate class availability', () => {
  it('excludes a tobacco client from a non-tobacco-only product', () => {
    const reasons = checkAvailability(
      bundle('a', { tobaccoClasses: ['non_tobacco'] }),
      { ...INTAKE, tobaccoUse: true },
      ASOF,
    );
    expect(reasons.map((r) => r.code)).toContain('tobacco_class_unsupported');
  });

  it('accepts either client on a unismoke product', () => {
    const b = bundle('a', { tobaccoClasses: ['unismoke'] });
    expect(checkAvailability(b, { ...INTAKE, tobaccoUse: true }, ASOF)).toHaveLength(0);
    expect(checkAvailability(b, { ...INTAKE, tobaccoUse: false }, ASOF)).toHaveLength(0);
  });
});
