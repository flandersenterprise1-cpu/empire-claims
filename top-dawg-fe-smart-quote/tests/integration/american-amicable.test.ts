/**
 * American Amicable — Senior Choice, loaded from the real Agent Guide
 * form 3079(9/23).
 *
 * Unlike the fictional demo carrier, these are REAL published rates and REAL
 * underwriting rules. The premium assertions are the carrier's own worked
 * examples, printed on Agent Guide pages 21-23.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadAmericanAmicable } from '@/db/carriers/load';
import { AMAM_UNAPPROVED_STATES } from '@/db/carriers/american-amicable';
import { loadActiveQuestions, loadQuoteCatalog } from '@/modules/catalog/repository';
import { extractFacts, type AnswerMap } from '@/modules/questionnaire';
import { findRate } from '@/modules/engine/rates';
import { classify } from '@/modules/engine/underwriting';
import { runSuperQuote } from '@/modules/engine';
import type { FactSet } from '@/modules/engine/types';
import { describeIfDb, setupTestDb } from './helpers';
import { HEALTHY_ANSWERS } from '../fixtures/healthy-answers';

const ASOF = '2026-06-01';

let questions: Awaited<ReturnType<typeof loadActiveQuestions>> = [];

/** Builds facts exactly the way the application does, from interview answers. */
function factsFrom(answers: AnswerMap): FactSet {
  return extractFacts(questions, answers);
}

describeIfDb('American Amicable Senior Choice (real carrier data)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    // No fictional demo carrier here — this suite asserts on real carrier data.
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadAmericanAmicable(db, null);
    questions = await loadActiveQuestions(db);

    // Simulate an administrator verifying and publishing the module.
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'american-amicable'))
      .limit(1);
    await db
      .update(schema.carriers)
      .set({ status: 'active', isVerified: true })
      .where(eq(schema.carriers.id, carrier.id));
    await db
      .update(schema.products)
      .set({ status: 'active' })
      .where(eq(schema.products.carrierId, carrier.id));
    await db
      .update(schema.underwritingRules)
      .set({ verificationStatus: 'verified' })
      .where(eq(schema.underwritingRules.carrierId, carrier.id));

    const productRows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.carrierId, carrier.id));
    for (const product of productRows) {
      await db
        .update(schema.rateTables)
        .set({ status: 'published' })
        .where(eq(schema.rateTables.productId, product.id));
    }
  }, 180_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function bundleFor(slug: string, age: number, faceAmount: number) {
    const bundles = await loadQuoteCatalog(db, {
      stateCode: 'TX',
      age,
      faceAmount,
      asOf: ASOF,
    });
    return bundles.find((b) => b.product.slug === slug)!;
  }

  /* ----------------------- The carrier's own examples --------------------- */

  it('reproduces the Immediate example: female non-tobacco 65, $7,000 = $33.73/mo', async () => {
    const bundle = await bundleFor('senior-choice-immediate', 65, 7000);
    const rate = findRate(
      bundle,
      { stateCode: 'TX', age: 65, sex: 'female', tobaccoUse: false, faceAmount: 7000, monthlyBudget: null },
      ASOF,
    );
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(33.73);
  });

  it('reproduces the Graded example: male non-tobacco 65, $10,000 = $76.06/mo', async () => {
    const bundle = await bundleFor('senior-choice-graded', 65, 10000);
    const rate = findRate(
      bundle,
      { stateCode: 'TX', age: 65, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      ASOF,
    );
    expect(rate.monthlyPremium).toBe(76.06);
  });

  it('reproduces the Return of Premium example: male non-tobacco 65, $10,000 = $90.42/mo', async () => {
    const bundle = await bundleFor('senior-choice-rop', 65, 10000);
    const rate = findRate(
      bundle,
      { stateCode: 'TX', age: 65, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      ASOF,
    );
    expect(rate.monthlyPremium).toBe(90.42);
  });

  it('charges a tobacco client the published tobacco rate', async () => {
    const bundle = await bundleFor('senior-choice-immediate', 65, 10000);
    const base = { stateCode: 'TX', age: 65, sex: 'male' as const, faceAmount: 10000, monthlyBudget: null };
    const nt = findRate(bundle, { ...base, tobaccoUse: false }, ASOF);
    const t = findRate(bundle, { ...base, tobaccoUse: true }, ASOF);
    // (64.89 x 10 + 30) x .088 and (83.43 x 10 + 30) x .088
    expect(nt.monthlyPremium).toBe(59.744 < 0 ? 0 : Math.round((64.89 * 10 + 30) * 0.088 * 100) / 100);
    expect(t.monthlyPremium).toBe(Math.round((83.43 * 10 + 30) * 0.088 * 100) / 100);
    expect(t.monthlyPremium!).toBeGreaterThan(nt.monthlyPremium!);
  });

  /* --------------------------- Plan routing ------------------------------ */

  it('routes an all-No client to the Immediate (level) plan', async () => {
    const bundle = await bundleFor('senior-choice-immediate', 65, 10000);
    const outcome = classify(bundle, factsFrom(HEALTHY_ANSWERS), 'TX', ASOF);
    expect(outcome.status).toBe('eligible');
    expect(outcome.ceiling).toBe('level');
  });

  it('declines every plan when question 1 is answered Yes (confinement)', async () => {
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 70, sex: 'female', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom({ ...HEALTHY_ANSWERS, confinement_present: true, confinement_type: 'nursing_home' }),
      asOf: ASOF,
      bundles: await loadQuoteCatalog(db, { stateCode: 'TX', age: 70, faceAmount: 10000, asOf: ASOF }),
    });
    expect(quote.best).toBeNull();
    expect(quote.options.every((o) => o.category === 'do_not_submit')).toBe(true);
    expect(quote.options[0].recommendation).toContain('question 1');
  });

  it('declines every plan for dialysis (question 2)', async () => {
    const bundle = await bundleFor('senior-choice-immediate', 65, 10000);
    const outcome = classify(
      bundle,
      factsFrom({ ...HEALTHY_ANSWERS, kidney_present: true, kidney_dialysis: true, kidney_stage: 'stage_5' }),
      'TX',
      ASOF,
    );
    expect(outcome.status).toBe('declined');
    expect(outcome.driver?.explanation).toContain('question 2');
  });

  it('routes a 30-month-old cardiac event to the Graded plan (question 8)', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 68, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 68, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom({
        ...HEALTHY_ANSWERS,
        cardiac_present: true,
        cardiac_events: ['heart_attack'],
        cardiac_last_event_months: 30,
        cardiac_multiple_events: false,
      }),
      asOf: ASOF,
      bundles,
    });
    expect(quote.best?.benefitType).toBe('graded');
    // The level plan cannot issue a graded client.
    expect(quote.options.find((o) => o.benefitType === 'level')?.category).toBe('do_not_submit');
  });

  it('routes a 12-month-old cardiac event to the Return of Premium plan (question 7)', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 68, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 68, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom({
        ...HEALTHY_ANSWERS,
        cardiac_present: true,
        cardiac_events: ['heart_attack'],
        cardiac_last_event_months: 12,
        cardiac_multiple_events: false,
      }),
      asOf: ASOF,
      bundles,
    });
    expect(quote.best?.benefitType).toBe('modified');
    expect(quote.best?.recommendation).toContain('question 7');
  });

  it('routes insulin started before age 50 to the Return of Premium plan (question 4)', async () => {
    const bundle = await bundleFor('senior-choice-immediate', 66, 10000);
    const outcome = classify(
      bundle,
      factsFrom({
        ...HEALTHY_ANSWERS,
        diabetes_present: true,
        diabetes_treatment: 'insulin',
        diabetes_diagnosis_age: 40,
        diabetes_insulin_start_months: 300,
        diabetes_insulin_start_age: 42,
        diabetes_complications: ['none'],
      }),
      'TX',
      ASOF,
    );
    expect(outcome.ceiling).toBe('modified');
  });

  /* ---------------------------- Issue limits ----------------------------- */

  it('caps the Immediate plan at $25,000 for ages 76-85', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 78, faceAmount: 40000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 78, sex: 'male', tobaccoUse: false, faceAmount: 40000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    const immediate = quote.unavailable.find((o) => o.productSlug === 'senior-choice-immediate');
    expect(immediate?.exclusions.map((e) => e.code)).toContain('face_above_maximum');
  });

  it('allows $40,000 on the Immediate plan at age 70', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 70, faceAmount: 40000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 70, sex: 'male', tobaccoUse: false, faceAmount: 40000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    expect(quote.best?.productSlug).toBe('senior-choice-immediate');
    expect(quote.best?.monthlyPremium).toBe(Math.round((86.53 * 40 + 30) * 0.088 * 100) / 100);
  });

  it('excludes a client below the minimum issue age of 50', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 48, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 48, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    expect(quote.options).toHaveLength(0);
  });

  it('enforces the $5,000 Washington minimum', async () => {
    // Washington is approved on the state listing; the $5,000 minimum comes from
    // the age-banded face limits, not from state availability.
    const bundles = await loadQuoteCatalog(db, { stateCode: 'WA', age: 65, faceAmount: 3000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'WA', age: 65, sex: 'male', tobaccoUse: false, faceAmount: 3000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    const immediate = quote.unavailable.find((o) => o.productSlug === 'senior-choice-immediate');
    expect(immediate?.exclusions.map((e) => e.code)).toContain('face_below_minimum');
  });

  /* ------------------ State approval listing (form 3523) ------------------ */

  it('is approved in 46 of 51 states', async () => {
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'american-amicable'))
      .limit(1);
    const products = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.carrierId, carrier.id));
    for (const product of products) {
      const states = await db
        .select()
        .from(schema.productStates)
        .where(eq(schema.productStates.productId, product.id));
      expect(states.filter((s) => s.isAvailable)).toHaveLength(46);
      expect(states.filter((s) => !s.isAvailable).map((s) => s.stateCode).sort()).toEqual(
        [...AMAM_UNAPPROVED_STATES].sort(),
      );
    }
  });

  it.each(AMAM_UNAPPROVED_STATES)('offers nothing in %s', async (state) => {
    const bundles = await loadQuoteCatalog(db, { stateCode: state, age: 65, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: state, age: 65, sex: 'female', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    expect(quote.options).toHaveLength(0);
    expect(quote.unavailable.every((o) => o.exclusions.some((e) => e.code === 'state_unavailable'))).toBe(true);
  });

  it('quotes in an approved state', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'FL', age: 65, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'FL', age: 65, sex: 'female', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: factsFrom(HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    expect(quote.best?.productSlug).toBe('senior-choice-immediate');
    // (50.47 x 10 + 30) x .088 — the guide's own worked example rate at age 65.
    expect(quote.best?.monthlyPremium).toBe(Math.round((50.47 * 10 + 30) * 0.088 * 100) / 100);
  });
});
