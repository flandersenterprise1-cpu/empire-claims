import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { healthQuestions } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { questionUpdateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const id = Number((await params).id);
  const patch = questionUpdateSchema.parse(await request.json());
  const db = getDb();

  const [before] = await db.select().from(healthQuestions).where(eq(healthQuestions.id, id)).limit(1);
  if (!before) return fail('Question not found.', 404);

  const [question] = await db
    .update(healthQuestions)
    .set({
      ...patch,
      options: (patch.options === undefined ? before.options : patch.options) as never,
      showWhen: (patch.showWhen === undefined ? before.showWhen : patch.showWhen) as never,
      version: before.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(healthQuestions.id, id))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'health_question.update',
    entityType: 'health_question',
    entityId: id,
    entityVersion: question.version,
    summary: `Updated question ${question.code} to v${question.version}`,
    before,
    after: question,
  });
  return ok(question);
});
