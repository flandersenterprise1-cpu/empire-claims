import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { medicationRules } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { ruleStatusSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const id = Number((await params).id);
  const { status } = ruleStatusSchema.parse(await request.json());
  const db = getDb();

  const [before] = await db.select().from(medicationRules).where(eq(medicationRules.id, id)).limit(1);
  if (!before) return fail('Medication rule not found.', 404);

  const [rule] = await db
    .update(medicationRules)
    .set({
      verificationStatus: status,
      lastReviewedAt:
        status === 'verified' ? new Date().toISOString().slice(0, 10) : before.lastReviewedAt,
      updatedAt: new Date(),
    })
    .where(eq(medicationRules.id, id))
    .returning();

  await recordAudit(db, {
    actor,
    action: `medication_rule.${status}`,
    entityType: 'medication_rule',
    entityId: id,
    entityVersion: rule.ruleVersion,
    summary: `Medication rule moved from ${before.verificationStatus} to ${status}`,
    before,
    after: rule,
  });
  return ok(rule);
});
