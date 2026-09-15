import { getDb } from '@/db/client';
import { medicationRules } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { medicationRuleCreateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = medicationRuleCreateSchema.parse(await request.json());
  const db = getDb();

  const [rule] = await db
    .insert(medicationRules)
    .values({ ...values, verificationStatus: 'draft', createdByUserId: actor.id })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'medication_rule.create',
    entityType: 'medication_rule',
    entityId: rule.id,
    entityVersion: rule.ruleVersion,
    summary: `Created draft medication rule for ${rule.medicationName}`,
    after: rule,
  });
  return ok(rule, 201);
});
