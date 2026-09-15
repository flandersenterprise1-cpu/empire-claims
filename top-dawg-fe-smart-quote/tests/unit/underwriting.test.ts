import { describe, expect, it } from 'vitest';
import { classify } from '@/modules/engine/underwriting';
import { bundle, facts, rule } from '../fixtures/sample-carriers';

const ASOF = '2026-01-01';

describe('hard knockout rules', () => {
  it('declines when a verified decline rule matches', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'confinement',
          criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
          result: 'decline',
          explanation: 'FICTIONAL: current confinement is an automatic decline.',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'confinement.present': true }), 'TX', ASOF);
    expect(outcome.status).toBe('declined');
    expect(outcome.driver?.explanation).toContain('automatic decline');
  });

  it('does not decline when the knockout criteria are not met', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'confinement',
          criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
          result: 'decline',
        }),
      ],
    });
    expect(classify(b, facts({ 'confinement.present': false }), 'TX', ASOF).status).toBe('eligible');
  });

  it('prefers the most specific decline rule as the driver', () => {
    const b = bundle('a', {
      rules: [
        rule({ conditionCode: 'hiv', criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] }, result: 'decline', explanation: 'FICTIONAL: carrier-wide decline.' }),
      ],
    });
    // Scope a second rule to this product, which outranks the carrier-wide rule.
    b.rules.push(
      rule({
        carrierId: b.carrier.id,
        productId: b.product.id,
        conditionCode: 'hiv',
        criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
        result: 'decline',
        explanation: 'FICTIONAL: product-specific decline.',
      }),
    );
    const outcome = classify(b, facts({ 'hiv.present': true }), 'TX', ASOF);
    expect(outcome.driver?.explanation).toContain('product-specific');
  });
});

describe('level versus graded classification', () => {
  it('leaves a clean client at a level ceiling', () => {
    const outcome = classify(bundle('a'), facts({ 'diabetes.present': false }), 'TX', ASOF);
    expect(outcome.status).toBe('eligible');
    expect(outcome.ceiling).toBe('level');
  });

  it('moves the ceiling to graded when a graded rule matches', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'respiratory',
          criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] },
          result: 'graded',
          benefitClassification: 'graded',
          explanation: 'FICTIONAL: COPD classifies graded.',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'respiratory.present': true }), 'TX', ASOF);
    expect(outcome.ceiling).toBe('graded');
    // A level-only product cannot issue a graded client.
    expect(outcome.status).toBe('benefit_not_offered');
  });

  it('keeps a graded client eligible on a graded product', () => {
    const b = bundle('a', {
      benefitType: 'graded',
      rules: [
        rule({
          conditionCode: 'respiratory',
          criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] },
          result: 'graded',
          benefitClassification: 'graded',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'respiratory.present': true }), 'TX', ASOF);
    expect(outcome.status).toBe('eligible');
    expect(outcome.offered).toBe('graded');
  });

  it('takes the most restrictive classification when several rules match', () => {
    const b = bundle('a', {
      benefitType: 'guaranteed_issue',
      rules: [
        rule({ conditionCode: 'respiratory', criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] }, result: 'graded', benefitClassification: 'graded' }),
        rule({ conditionCode: 'kidney', criteria: { all: [{ fact: 'kidney.present', op: 'eq', value: true }] }, result: 'modified', benefitClassification: 'modified' }),
      ],
    });
    const outcome = classify(
      b,
      facts({ 'respiratory.present': true, 'kidney.present': true }),
      'TX',
      ASOF,
    );
    expect(outcome.ceiling).toBe('modified');
  });

  it('ignores an "allow" rule when computing the ceiling', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'diabetes',
          criteria: { all: [{ fact: 'diabetes.treatment', op: 'in', value: ['diet', 'pills'] }] },
          result: 'allow',
          benefitClassification: 'level',
        }),
      ],
    });
    const outcome = classify(
      b,
      facts({ 'diabetes.present': true, 'diabetes.treatment': 'pills' }, { reportedConditions: ['diabetes'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('eligible');
    expect(outcome.ceiling).toBe('level');
  });
});

describe('missing information', () => {
  it('requires verification when an unanswered fact could change the outcome', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'diabetes',
          criteria: { all: [{ fact: 'diabetes.treatment', op: 'eq', value: 'insulin' }] },
          result: 'graded',
          benefitClassification: 'graded',
        }),
      ],
    });
    const outcome = classify(
      b,
      facts({ 'diabetes.present': true }, { unknownPaths: ['diabetes.treatment'], reportedConditions: ['diabetes'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('requires_verification');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('missing_information');
  });

  it('does not require verification when the unanswered rule could not change the outcome', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'diabetes',
          criteria: { all: [{ fact: 'diabetes.treatment', op: 'eq', value: 'pills' }] },
          result: 'allow',
          benefitClassification: 'level',
        }),
      ],
    });
    const outcome = classify(
      b,
      facts({ 'diabetes.present': true }, { unknownPaths: ['diabetes.treatment'], reportedConditions: ['diabetes'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('eligible');
  });

  it('requires verification for a reported condition the carrier has no rule for', () => {
    const outcome = classify(
      bundle('a'),
      facts({ 'liver.present': true }, { reportedConditions: ['liver'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('requires_verification');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('no_verified_rules');
  });

  it('exempts guaranteed-issue products from the unmapped-condition check', () => {
    const outcome = classify(
      bundle('a', { benefitType: 'guaranteed_issue' }),
      facts({ 'liver.present': true }, { reportedConditions: ['liver'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('eligible');
  });
});

describe('conflicting rules', () => {
  it('requires verification when equally specific rules disagree', () => {
    const criteria = { all: [{ fact: 'cancer.present', op: 'eq' as const, value: true }] };
    const b = bundle('a', {
      rules: [
        rule({ conditionCode: 'cancer', criteria, result: 'graded', benefitClassification: 'graded', priority: 100 }),
        rule({ conditionCode: 'cancer', criteria, result: 'allow', benefitClassification: 'level', priority: 100 }),
      ],
    });
    const outcome = classify(b, facts({ 'cancer.present': true }, { reportedConditions: ['cancer'] }), 'TX', ASOF);
    expect(outcome.status).toBe('requires_verification');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('conflicting_rules');
  });

  it('does not flag a conflict when one rule is more specific than the other', () => {
    const criteria = { all: [{ fact: 'cancer.present', op: 'eq' as const, value: true }] };
    const b = bundle('a', {
      benefitType: 'graded',
      rules: [rule({ conditionCode: 'cancer', criteria, result: 'graded', benefitClassification: 'graded', priority: 100 })],
    });
    b.rules.push(
      rule({
        carrierId: b.carrier.id,
        productId: b.product.id,
        conditionCode: 'cancer',
        criteria,
        result: 'allow',
        benefitClassification: 'level',
        priority: 100,
      }),
    );
    const outcome = classify(b, facts({ 'cancer.present': true }, { reportedConditions: ['cancer'] }), 'TX', ASOF);
    expect(outcome.verificationReasons.map((r) => r.code)).not.toContain('conflicting_rules');
  });

  it('routes an explicit refer result to verification', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'pending_tests',
          criteria: { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
          result: 'refer',
          explanation: 'FICTIONAL: pending biopsy must be reviewed by the carrier.',
        }),
      ],
    });
    const outcome = classify(
      b,
      facts({ 'pending_tests.present': true }, { reportedConditions: ['pending_tests'] }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('requires_verification');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('rule_requires_carrier_referral');
  });
});

describe('rule lifecycle', () => {
  it('never applies a draft rule', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'hiv',
          criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
          result: 'decline',
          verificationStatus: 'draft',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'hiv.present': true }, { reportedConditions: ['hiv'] }), 'TX', ASOF);
    expect(outcome.status).not.toBe('declined');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('unverified_rule_matched');
  });

  it('never applies an expired rule and says so', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'hiv',
          criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
          result: 'decline',
          expirationDate: '2024-12-31',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'hiv.present': true }, { reportedConditions: ['hiv'] }), 'TX', ASOF);
    expect(outcome.status).toBe('requires_verification');
    expect(outcome.verificationReasons.map((r) => r.code)).toContain('expired_rule_matched');
  });

  it('never applies a rule before its effective date', () => {
    const b = bundle('a', {
      rules: [
        rule({
          conditionCode: 'hiv',
          criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
          result: 'decline',
          effectiveDate: '2027-01-01',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'hiv.present': true }, { reportedConditions: ['hiv'] }), 'TX', ASOF);
    expect(outcome.status).not.toBe('declined');
  });

  it('ignores an archived rule entirely', () => {
    const b = bundle('a', {
      benefitType: 'guaranteed_issue',
      rules: [
        rule({
          conditionCode: 'hiv',
          criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
          result: 'decline',
          verificationStatus: 'archived',
        }),
      ],
    });
    const outcome = classify(b, facts({ 'hiv.present': true }, { reportedConditions: ['hiv'] }), 'TX', ASOF);
    expect(outcome.status).toBe('eligible');
  });

  it('ignores a rule scoped to a different state', () => {
    const b = bundle('a', {
      rules: [
        rule({
          stateCode: 'FL',
          conditionCode: 'hiv',
          criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
          result: 'decline',
        }),
      ],
    });
    expect(classify(b, facts({ 'hiv.present': true }), 'TX', ASOF).status).toBe('eligible');
    expect(classify(b, facts({ 'hiv.present': true }), 'FL', ASOF).status).toBe('declined');
  });
});

describe('medication rules', () => {
  it('applies a verified medication rule from the client’s medication list', () => {
    const b = bundle('a', {
      medicationRules: [
        {
          id: 1,
          carrierId: 1,
          productId: null,
          medicationName: 'aricept',
          impliesConditionCode: 'neurological',
          result: 'decline',
          benefitClassification: null,
          explanation: 'FICTIONAL: Aricept indicates cognitive impairment.',
          sourcePage: 'p.1',
          sourceDocumentTitle: 'FICTIONAL Rx guide',
          effectiveDate: '2020-01-01',
          expirationDate: null,
          ruleVersion: 1,
          verificationStatus: 'verified',
          isFictionalSample: true,
        },
      ],
    });
    const outcome = classify(b, facts({ 'medications.list': ['lisinopril', 'aricept'] }), 'TX', ASOF);
    expect(outcome.status).toBe('declined');
    expect(outcome.driver?.explanation).toContain('Aricept');
  });

  it('ignores a draft medication rule', () => {
    const b = bundle('a', {
      medicationRules: [
        {
          id: 2,
          carrierId: 1,
          productId: null,
          medicationName: 'aricept',
          impliesConditionCode: 'neurological',
          result: 'decline',
          benefitClassification: null,
          explanation: 'FICTIONAL draft rule.',
          sourcePage: null,
          sourceDocumentTitle: null,
          effectiveDate: '2020-01-01',
          expirationDate: null,
          ruleVersion: 1,
          verificationStatus: 'draft',
          isFictionalSample: true,
        },
      ],
    });
    const outcome = classify(b, facts({ 'medications.list': ['aricept'] }), 'TX', ASOF);
    expect(outcome.status).toBe('requires_verification');
  });
});
