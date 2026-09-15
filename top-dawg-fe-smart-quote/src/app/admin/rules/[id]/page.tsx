import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { carriers, products, sourceDocuments, underwritingRules } from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { listRuleVersions } from '@/modules/rules/service';
import { ActionButton } from '@/components/admin/ActionButton';
import { RecordForm } from '@/components/admin/RecordForm';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  BENEFIT_TYPE_OPTIONS,
  CRITERIA_HELP,
  RESULT_OPTIONS,
  STATE_OPTIONS,
} from '@/components/admin/field-options';

export const dynamic = 'force-dynamic';

export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  await adminGuard();
  const ruleId = Number((await params).id);
  const db = getDb();

  const [rule] = await db
    .select()
    .from(underwritingRules)
    .where(eq(underwritingRules.id, ruleId))
    .limit(1);
  if (!rule) notFound();

  const [[carrier], carrierProducts, documents, versions] = await Promise.all([
    db.select().from(carriers).where(eq(carriers.id, rule.carrierId)).limit(1),
    db.select().from(products).where(eq(products.carrierId, rule.carrierId)),
    db.select().from(sourceDocuments).where(eq(sourceDocuments.carrierId, rule.carrierId)),
    listRuleVersions(db, ruleId),
  ]);

  return (
    <div className="stack-lg">
      <div>
        <Link href={`/admin/carriers/${rule.carrierId}`} className="small muted">
          ← {carrier?.name}
        </Link>
        <h1 style={{ fontSize: '1.4rem', marginTop: '0.4rem' }}>
          {rule.conditionCode} · {rule.result}
        </h1>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={rule.verificationStatus} />
          <span className="badge badge-neutral">version {rule.ruleVersion}</span>
          <span className="badge badge-neutral">
            {rule.productId
              ? (carrierProducts.find((p) => p.id === rule.productId)?.name ?? `product #${rule.productId}`)
              : 'all products'}
          </span>
          <span className="badge badge-neutral">{rule.stateCode ?? 'all states'}</span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Lifecycle</h2>
        <p className="muted small" style={{ marginBottom: '1rem' }}>
          Only <strong>verified</strong> rules inside their effective window are applied. Editing a
          verified rule snapshots the old version and returns the rule to draft — nothing is ever
          silently replaced.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['draft', 'verified', 'expired', 'archived'] as const)
            .filter((status) => status !== rule.verificationStatus)
            .map((status) => (
              <ActionButton
                key={status}
                url={`/api/admin/rules/${ruleId}/status`}
                body={{ status }}
                label={`Mark ${status}`}
                className={status === 'verified' ? 'btn btn-sm btn-gold' : 'btn btn-sm btn-ghost'}
              />
            ))}
        </div>
      </div>

      <RecordForm
        alwaysOpen
        endpoint={`/api/admin/rules/${ruleId}`}
        method="PATCH"
        submitLabel="Save as a new draft version"
        initial={rule as unknown as Record<string, unknown>}
        fields={[
          { name: 'conditionCode', label: 'Condition code', type: 'text', required: true },
          { name: 'ruleCategory', label: 'Rule category', type: 'text', required: true },
          { name: 'treatment', label: 'Treatment', type: 'text' },
          { name: 'lookbackMonths', label: 'Lookback (months)', type: 'number' },
          {
            name: 'productId',
            label: 'Product scope',
            type: 'select',
            options: carrierProducts.map((p) => ({ value: String(p.id), label: p.name })),
          },
          { name: 'stateCode', label: 'State scope', type: 'select', options: STATE_OPTIONS },
          { name: 'result', label: 'Result', type: 'select', options: RESULT_OPTIONS, required: true },
          {
            name: 'benefitClassification',
            label: 'Benefit classification',
            type: 'select',
            options: BENEFIT_TYPE_OPTIONS,
          },
          { name: 'priority', label: 'Priority', type: 'number' },
          { name: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
          { name: 'expirationDate', label: 'Expiration date', type: 'date' },
          {
            name: 'sourceDocumentId',
            label: 'Source document',
            type: 'select',
            options: documents.map((doc) => ({ value: String(doc.id), label: doc.title })),
          },
          { name: 'sourcePage', label: 'Source page', type: 'text' },
          {
            name: 'explanation',
            label: 'Agent-facing explanation',
            type: 'textarea',
            required: true,
            wide: true,
          },
          { name: 'underwritingConcern', label: 'Underwriting concern', type: 'textarea', wide: true },
          { name: 'criteria', label: 'Criteria (JSON)', type: 'json', wide: true, help: CRITERIA_HELP },
        ]}
      />

      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Version history ({versions.length})</h2>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Action</th>
                  <th>Changed by</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id}>
                    <td>v{version.version}</td>
                    <td>{version.action}</td>
                    <td className="tiny">{version.changedByEmail ?? '—'}</td>
                    <td className="tiny">
                      {version.changedAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td>
                      <ActionButton
                        url={`/api/admin/rules/${ruleId}/rollback`}
                        body={{ version: version.version }}
                        label="Roll back to this"
                        confirm={`Restore v${version.version} as a new draft version? Nothing is deleted.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
