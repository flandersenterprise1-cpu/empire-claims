import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { bulkRuleStatusSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { setRuleStatusBulk } from '@/modules/rules/service';

export const POST = route(async (request: Request) => {
  const actor = await requireAdmin();
  const { ruleIds, status, expectedFrom } = bulkRuleStatusSchema.parse(await request.json());
  return ok(await setRuleStatusBulk(getDb(), ruleIds, status, expectedFrom, actor));
});
