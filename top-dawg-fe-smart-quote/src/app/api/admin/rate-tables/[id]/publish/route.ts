import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { requireAdmin } from '@/modules/auth';
import { publishRateTable } from '@/modules/rates/import';

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  return ok(await publishRateTable(getDb(), Number((await params).id), actor));
});
