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
import { loadTransamerica } from '@/db/carriers/load-more';
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
      expect(quote.options).toHaveLength(0);
      expect(quote.unavailable[0].exclusions.map((e) => e.code)).toContain('state_unavailable');
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
    expect(quote.best?.productSlug).toBe('fe-express-solution');
    expect(quote.best?.monthlyPremium).toBeGreaterThan(0);
    expect(quote.backup?.productSlug).toBe('graded-fe-express-solution');
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
    expect(quote.options.map((o) => o.productSlug)).toEqual(['fe-express-solution']);
  });
});
