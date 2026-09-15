/**
 * Rule versioning, publishing, rollback and the audit trail.
 * All rule content here is FICTIONAL test data.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { listAudit } from '@/modules/audit';
import { loadQuoteCatalog } from '@/modules/catalog/repository';
import { classify } from '@/modules/engine/underwriting';
import {
  createRule,
  expireStaleRules,
  listRuleVersions,
  rollbackRule,
  setRuleStatus,
  updateRule,
} from '@/modules/rules/service';
import { carrierReadiness, publishCarrier, setCarrierActivation } from '@/modules/carriers/service';
import { describeIfDb, setupTestDb } from './helpers';

const ACTOR = { id: 1, email: 'admin@topdawg.local' };

describeIfDb('rule lifecycle and versioning', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let carrierId: number;

  beforeAll(async () => {
    const created = await setupTestDb();
    db = created.db;
    sql = created.sql;
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'mutual-of-omaha'))
      .limit(1);
    carrierId = carrier.id;
  }, 120_000);

  afterAll(async () => {
    await sql?.end();
  });

  async function newRule(explanation: string) {
    return createRule(
      db,
      {
        carrierId,
        ruleCategory: 'diabetes',
        conditionCode: 'diabetes',
        criteria: { all: [{ fact: 'diabetes.treatment', op: 'eq', value: 'insulin' }] } as never,
        result: 'graded',
        benefitClassification: 'graded',
        explanation,
        effectiveDate: '2020-01-01',
      },
      ACTOR,
    );
  }

  it('creates new rules as drafts', async () => {
    const rule = await newRule('FICTIONAL TEST: insulin classifies graded.');
    expect(rule.verificationStatus).toBe('draft');
    expect(rule.ruleVersion).toBe(1);
  });

  it('records a version snapshot and an audit entry on creation', async () => {
    const rule = await newRule('FICTIONAL TEST: snapshot on create.');
    const versions = await listRuleVersions(db, rule.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].action).toBe('created');

    const audit = await listAudit(db, { entityType: 'underwriting_rule', entityId: String(rule.id) });
    expect(audit[0].action).toBe('rule.create');
    expect(audit[0].actorEmail).toBe(ACTOR.email);
  });

  it('never silently replaces a published rule — it snapshots and returns to draft', async () => {
    const rule = await newRule('FICTIONAL TEST: original wording.');
    await setRuleStatus(db, rule.id, 'verified', ACTOR);

    const updated = await updateRule(db, rule.id, { explanation: 'FICTIONAL TEST: new wording.' }, ACTOR);
    expect(updated.ruleVersion).toBe(2);
    expect(updated.verificationStatus).toBe('draft');

    const versions = await listRuleVersions(db, rule.id);
    const superseded = versions.find((v) => v.action === 'superseded');
    expect(superseded).toBeDefined();
    expect((superseded!.snapshot as { explanation: string }).explanation).toContain('original wording');
  });

  it('rolls back to an earlier version as a new draft without deleting history', async () => {
    const rule = await newRule('FICTIONAL TEST: v1 wording.');
    await setRuleStatus(db, rule.id, 'verified', ACTOR);
    await updateRule(db, rule.id, { explanation: 'FICTIONAL TEST: v2 wording.' }, ACTOR);

    const rolledBack = await rollbackRule(db, rule.id, 1, ACTOR);
    expect(rolledBack.explanation).toContain('v1 wording');
    expect(rolledBack.verificationStatus).toBe('draft');
    expect(rolledBack.ruleVersion).toBeGreaterThan(2);

    const versions = await listRuleVersions(db, rule.id);
    expect(versions.length).toBeGreaterThanOrEqual(4);

    const audit = await listAudit(db, { entityType: 'underwriting_rule', entityId: String(rule.id) });
    expect(audit.some((entry) => entry.action === 'rule.rollback')).toBe(true);
  });

  it('marks a rule expired once its expiration date has passed', async () => {
    const rule = await newRule('FICTIONAL TEST: expiring rule.');
    await updateRule(db, rule.id, { expirationDate: '2024-01-01' }, ACTOR);
    await setRuleStatus(db, rule.id, 'verified', ACTOR);

    const expired = await expireStaleRules(db, '2026-01-01', ACTOR);
    expect(expired).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(schema.underwritingRules)
      .where(eq(schema.underwritingRules.id, rule.id))
      .limit(1);
    expect(row.verificationStatus).toBe('expired');
  });

  it('records who published which version', async () => {
    const rule = await newRule('FICTIONAL TEST: publish audit.');
    await setRuleStatus(db, rule.id, 'verified', ACTOR);

    const audit = await listAudit(db, { entityType: 'underwriting_rule', entityId: String(rule.id) });
    const published = audit.find((entry) => entry.action === 'rule.verified');
    expect(published?.actorEmail).toBe(ACTOR.email);
    expect(published?.entityVersion).toBe(1);
  });
});

describeIfDb('carrier publishing', () => {
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

  it('refuses to publish a carrier that is only a placeholder', async () => {
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'aflac'))
      .limit(1);

    const readiness = await carrierReadiness(db, carrier.id);
    expect(readiness.ready).toBe(false);
    expect(readiness.checks.filter((c) => !c.passed).length).toBeGreaterThan(0);

    await expect(publishCarrier(db, carrier.id, ACTOR)).rejects.toThrow(/not ready to publish/i);
  });

  it('refuses to activate a carrier that has never been verified', async () => {
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'cica-life'))
      .limit(1);

    await expect(setCarrierActivation(db, carrier.id, 'active', ACTOR)).rejects.toThrow(
      /verified carrier module/i,
    );
  });

  it('reports the demo carrier as ready and publishes a new module version', async () => {
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'sample-mutual-fictional'))
      .limit(1);

    const readiness = await carrierReadiness(db, carrier.id);
    expect(readiness.ready).toBe(true);

    const published = await publishCarrier(db, carrier.id, ACTOR);
    expect(published.status).toBe('active');
    expect(published.publishedVersion).toBe(carrier.publishedVersion + 1);

    const audit = await listAudit(db, { entityType: 'carrier', entityId: String(carrier.id) });
    expect(audit[0].action).toBe('carrier.publish');
    expect(audit[0].entityVersion).toBe(published.publishedVersion);
  });
});

describeIfDb('draft and expired rules are invisible to the engine', () => {
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

  it('applies a knockout only after it has been verified', async () => {
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, 'sample-level'))
      .limit(1);

    const rule = await createRule(
      db,
      {
        carrierId: product.carrierId,
        productId: product.id,
        ruleCategory: 'liver',
        conditionCode: 'liver_special',
        criteria: { all: [{ fact: 'liver.present', op: 'eq', value: true }] } as never,
        result: 'decline',
        explanation: 'FICTIONAL TEST: liver disease is an automatic decline.',
        effectiveDate: '2020-01-01',
      },
      ACTOR,
    );

    const facts = {
      values: { 'liver.present': true, 'liver.conditions': ['fatty_liver'] },
      unknownPaths: [],
      absentPaths: [],
      reportedConditions: ['liver'],
    };

    const loadBundle = async () => {
      const bundles = await loadQuoteCatalog(db, {
        stateCode: 'TX',
        age: 65,
        faceAmount: 10000,
        asOf: '2026-06-01',
      });
      return bundles.find((b) => b.product.id === product.id)!;
    };

    const draftOutcome = classify(await loadBundle(), facts, 'TX', '2026-06-01');
    expect(draftOutcome.status).not.toBe('declined');
    expect(draftOutcome.verificationReasons.map((r) => r.code)).toContain('unverified_rule_matched');

    await setRuleStatus(db, rule.id, 'verified', ACTOR);

    const verifiedOutcome = classify(await loadBundle(), facts, 'TX', '2026-06-01');
    expect(verifiedOutcome.status).toBe('declined');
    expect(verifiedOutcome.driver?.explanation).toContain('automatic decline');
  });
});
