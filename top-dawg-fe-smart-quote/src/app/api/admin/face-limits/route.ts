import { getDb } from '@/db/client';
import { productFaceLimits } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { faceLimitSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';
import { z } from 'zod';

const schema = faceLimitSchema.extend({ productId: z.coerce.number().int().positive() });

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = schema.parse(await request.json());
  if (values.maxAge < values.minAge) return fail('Maximum age must be at least the minimum.', 422);
  if (values.maxFaceAmount < values.minFaceAmount) {
    return fail('Maximum face amount must be at least the minimum.', 422);
  }

  const db = getDb();
  const [limit] = await db.insert(productFaceLimits).values(values).returning();
  await recordAudit(db, {
    actor,
    action: 'product.face_limit_create',
    entityType: 'product',
    entityId: values.productId,
    summary: `Ages ${values.minAge}–${values.maxAge} capped at $${values.maxFaceAmount.toLocaleString()}`,
    after: limit,
  });
  return ok(limit, 201);
});
