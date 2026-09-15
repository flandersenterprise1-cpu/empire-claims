import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { productStates } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { productStatesSchema } from '@/modules/admin/schemas';
import { recordAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

type Params = { params: Promise<{ id: string }> };

/** Replaces the state configuration for one product. */
export const PUT = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const productId = Number((await params).id);
  const { states } = productStatesSchema.parse(await request.json());
  const db = getDb();

  const before = await db
    .select()
    .from(productStates)
    .where(eq(productStates.productId, productId));

  for (const state of states) {
    const existing = before.find((row) => row.stateCode === state.stateCode);
    if (existing) {
      await db
        .update(productStates)
        .set({
          isAvailable: state.isAvailable,
          effectiveDate: state.effectiveDate ?? null,
          endDate: state.endDate ?? null,
        })
        .where(
          and(eq(productStates.productId, productId), eq(productStates.stateCode, state.stateCode)),
        );
    } else {
      await db.insert(productStates).values({
        productId,
        stateCode: state.stateCode,
        isAvailable: state.isAvailable,
        effectiveDate: state.effectiveDate ?? null,
        endDate: state.endDate ?? null,
      });
    }
  }

  const after = await db.select().from(productStates).where(eq(productStates.productId, productId));

  await recordAudit(db, {
    actor,
    action: 'product.states_update',
    entityType: 'product',
    entityId: productId,
    summary: `Updated state availability (${after.filter((s) => s.isAvailable).length} available)`,
    before,
    after,
  });
  return ok(after);
});
