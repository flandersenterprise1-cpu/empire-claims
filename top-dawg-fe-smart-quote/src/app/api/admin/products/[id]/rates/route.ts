import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { rateImportSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { importRateCsv } from '@/modules/rates/import';

type Params = { params: Promise<{ id: string }> };

/** Imports a rate CSV as a DRAFT rate table. Nothing goes live from here. */
export const POST = route(async (request: Request, { params }: Params) => {
  const actor = await requireAdmin();
  const productId = Number((await params).id);
  const body = rateImportSchema.parse(await request.json());

  const result = await importRateCsv(
    getDb(),
    body.csv,
    {
      productId,
      benefitType: body.benefitType,
      stateCode: body.stateCode ?? null,
      effectiveDate: body.effectiveDate,
      endDate: body.endDate ?? null,
      monthlyPolicyFee: body.monthlyPolicyFee,
      sourceDocumentId: body.sourceDocumentId ?? null,
      sourcePage: body.sourcePage ?? null,
      filename: body.filename,
      notes: body.notes ?? null,
    },
    actor,
  );

  return ok(result, result.status === 'failed' ? 422 : 201);
});
