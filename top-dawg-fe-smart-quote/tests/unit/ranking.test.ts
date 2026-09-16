import { describe, expect, it } from 'vitest';
import { runSuperQuote } from '@/modules/engine';
import { INTAKE, bundle, facts, rateEntries, rule } from '../fixtures/sample-carriers';

const ASOF = '2026-01-01';
const clean = facts({}, { absentPaths: [] });

describe('carrier ranking', () => {
  it('ranks a level product above a graded product even when graded is cheaper', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('graded-cheap', { benefitType: 'graded', waitingPeriodMonths: 24, rates: rateEntries(10) }),
        bundle('level-dear', { benefitType: 'level', rates: rateEntries(40) }),
      ],
    });
    expect(quote.best?.benefitType).toBe('level');
    expect(quote.options[0].category).toBe('strong_level');
  });

  it('ranks the cheaper carrier first when eligibility and benefit type tie', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('expensive', { rates: rateEntries(55) }),
        bundle('cheap', { rates: rateEntries(25) }),
      ],
    });
    expect(quote.options[0].monthlyPremium).toBe(25);
    expect(quote.options[1].monthlyPremium).toBe(55);
  });

  it('sorts an unpriced option below every priced option in the same tier', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('unpriced', { rates: [] }),
        bundle('priced', { rates: rateEntries(80) }),
      ],
    });
    expect(quote.options[0].monthlyPremium).toBe(80);
    expect(quote.options[1].monthlyPremium).toBeNull();
    expect(quote.options[1].rate.status).toBe('unavailable');
  });

  it('puts guaranteed issue below graded and graded below level', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('gi', { benefitType: 'guaranteed_issue', waitingPeriodMonths: 24, rates: rateEntries(20) }),
        bundle('level', { benefitType: 'level', rates: rateEntries(60) }),
        bundle('graded', { benefitType: 'graded', waitingPeriodMonths: 24, rates: rateEntries(40) }),
      ],
    });
    expect(quote.options.map((o) => o.benefitType)).toEqual(['level', 'graded', 'guaranteed_issue']);
  });

  it('breaks a full tie with application simplicity, never with compensation', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('harder', { simplicityScore: 2, rates: rateEntries(30) }),
        bundle('easier', { simplicityScore: 5, rates: rateEntries(30) }),
      ],
    });
    expect(quote.options[0].productName).toContain('easier');
  });

  it('ranks "do not submit" last and never recommends it', () => {
    const declineRule = rule({
      conditionCode: 'hiv',
      criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
      result: 'decline',
      explanation: 'FICTIONAL: HIV is an automatic decline.',
    });
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: facts({ 'hiv.present': true }),
      asOf: ASOF,
      bundles: [
        bundle('blocked', { rules: [declineRule], rates: rateEntries(10) }),
        bundle('open', { benefitType: 'guaranteed_issue', rates: rateEntries(70) }),
      ],
    });
    expect(quote.options.at(-1)?.category).toBe('do_not_submit');
    expect(quote.best?.category).not.toBe('do_not_submit');
    expect(quote.best?.productName).toContain('open');
  });
});

describe('best and backup selection', () => {
  it('prefers a backup from a different carrier', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [
        bundle('first', { rates: rateEntries(20) }),
        bundle('second', { rates: rateEntries(30) }),
      ],
    });
    expect(quote.best?.carrierName).toContain('first');
    expect(quote.backup?.carrierName).toContain('second');
    expect(quote.backup?.carrierId).not.toBe(quote.best?.carrierId);
  });

  it('falls back to the same carrier when no other carrier qualifies', () => {
    const b1 = bundle('solo-level', { rates: rateEntries(20) });
    const b2 = bundle('solo-graded', { benefitType: 'graded', waitingPeriodMonths: 24, rates: rateEntries(25) });
    // Force both products onto the same carrier.
    b2.carrier = b1.carrier;
    b2.product.carrierId = b1.carrier.id;

    const quote = runSuperQuote({ intake: INTAKE, facts: clean, asOf: ASOF, bundles: [b1, b2] });
    expect(quote.best?.productName).toContain('solo-level');
    expect(quote.backup?.productName).toContain('solo-graded');
  });

  it('returns no recommendation when every product is blocked', () => {
    const declineRule = rule({
      conditionCode: 'confinement',
      criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
      result: 'decline',
    });
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: facts({ 'confinement.present': true }),
      asOf: ASOF,
      bundles: [bundle('a', { rules: [declineRule] }), bundle('b', { rules: [declineRule] })],
    });
    expect(quote.best).toBeNull();
    expect(quote.backup).toBeNull();
  });

  it('has no recommendation and a clear notice when nothing is available', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [bundle('inactive', { carrierStatus: 'inactive' })],
    });
    expect(quote.options).toHaveLength(0);
    expect(quote.unavailable).toHaveLength(1);
    expect(quote.notices.join(' ')).toContain('Carriers stay inactive');
  });
});

describe('super quote presentation', () => {
  it('never promises approval', () => {
    const quote = runSuperQuote({ intake: INTAKE, facts: clean, asOf: ASOF, bundles: [bundle('a')] });
    expect(quote.disclaimer).toContain('not an offer of insurance');
    expect(quote.disclaimer).toContain('Nothing here guarantees approval');
  });

  it('flags a quote that contains fictional sample data', () => {
    const quote = runSuperQuote({ intake: INTAKE, facts: clean, asOf: ASOF, bundles: [bundle('a')] });
    expect(quote.containsFictionalSampleData).toBe(true);
    expect(quote.notices[0]).toContain('FICTIONAL');
  });

  it('warns when the premium is above the client’s stated budget', () => {
    const quote = runSuperQuote({
      intake: { ...INTAKE, monthlyBudget: 25 },
      facts: clean,
      asOf: ASOF,
      bundles: [bundle('a', { rates: rateEntries(40) })],
    });
    expect(quote.options[0].underwritingConcerns.join(' ')).toContain('above the client’s stated budget');
  });

  it('exposes the rule trace that produced each result', () => {
    const gradedRule = rule({
      conditionCode: 'respiratory',
      criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] },
      result: 'graded',
      benefitClassification: 'graded',
      explanation: 'FICTIONAL: COPD classifies graded.',
      sourcePage: 'p.42',
    });
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: facts({ 'respiratory.present': true }),
      asOf: ASOF,
      bundles: [bundle('a', { benefitType: 'graded', waitingPeriodMonths: 24, rules: [gradedRule] })],
    });
    const trace = quote.options[0].trace;
    expect(trace).toHaveLength(1);
    expect(trace[0].sourcePage).toBe('p.42');
    expect(trace[0].verificationStatus).toBe('verified');
    expect(quote.options[0].recommendation).toContain('COPD classifies graded');
  });
});

describe('fictional sample data', () => {
  it('never outranks a real carrier, however cheap it is', () => {
    const real = bundle('real-carrier', { rates: rateEntries(80) });
    real.carrier.isFictionalSample = false;
    real.carrier.name = 'Real Carrier';

    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      // The fictional option is less than a quarter of the price.
      bundles: [bundle('demo', { rates: rateEntries(15) }), real],
    });

    expect(quote.best?.carrierName).toBe('Real Carrier');
    expect(quote.best?.isFictionalSample).toBe(false);
    expect(quote.options[0].isFictionalSample).toBe(false);
    // It is still shown, just ranked below everything real.
    expect(quote.options.at(-1)?.isFictionalSample).toBe(true);
  });

  it('still ranks fictional options among themselves when nothing real is available', () => {
    const quote = runSuperQuote({
      intake: INTAKE,
      facts: clean,
      asOf: ASOF,
      bundles: [bundle('demo-dear', { rates: rateEntries(60) }), bundle('demo-cheap', { rates: rateEntries(20) })],
    });
    expect(quote.best?.monthlyPremium).toBe(20);
  });
});
