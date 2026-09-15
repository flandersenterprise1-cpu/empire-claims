import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { productFaceLimits } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

type Params = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const id = Number((await params).id);
  const db = getDb();
  const [removed] = await db
    .delete(productFaceLimits)
    .where(eq(productFaceLimits.id, id))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'product.face_limit_delete',
    entityType: 'product',
    entityId: removed?.productId,
    summary: 'Removed an age-banded face limit',
    before: removed,
  });
  return ok({ deleted: Boolean(removed) });
});
