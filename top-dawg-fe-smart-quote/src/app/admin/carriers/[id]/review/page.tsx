import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { carriers } from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { describeCriteria } from '@/modules/rules/describe';
import { listRulesForReview } from '@/modules/rules/service';
import { RuleReviewList, type ReviewRule } from '@/components/admin/RuleReviewList';
import type { Criteria } from '@/modules/engine/types';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'verified', 'expired', 'archived'] as const;
type Status = (typeof STATUSES)[number];

export default async function RuleReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await adminGuard();
  const carrierId = Number((await params).id);
  const requested = (await searchParams).status;
  const status: Status = STATUSES.includes(requested as Status) ? (requested as Status) : 'draft';

  const db = getDb();
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  if (!carrier) notFound();

  const rows = await listRulesForReview(db, carrierId, status);
  const rules: ReviewRule[] = rows.map((r) => ({
    id: r.id,
    ruleCategory: r.ruleCategory,
    conditionCode: r.conditionCode,
    result: r.result,
    benefitClassification: r.benefitClassification,
    explanation: r.explanation,
    criteriaText: describeCriteria(r.criteria as Criteria),
    productName: r.productName,
    stateCode: r.stateCode,
    sourceTitle: r.sourceTitle,
    sourcePage: r.sourcePage,
    effectiveDate: r.effectiveDate,
    ruleVersion: r.ruleVersion,
  }));

  return (
    <div className="stack-lg">
      <div>
        <Link href={`/admin/carriers/${carrierId}`} className="small muted">
          ← {carrier.name}
        </Link>
        <h1 style={{ fontSize: '1.4rem', marginTop: '0.4rem' }}>Review underwriting rules</h1>
        <p className="muted small" style={{ marginTop: '0.3rem' }}>
          Read each rule against the source page it cites. Publishing puts it straight into the
          quoting engine; the carrier makes the final underwriting decision either way. Every
          rule you move is versioned and written to the audit log individually.
        </p>
      </div>

      <nav className="nav-links small">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/carriers/${carrierId}/review?status=${s}`}
            style={{ fontWeight: s === status ? 700 : 400 }}
          >
            {s}
          </Link>
        ))}
      </nav>

      <RuleReviewList
        carrierId={carrierId}
        carrierName={carrier.name}
        rules={rules}
        status={status}
      />
    </div>
  );
}
