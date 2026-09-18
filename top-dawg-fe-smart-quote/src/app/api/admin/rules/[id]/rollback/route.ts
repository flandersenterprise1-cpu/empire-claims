import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { rollbackSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { rollbackRule } from '@/modules/rules/service';

type Params = { params: Promise<{ id: string }> };

/** Restores an earlier version's content as a new draft. History is preserved. */
export const POST = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const { version } = rollbackSchema.parse(await request.json());
  return ok(await rollbackRule(getDb(), Number((await params).id), version, actor));
});
