import { describe, expect, it } from 'vitest';
import { parseRateCsv } from '@/modules/rates/import';

const HEADER = 'age,sex,tobacco_class,face_amount,monthly_premium';

describe('rate CSV parsing', () => {
  it('parses a well-formed file', () => {
    const { rows, errors } = parseRateCsv(
      `${HEADER}\n65,female,non_tobacco,10000,42.18\n65,male,tobacco,10000,61.40`,
    );
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      age: 65,
      sex: 'female',
      tobaccoClass: 'non_tobacco',
      faceAmount: 10000,
      monthlyPremium: 42.18,
    });
  });

  it('accepts common column aliases and currency formatting', () => {
    const { rows, errors } = parseRateCsv(
      `Age,Sex,Tobacco Class,Face Amount,Monthly Premium\n70,M,NT,"$10,000","$55.10"`,
    );
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({ sex: 'male', tobaccoClass: 'non_tobacco', faceAmount: 10000, monthlyPremium: 55.1 });
  });

  it('rejects an invalid age and keeps the valid rows', () => {
    const { rows, errors } = parseRateCsv(
      `${HEADER}\nsixty,female,non_tobacco,10000,42.18\n66,female,non_tobacco,10000,44.00`,
    );
    expect(rows).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 2 });
    expect(errors[0].message).toContain('Invalid age');
  });

  it('rejects an unrecognised sex or tobacco class', () => {
    const { errors } = parseRateCsv(
      `${HEADER}\n65,other,non_tobacco,10000,42.18\n65,female,vaper,10000,42.18`,
    );
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain('Invalid sex');
    expect(errors[1].message).toContain('Invalid tobacco_class');
  });

  it('rejects a duplicate rate for the same rate cell', () => {
    const { rows, errors } = parseRateCsv(
      `${HEADER}\n65,female,non_tobacco,10000,42.18\n65,female,non_tobacco,10000,43.00`,
    );
    expect(rows).toHaveLength(1);
    expect(errors[0].message).toContain('Duplicate rate');
  });

  it('requires rate_per_thousand on a per-$1,000 row', () => {
    const { errors } = parseRateCsv(`${HEADER}\n65,female,non_tobacco,0,0`);
    expect(errors[0].message).toContain('per-$1,000');
  });

  it('accepts a per-$1,000 row when the rate is supplied', () => {
    const { rows, errors } = parseRateCsv(
      `${HEADER},rate_per_thousand\n65,female,non_tobacco,0,0,4.2`,
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].ratePerThousand).toBe(4.2);
  });

  it('reports an empty file rather than importing nothing silently', () => {
    const { rows, errors } = parseRateCsv(HEADER);
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toContain('no rate rows');
  });
});
