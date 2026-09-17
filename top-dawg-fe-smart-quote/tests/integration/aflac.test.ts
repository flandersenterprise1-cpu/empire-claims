/**
 * Aflac Final Expense.
 *
 * The drug list marks each medication against Preferred, Standard and Modified
 * separately, and the whole reason for recovering those marks positionally was
 * that a medication ruling out Preferred often leaves a cheaper-benefit plan
 * open. These tests pin that behaviour, and pin that a condition-specific row
 * asks for verification instead of declining.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadAflac } from '@/db/carriers/load-more';
import { AFLAC_DRUG_RULES } from '@/db/carriers/aflac-drugs';
import { describeIfDb, setupTestDb } from './helpers';

describeIfDb('Aflac Final Expense (real carrier data)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let carrierId = 0;

  beforeAll(async () => {
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadAflac(db, null);
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'aflac'))
      .limit(1);
    carrierId = carrier.id;
  }, 180_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function productId(slug: string) {
    const [p] = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.carrierId, carrierId), eq(schema.products.slug, slug)))
      .limit(1);
    return p.id;
  }

  async function rulesFor(drug: string) {
    const rows = await db
      .select()
      .from(schema.medicationRules)
      .where(
        and(
          eq(schema.medicationRules.carrierId, carrierId),
          eq(schema.medicationRules.medicationName, drug.toLowerCase()),
        ),
      );
    return rows;
  }

  it('keeps a plan open when the drug list marks only the others', async () => {
    // Drug list p.10: ATTRUBY is marked for Preferred and Standard, not Modified.
    const rows = await rulesFor('ATTRUBY');
    const ids = rows.map((r) => r.productId);
    expect(ids).toContain(await productId('aflac-fe-preferred'));
    expect(ids).toContain(await productId('aflac-fe-standard'));
    expect(ids).not.toContain(await productId('aflac-fe-modified'));
  });

  it('marks a Preferred-only medication against Preferred alone', async () => {
    // Drug list p.10: ATROVENT is marked for Preferred only.
    const rows = await rulesFor('ATROVENT');
    expect(rows).toHaveLength(1);
    expect(rows[0].productId).toBe(await productId('aflac-fe-preferred'));
  });

  it('declines an "Any Condition" medication on every plan it is marked for', async () => {
    // Drug list p.10: AXONA is marked for all three final expense plans.
    const rows = await rulesFor('AXONA');
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.result).toBe('decline');
  });

  it('refers rather than declines when the mark is condition-specific', async () => {
    // Drug list p.25: DEMADEX is unacceptable only when prescribed for the
    // named conditions, which the interview does not establish.
    const rows = await rulesFor('DEMADEX (ANY AMOUNT)');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.result).toBe('refer');
      expect(row.explanation).toContain('underwriting verification');
    }
  });

  it('loads every rule as draft, citing the drug-list page', async () => {
    const rows = await db
      .select()
      .from(schema.medicationRules)
      .where(eq(schema.medicationRules.carrierId, carrierId));
    expect(rows.length).toBe(
      AFLAC_DRUG_RULES.reduce((n, [, , plans]) => n + plans.length, 0),
    );
    for (const row of rows.slice(0, 200)) {
      expect(row.verificationStatus).toBe('draft');
      expect(row.sourcePage).toMatch(/^p\.\d+$/);
      expect(row.productId).not.toBeNull();
    }
  });

  it('steps the level face maximum down with issue age and caps Modified lower', async () => {
    const bandsFor = async (slug: string) =>
      db
        .select()
        .from(schema.productFaceLimits)
        .where(eq(schema.productFaceLimits.productId, await productId(slug)));

    const level = await bandsFor('aflac-fe-preferred');
    expect(level.find((b) => b.minAge === 45)!.maxFaceAmount).toBe(50000);
    expect(level.find((b) => b.minAge === 56)!.maxFaceAmount).toBe(40000);
    expect(level.find((b) => b.minAge === 66)!.maxFaceAmount).toBe(30000);
    expect(level.find((b) => b.minAge === 76)!.maxFaceAmount).toBe(25000);

    const modified = await bandsFor('aflac-fe-modified');
    expect(modified).toHaveLength(1);
    expect(modified[0]).toMatchObject({ minAge: 45, maxAge: 75, maxFaceAmount: 25000 });
  });

  it('excludes New York and nothing else', async () => {
    const rows = await db
      .select()
      .from(schema.productStates)
      .where(eq(schema.productStates.productId, await productId('aflac-fe-preferred')));
    const blocked = rows.filter((r) => !r.isAvailable).map((r) => r.stateCode);
    expect(blocked).toEqual(['NY']);
  });
});
