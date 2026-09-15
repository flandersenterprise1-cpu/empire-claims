/**
 * Underwriting-rule lifecycle.
 *
 * Invariants enforced here:
 *  - New and imported rules land in `draft` and are never used by the engine.
 *  - Editing a published (verified) rule never silently replaces it: the
 *    current state is snapshotted, the version is bumped, and the rule drops
 *    back to `draft` until an administrator verifies it again.
 *  - Every version is retained, so any earlier version can be rolled back to.
 */
import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { recordAudit, type AuditActor } from '@/modules/audit';
import type { Db } from '@/modules/catalog/repository';

type RuleRow = typeof schema.underwritingRules.$inferSelect;
export type RuleInsert = typeof schema.underwritingRules.$inferInsert;

async function snapshot(
  db: Db,
  rule: RuleRow,
  action: string,
  actor: AuditActor | null,
): Promise<void> {
  await db.insert(schema.ruleVersions).values({
    ruleId: rule.id,
    version: rule.ruleVersion,
    action,
    snapshot: rule as never,
    changedByUserId: actor?.id ?? null,
    changedByEmail: actor?.email ?? null,
  });
}

export async function createRule(
  db: Db,
  values: Omit<RuleInsert, 'verificationStatus' | 'ruleVersion'>,
  actor: AuditActor | null,
): Promise<RuleRow> {
  const [row] = await db
    .insert(schema.underwritingRules)
    .values({ ...values, verificationStatus: 'draft', ruleVersion: 1, createdByUserId: actor?.id ?? null })
    .returning();

  await snapshot(db, row, 'created', actor);
  await recordAudit(db, {
    actor,
    action: 'rule.create',
    entityType: 'underwriting_rule',
    entityId: row.id,
    entityVersion: row.ruleVersion,
    summary: `Created draft rule for ${row.conditionCode}`,
    after: row,
  });
  return row;
}

export async function updateRule(
  db: Db,
  ruleId: number,
  patch: Partial<RuleInsert>,
  actor: AuditActor | null,
): Promise<RuleRow> {
  const [current] = await db
    .select()
    .from(schema.underwritingRules)
    .where(eq(schema.underwritingRules.id, ruleId))
    .limit(1);
  if (!current) throw new Error(`Rule ${ruleId} not found.`);

  // Preserve the published state before overwriting anything.
  await snapshot(db, current, 'superseded', actor);

  const wasVerified = current.verificationStatus === 'verified';
  const [row] = await db
    .update(schema.underwritingRules)
    .set({
      ...patch,
      // An edit to a live rule always requires re-verification.
      verificationStatus: 'draft',
      ruleVersion: current.ruleVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.underwritingRules.id, ruleId))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'rule.update',
    entityType: 'underwriting_rule',
    entityId: ruleId,
    entityVersion: row.ruleVersion,
    summary: wasVerified
      ? `Edited a verified rule; v${current.ruleVersion} preserved and v${row.ruleVersion} awaits verification`
      : `Edited draft rule (now v${row.ruleVersion})`,
    before: current,
    after: row,
  });
  return row;
}

export async function setRuleStatus(
  db: Db,
  ruleId: number,
  status: 'draft' | 'verified' | 'expired' | 'archived',
  actor: AuditActor | null,
): Promise<RuleRow> {
  const [current] = await db
    .select()
    .from(schema.underwritingRules)
    .where(eq(schema.underwritingRules.id, ruleId))
    .limit(1);
  if (!current) throw new Error(`Rule ${ruleId} not found.`);

  const [row] = await db
    .update(schema.underwritingRules)
    .set({
      verificationStatus: status,
      publishedAt: status === 'verified' ? new Date() : current.publishedAt,
      publishedByUserId: status === 'verified' ? (actor?.id ?? null) : current.publishedByUserId,
      lastReviewedAt: status === 'verified' ? new Date().toISOString().slice(0, 10) : current.lastReviewedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.underwritingRules.id, ruleId))
    .returning();

  await snapshot(db, row, status === 'verified' ? 'published' : `status:${status}`, actor);
  await recordAudit(db, {
    actor,
    action: `rule.${status}`,
    entityType: 'underwriting_rule',
    entityId: ruleId,
    entityVersion: row.ruleVersion,
    summary: `Rule moved from ${current.verificationStatus} to ${status}`,
    before: current,
    after: row,
  });
  return row;
}

export async function listRuleVersions(db: Db, ruleId: number) {
  return db
    .select()
    .from(schema.ruleVersions)
    .where(eq(schema.ruleVersions.ruleId, ruleId))
    .orderBy(desc(schema.ruleVersions.changedAt));
}

/**
 * Restores an earlier version's content as a new draft version. History is
 * append-only — a rollback never deletes the version it replaced.
 */
export async function rollbackRule(
  db: Db,
  ruleId: number,
  targetVersion: number,
  actor: AuditActor | null,
): Promise<RuleRow> {
  const [version] = await db
    .select()
    .from(schema.ruleVersions)
    .where(
      and(eq(schema.ruleVersions.ruleId, ruleId), eq(schema.ruleVersions.version, targetVersion)),
    )
    .orderBy(desc(schema.ruleVersions.changedAt))
    .limit(1);
  if (!version) throw new Error(`Version ${targetVersion} of rule ${ruleId} not found.`);

  const [current] = await db
    .select()
    .from(schema.underwritingRules)
    .where(eq(schema.underwritingRules.id, ruleId))
    .limit(1);
  if (!current) throw new Error(`Rule ${ruleId} not found.`);

  await snapshot(db, current, 'superseded', actor);

  const restored = version.snapshot as RuleRow;
  const [row] = await db
    .update(schema.underwritingRules)
    .set({
      stateCode: restored.stateCode,
      ruleCategory: restored.ruleCategory,
      conditionCode: restored.conditionCode,
      treatment: restored.treatment,
      lookbackMonths: restored.lookbackMonths,
      criteria: restored.criteria as never,
      result: restored.result,
      benefitClassification: restored.benefitClassification,
      explanation: restored.explanation,
      underwritingConcern: restored.underwritingConcern,
      priority: restored.priority,
      sourceDocumentId: restored.sourceDocumentId,
      sourcePage: restored.sourcePage,
      effectiveDate: restored.effectiveDate,
      expirationDate: restored.expirationDate,
      // A rollback is a content change, so it must be re-verified before use.
      verificationStatus: 'draft',
      ruleVersion: current.ruleVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.underwritingRules.id, ruleId))
    .returning();

  await snapshot(db, row, `rolled_back_to_v${targetVersion}`, actor);
  await recordAudit(db, {
    actor,
    action: 'rule.rollback',
    entityType: 'underwriting_rule',
    entityId: ruleId,
    entityVersion: row.ruleVersion,
    summary: `Rolled back to v${targetVersion}; stored as draft v${row.ruleVersion}`,
    before: current,
    after: row,
  });
  return row;
}

/** Marks rules whose expiration date has passed. Safe to run repeatedly. */
export async function expireStaleRules(db: Db, asOf: string, actor: AuditActor | null) {
  const rows = await db
    .select()
    .from(schema.underwritingRules)
    .where(eq(schema.underwritingRules.verificationStatus, 'verified'));

  const stale = rows.filter((r) => r.expirationDate != null && r.expirationDate < asOf);
  for (const rule of stale) {
    await setRuleStatus(db, rule.id, 'expired', actor);
  }
  return stale.length;
}
