/**
 * Combined Insurance — Generational Life.
 *
 * This carrier is deliberately NOT quotable yet: the Producer Guide publishes
 * annual rates per $1,000 but no annual-to-monthly modal factor, and it rates on
 * age nearest birthday, which the intake does not yet capture. These tests pin
 * the two safety behaviours that follow from that.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadCombinedInsurance } from '@/db/carriers/load';
import { loadQuoteCatalog } from '@/modules/catalog/repository';
import { findRate } from '@/modules/engine/rates';
import { describeIfDb, setupTestDb } from './helpers';

const ASOF = '2026-06-01';
const INTAKE = {
  stateCode: 'TX',
  age: 65,
  sex: 'male' as const,
  tobaccoUse: false,
  faceAmount: 10000,
  monthlyBudget: null,
};

describeIfDb('Combined Insurance Generational Life', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadCombinedInsurance(db, null);

    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'combined-insurance'))
      .limit(1);
    await db
      .update(schema.carriers)
      .set({ status: 'active', isVerified: true })
      .where(eq(schema.carriers.id, carrier.id));
    const productRows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.carrierId, carrier.id));
    for (const product of productRows) {
      await db.update(schema.products).set({ status: 'active' }).where(eq(schema.products.id, product.id));
      await db
        .update(schema.rateTables)
        .set({ status: 'published' })
        .where(eq(schema.rateTables.productId, product.id));
      await db
        .insert(schema.productStates)
        .values({ productId: product.id, stateCode: 'TX', isAvailable: true });
    }
  }, 180_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function bundle(slug: string) {
    const bundles = await loadQuoteCatalog(db, {
      stateCode: 'TX',
      age: INTAKE.age,
      faceAmount: INTAKE.faceAmount,
      asOf: ASOF,
    });
    return bundles.find((b) => b.product.slug === slug)!;
  }

  it('refuses to quote on age last birthday when the product rates on nearest age', async () => {
    const rate = findRate(await bundle('generational-life-preferred'), INTAKE, ASOF);
    expect(rate.status).toBe('unavailable');
    expect(rate.reason).toContain('age nearest birthday');
  });

  it('still refuses once a nearest-birthday age is supplied, because no modal factor is published', async () => {
    const rate = findRate(
      await bundle('generational-life-preferred'),
      { ...INTAKE, ageNearestBirthday: 65 },
      ASOF,
    );
    expect(rate.status).toBe('unavailable');
    expect(rate.monthlyPremium).toBeUndefined();
  });

  it('produces the carrier premium as soon as the published modal factor is entered', async () => {
    // An administrator entering the factor is the only thing standing between
    // the stored rates and a real quote.
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, 'generational-life-preferred'))
      .limit(1);
    await db
      .update(schema.rateTables)
      .set({ monthlyModalFactor: '0.0875' })
      .where(eq(schema.rateTables.productId, product.id));

    const rate = findRate(
      await bundle('generational-life-preferred'),
      { ...INTAKE, ageNearestBirthday: 65 },
      ASOF,
    );
    expect(rate.status).toBe('found');
    // Age 65 Preferred non-tobacco male = 68.38 per $1,000, $50 annual fee.
    expect(rate.monthlyPremium).toBe(Math.round((68.38 * 10 + 50) * 0.0875 * 100) / 100);

    await db
      .update(schema.rateTables)
      .set({ monthlyModalFactor: null })
      .where(eq(schema.rateTables.productId, product.id));
  });

  it('stores all four rating classes so the agent can see the price range', async () => {
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'combined-insurance'))
      .limit(1);
    const productRows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.carrierId, carrier.id));
    expect(productRows.map((p) => p.slug).sort()).toEqual([
      'generational-life-graded',
      'generational-life-preferred',
      'generational-life-standard',
      'generational-life-substandard',
    ]);
  });

  it('rules out the Preferred class for a medication the guide restricts', async () => {
    const [rule] = await db
      .select()
      .from(schema.medicationRules)
      .where(eq(schema.medicationRules.medicationName, 'abilify'))
      .limit(1);
    expect(rule.result).toBe('decline');
    expect(rule.explanation).toContain('Preferred class is ruled out');
  });

  it('classifies a Graded-only medication as graded across the carrier', async () => {
    const [rule] = await db
      .select()
      .from(schema.medicationRules)
      .where(eq(schema.medicationRules.medicationName, 'aricept'))
      .limit(1);
    expect(rule.result).toBe('graded');
    expect(rule.productId).toBeNull();
  });
});
