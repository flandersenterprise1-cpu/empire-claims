import { describe, expect, it } from 'vitest';
import {
  RNA_GDB_RATES,
  RNA_GI_RATES,
  RNA_MODAL_FACTORS,
  RNA_SIWL_PREFERRED_RATES,
  RNA_SIWL_STANDARD_RATES,
} from '@/db/carriers/royal-neighbors-rates';
import { RNA_PRODUCTS, RNA_RULES } from '@/db/carriers/royal-neighbors';

/** The rate sheet's own order of operations, 2996-1-R Rev. 2-2025. */
function pacMonthly(ratePerThousand: number, faceAmount: number): number {
  const { factor, certificateFee } = RNA_MODAL_FACTORS.pacMonthly;
  const perUnit = Math.round(ratePerThousand * factor * 100) / 100;
  return Math.round((perUnit * (faceAmount / 1000) + certificateFee) * 100) / 100;
}

describe("Royal Neighbors, against the rate sheet's own worked examples", () => {
  it('SIWL Standard, male 60 non-tobacco, $10,000 -> $51.15', () => {
    const row = RNA_SIWL_STANDARD_RATES.find(([age]) => age === 60)!;
    expect(row[1]).toBe(53.75);
    expect(pacMonthly(row[1], 10000)).toBe(51.15);
  });

  it('GDB, male 60 non-tobacco, $10,000 -> $66.55', () => {
    const row = RNA_GDB_RATES.find(([age]) => age === 60)!;
    expect(row[1]).toBe(71.5);
    expect(pacMonthly(row[1], 10000)).toBe(66.55);
  });

  it('GI, male 60, $10,000 -> $126.15', () => {
    const row = RNA_GI_RATES.find(([age]) => age === 60)!;
    expect(row[1]).toBe(140);
    expect(pacMonthly(row[1], 10000)).toBe(126.15);
  });

  it('rounds the modal rate before units, which is four cents from doing it straight through', () => {
    const straightThrough = Math.round(53.75 * 0.087 * 10 * 100) / 100 + 4.35;
    expect(straightThrough).toBeCloseTo(51.11, 2);
    expect(pacMonthly(53.75, 10000)).toBe(51.15);
  });
});

describe('Royal Neighbors rate tables', () => {
  it('cover the ages the sheet prints, and no more', () => {
    const span = (rows: Array<readonly [number, ...number[]]>) => [
      rows[0][0],
      rows[rows.length - 1][0],
    ];
    expect(span(RNA_SIWL_STANDARD_RATES)).toEqual([50, 85]);
    expect(span(RNA_SIWL_PREFERRED_RATES)).toEqual([50, 75]);
    expect(span(RNA_GDB_RATES)).toEqual([50, 85]);
    expect(span(RNA_GI_RATES)).toEqual([50, 80]);
  });

  it('has no gaps', () => {
    for (const rows of [RNA_SIWL_STANDARD_RATES, RNA_GDB_RATES]) {
      expect(rows.map((r) => r[0])).toEqual(
        Array.from({ length: 36 }, (_, i) => 50 + i),
      );
    }
  });
});

describe('Royal Neighbors risk chart', () => {
  it('derives each rule result from the chart marks rather than a typed-in value', () => {
    for (const r of RNA_RULES) {
      const [pref, std, gdb] = r.marks;
      const expected =
        pref === 'A' ? 'allow' : std === 'A' ? 'level' : gdb === 'A' ? 'graded' : 'guaranteed_issue';
      expect(r.result).toBe(expected);
    }
  });

  it('sends the chart\'s hard knockouts to Guaranteed Issue', () => {
    const giOnly = RNA_RULES.filter((r) => r.result === 'guaranteed_issue').map((r) => r.conditionCode);
    for (const code of ['adl', 'hiv', 'dementia', 'chf', 'cirrhosis', 'transplant', 'oxygen']) {
      expect(giOnly).toContain(code);
    }
  });

  it('marks Washington unavailable only for the two products the sheet names', () => {
    const wa = RNA_PRODUCTS.filter((p) => p.unavailableStates.includes('WA')).map((p) => p.slug);
    expect(wa.sort()).toEqual(['ensured-legacy-gdb', 'ensured-legacy-gi']);
  });
});
