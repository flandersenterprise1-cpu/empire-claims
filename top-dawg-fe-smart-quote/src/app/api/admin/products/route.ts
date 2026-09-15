import { getDb } from '@/db/client';
import { products } from '@/db/schema';
import { fail, ok, route } from '@/lib/api';
import { productCreateSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = productCreateSchema.parse(await request.json());

  if (values.maxFaceAmount < values.minFaceAmount) {
    return fail('The maximum face amount must be at least the minimum.', 422);
  }
  if (values.maxAge < values.minAge) {
    return fail('The maximum issue age must be at least the minimum.', 422);
  }
  if (values.minFaceAmount % values.faceIncrement !== 0) {
    return fail('The minimum face amount must be a multiple of the increment.', 422);
  }
  if (values.allowInterpolation && values.rateMethodology !== 'per_thousand') {
    return fail(
      'Interpolation is only allowed when the carrier’s verified methodology is per $1,000.',
      422,
    );
  }

  const db = getDb();
  const [product] = await db
    .insert(products)
    .values({ ...values, status: 'inactive' })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'product.create',
    entityType: 'product',
    entityId: product.id,
    summary: `Created inactive product ${product.name}`,
    after: product,
  });
  return ok(product, 201);
});
