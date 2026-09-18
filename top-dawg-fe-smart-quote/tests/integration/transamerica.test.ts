/**
 * Transamerica FE Express Solution — real carrier data.
 *
 * The premium assertion is the worked example printed on Agent Guide p.18.
 * State availability is asserted from the published exclusion list.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadTransamerica, loadTransamericaSolutionSeries } from '@/db/carriers/load-more';
import { loadActiveQuestions, loadQuoteCatalog } from '@/modules/catalog/repository';
import { findRate } from '@/modules/engine/rates';
import { runSuperQuote } from '@/modules/engine';
import { extractFacts } from '@/modules/questionnaire';
import { describeIfDb, setupTestDb } from './helpers';
import { HEALTHY_ANSWERS } from '../fixtures/healthy-answers';

const ASOF = '2026-06-01';

describeIfDb('Transamerica FE Express Solution (real carrier data)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let questions: Awaited<ReturnType<typeof loadActiveQuestions>> = [];

  beforeAll(async () => {
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadTransamerica(db, null);
    await loadTransamericaSolutionSeries(db, null);
    questions = await loadActiveQuestions(db);

    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'transamerica'))
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

  async function bundleFor(slug: string, stateCode: string, age: number, faceAmount: number) {
    const bundles = await loadQuoteCatalog(db, { stateCode, age, faceAmount, asOf: ASOF });
    return bundles.find((b) => b.product.slug === slug)!;
  }

  it('reproduces the guide example: male 55, Select Nonsmoker, $15,000 = $66.41/mo', async () => {
    const rate = findRate(
      await bundleFor('fe-express-solution', 'TX', 55, 15000),
      { stateCode: 'TX', age: 55, sex: 'male', tobaccoUse: false, faceAmount: 15000, monthlyBudget: null },
      ASOF,
    );
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(66.41);
  });

  it('charges the published tobacco rate', async () => {
    const base = { stateCode: 'TX', age: 55, sex: 'male' as const, faceAmount: 15000, monthlyBudget: null };
    const bundle = await bundleFor('fe-express-solution', 'TX', 55, 15000);
    const nt = findRate(bundle, { ...base, tobaccoUse: false }, ASOF);
    const t = findRate(bundle, { ...base, tobaccoUse: true }, ASOF);
    expect(t.monthlyPremium!).toBeGreaterThan(nt.monthlyPremium!);
  });

  it('excludes the states listed as unavailable in the Products At-A-Glance', async () => {
    for (const state of ['CA', 'NY', 'PA']) {
      const bundles = await loadQuoteCatalog(db, { stateCode: state, age: 60, faceAmount: 10000, asOf: ASOF });
      const quote = runSuperQuote({
        intake: { stateCode: state, age: 60, sex: 'female', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
        facts: extractFacts(questions, HEALTHY_ANSWERS),
        asOf: ASOF,
        bundles,
      });
      // The exclusion list applies to the FE Express products. The separate
      // Solution series has its own footprint and may still be available.
      for (const slug of ['fe-express-solution', 'graded-fe-express-solution']) {
        expect(quote.options.map((o) => o.productSlug)).not.toContain(slug);
        const blocked = quote.unavailable.find((o) => o.productSlug === slug);
        expect(blocked?.exclusions.map((e) => e.code)).toContain('state_unavailable');
      }
    }
  });

  it('quotes in a state that is not excluded', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 60, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 60, sex: 'female', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: extractFacts(questions, HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    // FE Express is quotable here and priced; it competes with the Solution
    // series on the same results screen.
    const fex = quote.options.find((o) => o.productSlug === 'fe-express-solution');
    expect(fex).toBeDefined();
    expect(fex!.monthlyPremium).toBeGreaterThan(0);
    expect(fex!.category).toBe('strong_level');
    expect(quote.best?.monthlyPremium).toBeGreaterThan(0);
    expect(quote.backup).not.toBeNull();
  });

  it('caps the level product at $25,000 for ages 76-85', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 78, faceAmount: 40000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 78, sex: 'male', tobaccoUse: false, faceAmount: 40000, monthlyBudget: null },
      facts: extractFacts(questions, HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    const level = quote.unavailable.find((o) => o.productSlug === 'fe-express-solution');
    expect(level?.exclusions.map((e) => e.code)).toContain('face_above_maximum');
  });

  it('excludes the graded product above its issue age of 80', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'TX', age: 83, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode: 'TX', age: 83, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: extractFacts(questions, HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    // Graded FE Express stops at issue age 80; the level product runs to 85.
    expect(quote.options.map((o) => o.productSlug)).toContain('fe-express-solution');
    expect(quote.options.map((o) => o.productSlug)).not.toContain('graded-fe-express-solution');
    expect(quote.unavailable.find((o) => o.productSlug === 'graded-fe-express-solution')
      ?.exclusions.map((e) => e.code)).toContain('age_out_of_range');
  });

  /* ------------------------- Solution series rates ------------------------ */

  it('reproduces the Solution guide example: Immediate Preferred male 35 non-tobacco, $15,000 = $29.15/mo', async () => {
    const rate = findRate(
      await bundleFor('immediate-solution-preferred', 'TX', 35, 15000),
      { stateCode: 'TX', age: 35, sex: 'male', tobaccoUse: false, faceAmount: 15000, monthlyBudget: null },
      ASOF,
    );
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(29.15);
  });

  it('charges the higher policy fee below the $5,000 face threshold', async () => {
    const base = { stateCode: 'TX', age: 35, sex: 'male' as const, tobaccoUse: false, monthlyBudget: null };
    const low = findRate(
      await bundleFor('immediate-solution-preferred', 'TX', 35, 4000),
      { ...base, faceAmount: 4000 },
      ASOF,
    );
    const high = findRate(
      await bundleFor('immediate-solution-preferred', 'TX', 35, 5000),
      { ...base, faceAmount: 5000 },
      ASOF,
    );
    expect(low.monthlyPolicyFee).toBe(5);
    expect(high.monthlyPolicyFee).toBe(3.5);
    // round(20.08 x 0.085) = 1.71 -> x4 + 5.00, and x5 + 3.50
    expect(low.monthlyPremium).toBe(Math.round((1.71 * 4 + 5) * 100) / 100);
    expect(high.monthlyPremium).toBe(Math.round((1.71 * 5 + 3.5) * 100) / 100);
  });

  it('uses the Montana unisex table in Montana and the sexed table elsewhere', async () => {
    const mtMale = findRate(
      await bundleFor('immediate-solution-preferred', 'MT', 35, 15000),
      { stateCode: 'MT', age: 35, sex: 'male', tobaccoUse: false, faceAmount: 15000, monthlyBudget: null },
      ASOF,
    );
    const mtFemale = findRate(
      await bundleFor('immediate-solution-preferred', 'MT', 35, 15000),
      { stateCode: 'MT', age: 35, sex: 'female', tobaccoUse: false, faceAmount: 15000, monthlyBudget: null },
      ASOF,
    );
    // Montana is unisex, so the two must match.
    expect(mtMale.monthlyPremium).toBe(mtFemale.monthlyPremium);

    const txFemale = findRate(
      await bundleFor('immediate-solution-preferred', 'TX', 35, 15000),
      { stateCode: 'TX', age: 35, sex: 'female', tobaccoUse: false, faceAmount: 15000, monthlyBudget: null },
      ASOF,
    );
    // Outside Montana women are rated separately and cost less at this age.
    expect(txFemale.monthlyPremium!).toBeLessThan(mtFemale.monthlyPremium!);
  });

  it('marks the Standard tables unavailable in Washington', async () => {
    const bundles = await loadQuoteCatalog(db, { stateCode: 'WA', age: 60, faceAmount: 10000, asOf: ASOF });
    const standard = bundles.find((b) => b.product.slug === 'immediate-solution-standard');
    expect(standard).toBeDefined();
    const quote = runSuperQuote({
      intake: { stateCode: 'WA', age: 60, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: extractFacts(questions, HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    const blocked = quote.unavailable.find((o) => o.productSlug === 'immediate-solution-standard');
    expect(blocked?.exclusions.map((e) => e.code)).toContain('state_unavailable');
  });

  it('prices Easy Solution the same for a tobacco and non-tobacco client', async () => {
    const base = { stateCode: 'TX', age: 60, sex: 'female' as const, faceAmount: 10000, monthlyBudget: null };
    const bundle = await bundleFor('easy-solution', 'TX', 60, 10000);
    const nt = findRate(bundle, { ...base, tobaccoUse: false }, ASOF);
    const t = findRate(bundle, { ...base, tobaccoUse: true }, ASOF);
    expect(nt.status).toBe('found');
    expect(t.monthlyPremium).toBe(nt.monthlyPremium);
  });
  /* ------------- Adult Single Condition Decision Chart pp.10-13 ------------ */

  async function categoriesFor(extra: Record<string, unknown>) {
    const intake = {
      stateCode: 'TX',
      age: 60,
      sex: 'male' as const,
      tobaccoUse: false,
      faceAmount: 10000,
      monthlyBudget: null,
    };
    const bundles = await loadQuoteCatalog(db, {
      stateCode: intake.stateCode,
      age: intake.age,
      faceAmount: intake.faceAmount,
      asOf: ASOF,
    });
    const quote = runSuperQuote({
      intake,
      facts: extractFacts(questions, { ...HEALTHY_ANSWERS, ...extra }),
      asOf: ASOF,
      bundles,
    });
    const category = (slug: string) =>
      quote.options.find((o) => o.productSlug === slug)?.category ??
      quote.unavailable.find((o) => o.productSlug === slug)?.exclusions.map((e) => e.code).join(',');
    return {
      level: category('fe-express-solution'),
      graded: category('graded-fe-express-solution'),
      quote,
    };
  }

  it('declines Alzheimer\u2019s on both Express plans', async () => {
    const { level, graded, quote } = await categoriesFor({
      neurological_present: true,
      neurological_conditions: ['alzheimers'],
      neurological_diagnosed_months: 30,
    });
    expect(level).toBe('do_not_submit');
    expect(graded).toBe('do_not_submit');

    const driver = quote.options.find((o) => o.productSlug === 'fe-express-solution')!.trace[0];
    expect(driver.conditionCode).toBe('neurological');
    expect(driver.result).toBe('decline');
    expect(driver.sourcePage).toBe('pp.10-12');
  });

  it('grades cancer whose treatment finished 2-4 years ago', async () => {
    const { level, graded } = await categoriesFor({
      cancer_present: true,
      cancer_type: 'breast',
      cancer_treatment_status: 'completed',
      cancer_diagnosed_months: 48,
      cancer_last_treatment_months: 30,
    });
    expect(level).toBe('do_not_submit');
    expect(graded).toBe('likely_graded');
  });

  it('leaves the level plan open when cancer treatment is 4+ years past', async () => {
    const { level } = await categoriesFor({
      cancer_present: true,
      cancer_type: 'breast',
      cancer_treatment_status: 'completed',
      cancer_diagnosed_months: 90,
      cancer_last_treatment_months: 72,
      cancer_recurrence: false,
    });
    expect(level).toBe('strong_level');
  });

  it('applies the Adult Build Chart BMI bands from p.13', async () => {
    // 5'8" / 170 lb = BMI 25.8 -> inside the 18.500-46.000 Select band.
    expect((await categoriesFor({})).level).toBe('strong_level');

    // 5'8" / 310 lb = BMI 47.1 -> the 46.001-48.000 Graded band.
    const heavy = await categoriesFor({ build_height_weight: { feet: 5, inches: 8, pounds: 310 } });
    expect(heavy.level).toBe('do_not_submit');
    expect(heavy.graded).toBe('likely_graded');

    // 5'8" / 330 lb = BMI 50.2 -> above 48.000, declined on both plans.
    const overweight = await categoriesFor({ build_height_weight: { feet: 5, inches: 8, pounds: 330 } });
    expect(overweight.level).toBe('do_not_submit');
    expect(overweight.graded).toBe('do_not_submit');
  });
});
