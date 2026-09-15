import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { carriers } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';
import { carrierUpdateSchema } from '@/modules/admin/schemas';

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const id = Number((await params).id);
  const patch = carrierUpdateSchema.parse(await request.json());
  const db = getDb();

  const [before] = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
  if (!before) return fail('Carrier not found.', 404);

  const [carrier] = await db
    .update(carriers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(carriers.id, id))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'carrier.update',
    entityType: 'carrier',
    entityId: id,
    summary: `Updated carrier ${carrier.name}`,
    before,
    after: carrier,
  });
  return ok(carrier);
});
