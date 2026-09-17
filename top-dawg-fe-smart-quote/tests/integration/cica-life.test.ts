/**
 * CICA Life — Superior Choice, from the Agent Guide (May 2026).
 *
 * The guide publishes annual rates per $1,000 but no policy fee and no modal
 * factors. These tests pin the two things that matter: the data that IS
 * published loads exactly, and the absence of a modal factor produces
 * "Rate unavailable" rather than an invented monthly premium.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadCicaLife } from '@/db/carriers/load-more';
import { CICA_APPROVED_STATES } from '@/db/carriers/cica-rates';
import { loadQuoteCatalog } from '@/modules/catalog/repository';
import { findRate } from '@/modules/engine/rates';
import { runSuperQuote } from '@/modules/engine';
import { loadActiveQuestions } from '@/modules/catalog/repository';
import { extractFacts } from '@/modules/questionnaire';
import { HEALTHY_ANSWERS } from '../fixtures/healthy-answers';
import { describeIfDb, setupTestDb } from './helpers';

const ASOF = '2026-09-17';

describeIfDb('CICA Life Superior Choice (real carrier data)', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let questions: Awaited<ReturnType<typeof loadActiveQuestions>> = [];

  beforeAll(async () => {
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadCicaLife(db, null);

    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'cica-life'))
      .limit(1);
    await db
      .update(schema.carriers)
      .set({ status: 'active', isVerified: true })
      .where(eq(schema.carriers.id, carrier.id));
    await db
      .update(schema.products)
      .set({ status: 'active' })
      .where(eq(schema.products.carrierId, carrier.id));
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
    questions = await loadActiveQuestions(db);
  }, 180_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function bundleFor(slug: string, stateCode: string, age: number, faceAmount: number) {
    const bundles = await loadQuoteCatalog(db, { stateCode, age, faceAmount, asOf: ASOF });
    return bundles.find((b) => b.product.slug === slug);
  }

  it('stores the printed annual rate per $1,000 exactly', async () => {
    const bundle = await bundleFor('superior-choice-standard-issue', 'TX', 65, 10000);
    const entries = bundle!.rateTables.flatMap((t) => t.entries);
    const male = entries.find((e) => e.age === 65 && e.sex === 'male');
    const female = entries.find((e) => e.age === 65 && e.sex === 'female');
    // Agent Guide p.47: Standard Issue, issue age 65 — male 86.44, female 74.92.
    expect(Number(male!.ratePerThousand)).toBe(86.44);
    expect(Number(female!.ratePerThousand)).toBe(74.92);
  });

  it('keeps the Guaranteed Issue table separate and dearer', async () => {
    const si = await bundleFor('superior-choice-standard-issue', 'TX', 65, 10000);
    const gi = await bundleFor('superior-choice-guaranteed-issue', 'TX', 65, 10000);
    const rate = (b: typeof si) =>
      Number(
        b!.rateTables
          .flatMap((t) => t.entries)
          .find((e) => e.age === 65 && e.sex === 'male')!.ratePerThousand,
      );
    // Agent Guide p.47: Guaranteed Issue, issue age 65, male — 138.91.
    expect(rate(gi)).toBe(138.91);
    expect(rate(gi)).toBeGreaterThan(rate(si));
  });

  it('refuses to invent a monthly premium with no published modal factor', async () => {
    const bundle = await bundleFor('superior-choice-standard-issue', 'TX', 65, 10000);
    const rate = findRate(
      bundle!,
      {
        stateCode: 'TX',
        age: 65,
        sex: 'male',
        tobaccoUse: false,
        faceAmount: 10000,
        monthlyBudget: null,
      },
      ASOF,
    );
    expect(rate.status).toBe('unavailable');
    expect(rate.monthlyPremium ?? null).toBeNull();
    expect(rate.reason).toBeTruthy();
  });

  it('narrows the Standard Issue face maximum as the client ages', async () => {
    const limitsFor = async (age: number) => {
      const bundle = await bundleFor('superior-choice-standard-issue', 'TX', age, 10000);
      return bundle!.faceLimits.find((l) => age >= l.minAge && age <= l.maxAge);
    };
    // Agent Guide p.36: $30,000 to age 50, $20,000 to 70, $10,000 to 85.
    expect((await limitsFor(45))!.maxFaceAmount).toBe(30000);
    expect((await limitsFor(60))!.maxFaceAmount).toBe(20000);
    expect((await limitsFor(75))!.maxFaceAmount).toBe(10000);
  });

  it('holds Guaranteed Issue at $30,000 through age 70 where Standard drops to $20,000', async () => {
    const gi = await bundleFor('superior-choice-guaranteed-issue', 'TX', 60, 10000);
    const band = gi!.faceLimits.find((l) => l.minAge === 51);
    expect(band!.maxFaceAmount).toBe(30000);
  });

  async function blockedIn(stateCode: string) {
    const bundles = await loadQuoteCatalog(db, { stateCode, age: 65, faceAmount: 10000, asOf: ASOF });
    const quote = runSuperQuote({
      intake: { stateCode, age: 65, sex: 'male', tobaccoUse: false, faceAmount: 10000, monthlyBudget: null },
      facts: extractFacts(questions, HEALTHY_ANSWERS),
      asOf: ASOF,
      bundles,
    });
    const blocked = quote.unavailable.find((o) => o.productSlug === 'superior-choice-standard-issue');
    return blocked?.exclusions.map((e) => e.code) ?? [];
  }

  it('honours the published state approval grid', async () => {
    for (const state of ['CA', 'NY', 'NJ', 'MA', 'ME', 'DE', 'VA', 'DC']) {
      expect(await blockedIn(state), state).toContain('state_unavailable');
    }
    for (const state of ['TX', 'AL', 'PA', 'MT']) {
      expect(await blockedIn(state), state).not.toContain('state_unavailable');
    }
  });

  it('holds Utah and Wisconsin back rather than guessing their partial marks', async () => {
    for (const state of ['UT', 'WI']) {
      expect(await blockedIn(state), state).toContain('state_unavailable');
    }
    expect(CICA_APPROVED_STATES).not.toContain('UT');
    expect(CICA_APPROVED_STATES).not.toContain('WI');
  });
});
