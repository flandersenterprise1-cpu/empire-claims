/**
 * CSV import → draft → publish, and the guarantee that a draft rate can never
 * reach an agent. All rates here are FICTIONAL test data.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { listAudit } from '@/modules/audit';
import { loadQuoteCatalog } from '@/modules/catalog/repository';
import { findRate } from '@/modules/engine/rates';
import { importRateCsv, publishRateTable } from '@/modules/rates/import';
import { describeIfDb, setupTestDb } from './helpers';

const ACTOR = { id: 1, email: 'admin@topdawg.local' };
const ASOF = '2026-06-01';

const INTAKE = {
  stateCode: 'TX',
  age: 66,
  sex: 'female' as const,
  tobaccoUse: false,
  faceAmount: 12000,
  monthlyBudget: null,
};

describeIfDb('rate table import and publishing', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let productId: number;

  beforeAll(async () => {
    const created = await setupTestDb();
    db = created.db;
    sql = created.sql;

    // A fresh FICTIONAL product with no rates at all.
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'sample-mutual-fictional'))
      .limit(1);

    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: 'sample-import-target',
        name: 'Sample Import Target (FICTIONAL)',
        benefitType: 'level',
        status: 'active',
        minFaceAmount: 3000,
        maxFaceAmount: 25000,
        faceIncrement: 1000,
        minAge: 50,
        maxAge: 85,
        tobaccoClasses: ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
      })
      .returning();
    productId = product.id;

    await db.insert(schema.productStates).values({
      productId,
      stateCode: 'TX',
      isAvailable: true,
    });
  }, 120_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function bundleForProduct() {
    const bundles = await loadQuoteCatalog(db, {
      stateCode: 'TX',
      age: INTAKE.age,
      faceAmount: INTAKE.faceAmount,
      asOf: ASOF,
    });
    return bundles.find((b) => b.product.id === productId)!;
  }

  it('shows "Rate unavailable" before any rate table exists', async () => {
    const rate = findRate(await bundleForProduct(), INTAKE, ASOF);
    expect(rate.status).toBe('unavailable');
    expect(rate.monthlyPremium).toBeUndefined();
  });

  let rateTableId: number;

  it('imports a CSV as a draft table and records the audit entry', async () => {
    const csv = [
      'age,sex,tobacco_class,face_amount,monthly_premium',
      '66,female,non_tobacco,12000,51.25',
      '66,female,tobacco,12000,74.10',
      '66,male,non_tobacco,12000,58.40',
    ].join('\n');

    const result = await importRateCsv(
      db,
      csv,
      {
        productId,
        benefitType: 'level',
        effectiveDate: '2026-01-01',
        filename: 'fictional-rates.csv',
        monthlyPolicyFee: 1.5,
      },
      ACTOR,
    );

    expect(result.status).toBe('draft');
    expect(result.accepted).toBe(3);
    expect(result.rejected).toBe(0);
    rateTableId = result.rateTableId!;

    const [table] = await db
      .select()
      .from(schema.rateTables)
      .where(eq(schema.rateTables.id, rateTableId))
      .limit(1);
    expect(table.status).toBe('draft');

    const audit = await listAudit(db, { entityType: 'rate_table', entityId: String(rateTableId) });
    expect(audit[0].action).toBe('rate_table.import');
  });

  it('keeps an imported draft table invisible to the rate engine', async () => {
    expect(findRate(await bundleForProduct(), INTAKE, ASOF).status).toBe('unavailable');
  });

  it('serves the exact premium, plus the policy fee, once the table is published', async () => {
    await publishRateTable(db, rateTableId, ACTOR);

    const rate = findRate(await bundleForProduct(), INTAKE, ASOF);
    expect(rate.status).toBe('found');
    expect(rate.monthlyPremium).toBe(52.75); // 51.25 + 1.50 fee
    expect(rate.rateTableVersion).toBe(1);
  });

  it('still reports unavailable for a face amount the table does not cover', async () => {
    const bundles = await loadQuoteCatalog(db, {
      stateCode: 'TX',
      age: 66,
      faceAmount: 13000,
      asOf: ASOF,
    });
    const bundle = bundles.find((b) => b.product.id === productId)!;
    const rate = findRate(bundle, { ...INTAKE, faceAmount: 13000 }, ASOF);
    expect(rate.status).toBe('unavailable');
  });

  it('archives the superseded table when a newer version is published', async () => {
    const csv = [
      'age,sex,tobacco_class,face_amount,monthly_premium',
      '66,female,non_tobacco,12000,55.00',
    ].join('\n');

    const result = await importRateCsv(
      db,
      csv,
      { productId, benefitType: 'level', effectiveDate: '2026-03-01', filename: 'v2.csv' },
      ACTOR,
    );
    await publishRateTable(db, result.rateTableId!, ACTOR);

    const tables = await db
      .select()
      .from(schema.rateTables)
      .where(eq(schema.rateTables.productId, productId));

    // Nothing is deleted: the old version is archived, the new one is live.
    expect(tables.find((t) => t.id === rateTableId)?.status).toBe('archived');
    expect(tables.find((t) => t.id === result.rateTableId)?.status).toBe('published');

    const rate = findRate(await bundleForProduct(), INTAKE, ASOF);
    expect(rate.monthlyPremium).toBe(55);
  });

  it('rejects a malformed CSV outright and creates no rate table', async () => {
    const before = await db
      .select()
      .from(schema.rateTables)
      .where(eq(schema.rateTables.productId, productId));

    const result = await importRateCsv(
      db,
      'age,sex,tobacco_class,face_amount,monthly_premium\nnot-an-age,female,non_tobacco,12000,51.25',
      { productId, benefitType: 'level', effectiveDate: '2026-01-01', filename: 'bad.csv' },
      ACTOR,
    );

    expect(result.status).toBe('failed');
    expect(result.rateTableId).toBeNull();
    expect(result.errors[0].message).toContain('Invalid age');

    const after = await db
      .select()
      .from(schema.rateTables)
      .where(eq(schema.rateTables.productId, productId));
    expect(after).toHaveLength(before.length);
  });
});
