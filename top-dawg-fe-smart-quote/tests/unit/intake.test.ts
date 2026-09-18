import { describe, expect, it } from 'vitest';
import {
  ageFromDateOfBirth,
  ageNearestBirthday,
  clientBasicsSchema,
} from '@/modules/intake/validation';

const BASE = {
  stateCode: 'tx',
  age: 65,
  sex: 'female' as const,
  tobaccoUse: false,
  faceAmount: 10000,
};

describe('client basics validation', () => {
  it('accepts a valid intake and upper-cases the state', () => {
    const parsed = clientBasicsSchema.parse(BASE);
    expect(parsed.stateCode).toBe('TX');
    expect(parsed.monthlyBudget).toBeNull();
  });

  it('rejects a state that is not a US state', () => {
    expect(() => clientBasicsSchema.parse({ ...BASE, stateCode: 'ZZ' })).toThrow();
  });

  it('enforces the $3,000–$25,000 coverage range', () => {
    expect(() => clientBasicsSchema.parse({ ...BASE, faceAmount: 2000 })).toThrow();
    expect(() => clientBasicsSchema.parse({ ...BASE, faceAmount: 30000 })).toThrow();
    expect(clientBasicsSchema.parse({ ...BASE, faceAmount: 3000 }).faceAmount).toBe(3000);
    expect(clientBasicsSchema.parse({ ...BASE, faceAmount: 25000 }).faceAmount).toBe(25000);
  });

  it('enforces $1,000 coverage increments', () => {
    expect(() => clientBasicsSchema.parse({ ...BASE, faceAmount: 10500 })).toThrow();
  });

  it('requires either an age or a date of birth', () => {
    const { age, ...withoutAge } = BASE;
    void age;
    expect(() => clientBasicsSchema.parse(withoutAge)).toThrow();
  });

  it('derives the age from a date of birth and does not keep the date', () => {
    const parsed = clientBasicsSchema.parse({
      ...BASE,
      age: undefined,
      dateOfBirth: '1960-01-15',
    });
    expect(parsed.age).toBeGreaterThan(60);
    expect(parsed).not.toHaveProperty('dateOfBirth');
  });

  it('drops anything that is not a quoting attribute', () => {
    const parsed = clientBasicsSchema.parse({
      ...BASE,
      firstName: 'Ignored',
      ssn: '000-00-0000',
      routingNumber: '123456789',
      beneficiary: 'Ignored',
    });
    expect(Object.keys(parsed).sort()).toEqual([
      'age',
      'ageNearestBirthday',
      'faceAmount',
      'monthlyBudget',
      'sex',
      'stateCode',
      'tobaccoUse',
    ]);
  });

  it('computes age nearest the actual birthday', () => {
    const asOf = new Date('2026-01-14T00:00:00Z');
    expect(ageFromDateOfBirth('1960-01-15', asOf)).toBe(65);
    expect(ageFromDateOfBirth('1960-01-14', asOf)).toBe(66);
  });
});

describe('age nearest birthday', () => {
  it('uses the last-birthday age within six months of the birthday', () => {
    // Born 15 Jan 1970, quoted 1 Apr 2026 — turned 56 less than 6 months ago.
    expect(ageNearestBirthday('1970-01-15', new Date('2026-04-01T00:00:00Z'))).toBe(56);
    expect(ageFromDateOfBirth('1970-01-15', new Date('2026-04-01T00:00:00Z'))).toBe(56);
  });

  it('rounds up once more than six months past the birthday', () => {
    // Same client quoted 1 Oct 2026 — 8 months past, so rates as 57.
    expect(ageNearestBirthday('1970-01-15', new Date('2026-10-01T00:00:00Z'))).toBe(57);
    expect(ageFromDateOfBirth('1970-01-15', new Date('2026-10-01T00:00:00Z'))).toBe(56);
  });

  it('matches the example Combined prints on its own quoter', () => {
    // "If you are 45 years and 6 months old, you will be rated as a 46 year old."
    expect(ageNearestBirthday('1981-01-01', new Date('2026-07-01T00:00:00Z'))).toBe(46);
  });

  it('is carried through client basics when a date of birth is given', () => {
    const parsed = clientBasicsSchema.parse({
      stateCode: 'TX',
      dateOfBirth: '1970-01-15',
      sex: 'male',
      tobaccoUse: false,
      faceAmount: 10000,
    });
    expect(parsed.ageNearestBirthday).not.toBeNull();
    expect(Math.abs(parsed.ageNearestBirthday! - parsed.age)).toBeLessThanOrEqual(1);
  });

  it('is null when only an age was typed in, so nearest-age carriers refuse to quote', () => {
    const parsed = clientBasicsSchema.parse({
      stateCode: 'TX',
      age: 65,
      sex: 'male',
      tobaccoUse: false,
      faceAmount: 10000,
    });
    expect(parsed.ageNearestBirthday).toBeNull();
  });
});
