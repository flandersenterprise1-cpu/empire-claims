import { getDb } from '@/db/client';
import { sourceDocuments } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { documentCreateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = documentCreateSchema.parse(await request.json());
  const db = getDb();
  const [document] = await db
    .insert(sourceDocuments)
    .values({ ...values, uploadedByUserId: actor.id })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'source_document.create',
    entityType: 'source_document',
    entityId: document.id,
    summary: `Referenced source document "${document.title}"`,
    after: document,
  });
  return ok(document, 201);
});
