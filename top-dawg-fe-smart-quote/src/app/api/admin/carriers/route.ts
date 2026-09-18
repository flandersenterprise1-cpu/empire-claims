import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { carriers } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';
import { carrierCreateSchema } from '@/modules/admin/schemas';

export const GET = route(async () => {
  await requireAdmin();
  return ok(await getDb().select().from(carriers).orderBy(asc(carriers.name)));
});

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = carrierCreateSchema.parse(await request.json());
  const db = getDb();

  // New carriers are always inactive and unverified until a module is published.
  const [carrier] = await db
    .insert(carriers)
    .values({ ...values, status: 'inactive', isVerified: false })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'carrier.create',
    entityType: 'carrier',
    entityId: carrier.id,
    summary: `Created inactive carrier ${carrier.name}`,
    after: carrier,
  });
  return ok(carrier, 201);
});
