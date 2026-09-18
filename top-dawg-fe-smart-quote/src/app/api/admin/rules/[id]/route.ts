import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { ruleUpdateSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { listRuleVersions, updateRule } from '@/modules/rules/service';

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  await requireAdmin();
  return ok(await listRuleVersions(getDb(), Number((await params).id)));
});

/**
 * Editing never overwrites a published rule in place: the previous version is
 * snapshotted and the rule returns to draft until it is verified again.
 */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const patch = ruleUpdateSchema.parse(await request.json());
  const rule = await updateRule(
    getDb(),
    Number((await params).id),
    { ...patch, criteria: patch.criteria as never },
    actor,
  );
  return ok(rule);
});
