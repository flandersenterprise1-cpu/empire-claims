import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { products } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { productUpdateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const id = Number((await params).id);
  const patch = productUpdateSchema.parse(await request.json());
  const db = getDb();

  const [before] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!before) return fail('Product not found.', 404);

  const merged = { ...before, ...patch };
  if (merged.maxFaceAmount < merged.minFaceAmount) {
    return fail('The maximum face amount must be at least the minimum.', 422);
  }
  if (merged.maxAge < merged.minAge) {
    return fail('The maximum issue age must be at least the minimum.', 422);
  }
  if (merged.allowInterpolation && merged.rateMethodology !== 'per_thousand') {
    return fail(
      'Interpolation is only allowed when the carrier’s verified methodology is per $1,000.',
      422,
    );
  }

  const [product] = await db
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'product.update',
    entityType: 'product',
    entityId: id,
    summary: `Updated product ${product.name}`,
    before,
    after: product,
  });
  return ok(product);
});
