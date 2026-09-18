import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { requireAdmin } from '@/modules/auth';
import { carrierReadiness, publishCarrier } from '@/modules/carriers/service';

type Params = { params: Promise<{ id: string }> };

/** Preview readiness without changing anything. */
export const GET = route(async (_request: Request, { params }: Params) => {
  await requireAdmin();
  return ok(await carrierReadiness(getDb(), Number((await params).id)));
});

/** Publishes a verified carrier module — refused unless every check passes. */
export const POST = route(async (_request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  return ok(await publishCarrier(getDb(), Number((await params).id), actor));
});
