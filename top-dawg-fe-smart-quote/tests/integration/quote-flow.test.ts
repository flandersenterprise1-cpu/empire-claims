/**
 * End-to-end quote flow against a real database, using the FICTIONAL demo
 * carrier. Every premium and underwriting decision asserted here is invented
 * test data, not a real carrier's rate or rule.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import type postgres from 'postgres';
import { loadActiveQuestions } from '@/modules/catalog/repository';
import {
  createQuoteSession,
  generateSuperQuote,
  getQuoteSession,
  saveHealthAnswers,
} from '@/modules/quote/service';
import { describeIfDb, setupTestDb } from './helpers';

const ASOF = '2026-06-01';

/** A healthy client answers "no" to every gate. FICTIONAL sample client. */
const HEALTHY_ANSWERS: Record<string, unknown> = {
  confinement_present: false,
  adl_present: false,
  pending_tests_present: false,
  cardiac_present: false,
  cancer_present: false,
  diabetes_present: false,
  respiratory_present: false,
  kidney_present: false,
  liver_present: false,
  neurological_present: false,
  hiv_present: false,
  transplant_present: false,
  mental_health_present: false,
  substance_present: false,
  build_height_weight: { feet: 5, inches: 6, pounds: 150 },
  medications_present: false,
};

describeIfDb('quote flow (FICTIONAL sample carrier)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const created = await setupTestDb();
    db = created.db;
    sql = created.sql;
  }, 120_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function quoteFor(
    basics: {
      stateCode: string;
      age: number;
      sex: 'male' | 'female';
      tobaccoUse: boolean;
      faceAmount: number;
      monthlyBudget?: number | null;
    },
    answers: Record<string, unknown>,
  ) {
    const session = await createQuoteSession(db, { monthlyBudget: null, ...basics });
    await saveHealthAnswers(db, session.id, answers);
    const reloaded = await getQuoteSession(db, session.id);
    return generateSuperQuote(db, reloaded!, { asOf: ASOF });
  }

  it('gives a healthy 62-year-old a strong level match with a graded backup', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 62, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );

    expect(quote.best?.category).toBe('strong_level');
    expect(quote.best?.benefitType).toBe('level');
    expect(quote.best?.monthlyPremium).toBeGreaterThan(0);
    expect(quote.backup).not.toBeNull();
    expect(quote.options.map((o) => o.benefitType)).toEqual([
      'level',
      'graded',
      'guaranteed_issue',
    ]);
    expect(quote.containsFictionalSampleData).toBe(true);
  });

  it('charges a tobacco client more than a non-tobacco client', async () => {
    const nonTobacco = await quoteFor(
      { stateCode: 'TX', age: 62, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );
    const tobacco = await quoteFor(
      { stateCode: 'TX', age: 62, sex: 'female', tobaccoUse: true, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );
    expect(tobacco.quote.best!.monthlyPremium!).toBeGreaterThan(
      nonTobacco.quote.best!.monthlyPremium!,
    );
  });

  it('classifies a long-term insulin diabetic as graded and blocks the level plan', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 68, sex: 'male', tobaccoUse: false, faceAmount: 10000 },
      {
        ...HEALTHY_ANSWERS,
        diabetes_present: true,
        diabetes_treatment: 'insulin',
        diabetes_diagnosis_age: 25,
        diabetes_insulin_start_months: 480,
        diabetes_insulin_start_age: 25,
        diabetes_complications: ['neuropathy'],
      },
    );

    expect(quote.best?.benefitType).toBe('graded');
    const level = quote.options.find((o) => o.benefitType === 'level');
    expect(level?.category).toBe('do_not_submit');
    expect(level?.recommendation).toContain('insulin started before age 30');
  });

  it('keeps a pill-controlled diabetic at a level benefit', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 64, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      {
        ...HEALTHY_ANSWERS,
        diabetes_present: true,
        diabetes_treatment: 'pills',
        diabetes_diagnosis_age: 58,
        diabetes_complications: ['none'],
      },
    );
    expect(quote.best?.category).toBe('strong_level');
  });

  it('blocks every plan, including guaranteed issue, for a confined client', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 70, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      { ...HEALTHY_ANSWERS, confinement_present: true, confinement_type: 'nursing_home' },
    );
    expect(quote.best).toBeNull();
    expect(quote.backup).toBeNull();
    expect(quote.options.every((o) => o.category === 'do_not_submit')).toBe(true);
  });

  it('returns "requires verification" instead of guessing when follow-ups are unanswered', async () => {
    const { quote, interview } = await quoteFor(
      { stateCode: 'TX', age: 65, sex: 'male', tobaccoUse: false, faceAmount: 10000 },
      { ...HEALTHY_ANSWERS, diabetes_present: true },
    );

    expect(interview.complete).toBe(false);
    const level = quote.options.find((o) => o.benefitType === 'level');
    expect(level?.category).toBe('requires_verification');
    // Guaranteed issue asks no health questions, so it stays quotable.
    expect(quote.options.find((o) => o.benefitType === 'guaranteed_issue')?.category).toBe(
      'guaranteed_issue_only',
    );
  });

  it('offers nothing in a state the product is not filed in', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'NY', age: 62, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );
    expect(quote.options).toHaveLength(0);
    expect(quote.unavailable.length).toBeGreaterThan(0);
    expect(quote.unavailable[0].exclusions[0].code).toBe('state_unavailable');
  });

  it('applies the age-banded face cap on the level plan', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 78, sex: 'male', tobaccoUse: false, faceAmount: 20000 },
      HEALTHY_ANSWERS,
    );
    const level = quote.unavailable.find((o) => o.benefitType === 'level');
    expect(level?.exclusions.map((e) => e.code)).toContain('face_above_maximum');
  });

  it('excludes a client outside the issue-age range', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 45, sex: 'male', tobaccoUse: false, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );
    expect(quote.options).toHaveLength(0);
    expect(
      quote.unavailable.every((o) => o.exclusions.some((e) => e.code === 'age_out_of_range')),
    ).toBe(true);
  });

  it('flags a medication that implies an undisclosed condition', async () => {
    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 70, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      { ...HEALTHY_ANSWERS, medications_present: true, medications_list: ['Aricept', 'lisinopril'] },
    );
    const level = quote.options.find((o) => o.benefitType === 'level');
    expect(level?.category).toBe('do_not_submit');
    expect(level?.recommendation).toContain('Aricept');
  });

  it('stores no identifying client information on the quote session', async () => {
    const session = await createQuoteSession(db, {
      stateCode: 'TX',
      age: 62,
      sex: 'female',
      tobaccoUse: false,
      faceAmount: 10000,
      monthlyBudget: null,
    });
    const columns = Object.keys(session);
    for (const forbidden of ['name', 'firstName', 'lastName', 'ssn', 'email', 'phone', 'dateOfBirth']) {
      expect(columns).not.toContain(forbidden);
    }
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('discards answers whose question is no longer visible', async () => {
    const session = await createQuoteSession(db, {
      stateCode: 'TX',
      age: 62,
      sex: 'female',
      tobaccoUse: false,
      faceAmount: 10000,
      monthlyBudget: null,
    });
    await saveHealthAnswers(db, session.id, {
      ...HEALTHY_ANSWERS,
      diabetes_present: true,
      diabetes_treatment: 'insulin',
    });
    const corrected = await saveHealthAnswers(db, session.id, {
      ...HEALTHY_ANSWERS,
      diabetes_present: false,
      diabetes_treatment: 'insulin',
    });
    expect(corrected.healthAnswers).not.toHaveProperty('diabetes_treatment');
  });

  it('ignores answer keys that are not real questions', async () => {
    const session = await createQuoteSession(db, {
      stateCode: 'TX',
      age: 62,
      sex: 'female',
      tobaccoUse: false,
      faceAmount: 10000,
      monthlyBudget: null,
    });
    const saved = await saveHealthAnswers(db, session.id, {
      ...HEALTHY_ANSWERS,
      client_ssn: '000-00-0000',
      client_name: 'Not stored',
    });
    expect(saved.healthAnswers).not.toHaveProperty('client_ssn');
    expect(saved.healthAnswers).not.toHaveProperty('client_name');
  });

  it('keeps the seeded real carriers inactive so they cannot be quoted', async () => {
    const questions = await loadActiveQuestions(db);
    expect(questions.length).toBeGreaterThan(20);

    const { quote } = await quoteFor(
      { stateCode: 'TX', age: 62, sex: 'female', tobaccoUse: false, faceAmount: 10000 },
      HEALTHY_ANSWERS,
    );
    const names = [...quote.options, ...quote.unavailable].map((o) => o.carrierName);
    for (const real of ['Mutual of Omaha', 'Aflac', 'CICA Life', 'AIG / Corebridge']) {
      expect(names).not.toContain(real);
    }
  });
});
