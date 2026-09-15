import { describe, expect, it } from 'vitest';
import { ageFromDateOfBirth, clientBasicsSchema } from '@/modules/intake/validation';

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
