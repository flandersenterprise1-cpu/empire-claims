import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { healthQuestions } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { questionCreateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

export const GET = route(async () => {
  await requireAdmin();
  return ok(
    await getDb().select().from(healthQuestions).orderBy(asc(healthQuestions.sortOrder)),
  );
});

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = questionCreateSchema.parse(await request.json());
  const db = getDb();

  const [question] = await db
    .insert(healthQuestions)
    .values({
      ...values,
      options: (values.options ?? null) as never,
      showWhen: (values.showWhen ?? null) as never,
    })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'health_question.create',
    entityType: 'health_question',
    entityId: question.id,
    entityVersion: question.version,
    summary: `Created question ${question.code}`,
    after: question,
  });
  return ok(question, 201);
});
