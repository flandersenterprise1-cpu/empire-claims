/**
 * Bulk rule review. The screen exists so a licensed reviewer can publish a
 * carrier's rules in one pass, but a bulk action must leave exactly the same
 * trail as doing them one at a time, and must not act on rules that changed
 * since the reviewer looked at them.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '@/db/schema';
import { loadTransamerica } from '@/db/carriers/load-more';
import { listRulesForReview, setRuleStatus, setRuleStatusBulk } from '@/modules/rules/service';
import { describeIfDb, setupTestDb } from './helpers';

describeIfDb('bulk rule review', () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
  let sql: ReturnType<typeof postgres>;
  let carrierId = 0;

  beforeAll(async () => {
    const created = await setupTestDb({ demoCarrier: false });
    db = created.db;
    sql = created.sql;
    await loadTransamerica(db, null);
    const [carrier] = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.slug, 'transamerica'))
      .limit(1);
    carrierId = carrier.id;
  }, 180_000);

  afterAll(async () => {
    await sql?.end();
  });

  it('lists draft rules with the document and page they cite', async () => {
    const rules = await listRulesForReview(db, carrierId, 'draft');
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.verificationStatus).toBe('draft');
      expect(rule.sourceTitle).toBeTruthy();
      expect(rule.sourcePage).toBeTruthy();
    }
  });

  it('publishes a batch, versioning and auditing each rule separately', async () => {
    const drafts = await listRulesForReview(db, carrierId, 'draft');
    const batch = drafts.slice(0, 5).map((r) => r.id);

    const result = await setRuleStatusBulk(db, batch, 'verified', 'draft', null);
    expect(result.updated).toEqual(batch);
    expect(result.skipped).toEqual([]);

    for (const id of batch) {
      const [row] = await db
        .select()
        .from(schema.underwritingRules)
        .where(eq(schema.underwritingRules.id, id))
        .limit(1);
      expect(row.verificationStatus).toBe('verified');
      expect(row.publishedAt).not.toBeNull();
      expect(row.lastReviewedAt).not.toBeNull();

      const versions = await db
        .select()
        .from(schema.ruleVersions)
        .where(eq(schema.ruleVersions.ruleId, id));
      expect(versions.some((v) => v.action === 'published')).toBe(true);

      const audits = await db
        .select()
        .from(schema.auditLog)
        .where(
          and(eq(schema.auditLog.entityType, 'underwriting_rule'), eq(schema.auditLog.entityId, String(id))),
        );
      expect(audits.some((a) => a.action === 'rule.verified')).toBe(true);
    }
  });

  it('skips rules that moved since the page rendered instead of re-verifying them', async () => {
    const drafts = await listRulesForReview(db, carrierId, 'draft');
    const [stale, fresh] = drafts;

    // Someone else archives one of them while the reviewer's page is open.
    await setRuleStatus(db, stale.id, 'archived', null);

    const result = await setRuleStatusBulk(db, [stale.id, fresh.id], 'verified', 'draft', null);
    expect(result.updated).toEqual([fresh.id]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].id).toBe(stale.id);
    expect(result.skipped[0].reason).toContain('archived');

    const [row] = await db
      .select()
      .from(schema.underwritingRules)
      .where(eq(schema.underwritingRules.id, stale.id))
      .limit(1);
    expect(row.verificationStatus).toBe('archived');
  });

  it('reports rules that have gone away rather than failing the whole batch', async () => {
    const drafts = await listRulesForReview(db, carrierId, 'draft');
    const result = await setRuleStatusBulk(db, [drafts[0].id, 999_999], 'verified', 'draft', null);
    expect(result.updated).toEqual([drafts[0].id]);
    expect(result.skipped[0]).toMatchObject({ id: 999_999, reason: 'no longer exists' });
  });
});
