import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { underwritingRules } from '@/db/schema';
import { ok, route } from '@/lib/api';
import { ruleCreateSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { createRule } from '@/modules/rules/service';

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const carrierId = url.searchParams.get('carrierId');
  const db = getDb();
  const filters = carrierId ? [eq(underwritingRules.carrierId, Number(carrierId))] : [];
  const query = db.select().from(underwritingRules);
  return ok(filters.length ? await query.where(and(...filters)) : await query);
});

/** Creates a DRAFT rule. Draft rules are never applied by the engine. */
export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const values = ruleCreateSchema.parse(await request.json());
  const rule = await createRule(
    getDb(),
    { ...values, criteria: values.criteria as never },
    actor,
  );
  return ok(rule, 201);
});
