import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { activationSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { setCarrierActivation } from '@/modules/carriers/service';

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const { status } = activationSchema.parse(await request.json());
  return ok(await setCarrierActivation(getDb(), Number((await params).id), status, actor));
});
