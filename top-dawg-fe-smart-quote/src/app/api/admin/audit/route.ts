import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { listAudit } from '@/modules/audit';
import { requireAdmin } from '@/modules/auth';

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  return ok(
    await listAudit(getDb(), {
      entityType: url.searchParams.get('entityType') ?? undefined,
      entityId: url.searchParams.get('entityId') ?? undefined,
      limit: Number(url.searchParams.get('limit') ?? 100),
    }),
  );
});
