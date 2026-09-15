import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { ruleStatusSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { setRuleStatus } from '@/modules/rules/service';

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const { status } = ruleStatusSchema.parse(await request.json());
  return ok(await setRuleStatus(getDb(), Number((await params).id), status, actor));
});
