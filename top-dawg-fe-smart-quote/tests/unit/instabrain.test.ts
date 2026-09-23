import { describe, expect, it } from 'vitest';
import {
  INSTABRAIN_TERM,
  instabrainFitsClient,
  instabrainNotice,
} from '@/db/carriers/fidelity-life';

describe('InstaBrain Term', () => {
  it('records the producer guide figures', () => {
    expect(INSTABRAIN_TERM.minAge).toBe(18);
    expect(INSTABRAIN_TERM.maxAge).toBe(60);
    expect(INSTABRAIN_TERM.minFaceAmount).toBe(50_000);
    expect(INSTABRAIN_TERM.annualPolicyFee).toBe(95);
    expect(INSTABRAIN_TERM.termYears).toEqual([10, 15, 20, 30]);
  });

  it('does not overlap this platform\'s coverage range at any amount', () => {
    // The quoter tops out at $25,000; InstaBrain starts at $50,000.
    expect(INSTABRAIN_TERM.minFaceAmount).toBeGreaterThan(25_000);
  });

  it('fits a client inside the issue ages and not outside them', () => {
    expect(instabrainFitsClient(18)).toBe(true);
    expect(instabrainFitsClient(55)).toBe(true);
    expect(instabrainFitsClient(60)).toBe(true);
    expect(instabrainFitsClient(61)).toBe(false);
    expect(instabrainFitsClient(72)).toBe(false);
  });

  it('tells the agent it is not priced, so no premium is ever implied', () => {
    const notice = instabrainNotice();
    expect(notice).toContain('term life, not final expense');
    expect(notice).toContain('no premium is shown');
    expect(notice).not.toMatch(/\$\d+\.\d{2}/);
  });
});
