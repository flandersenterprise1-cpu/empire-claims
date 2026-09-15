import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  carriers,
  medicationRules,
  products,
  sourceDocuments,
  underwritingRules,
} from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { carrierReadiness } from '@/modules/carriers/service';
import { ActionButton } from '@/components/admin/ActionButton';
import { RecordForm } from '@/components/admin/RecordForm';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  BENEFIT_TYPE_OPTIONS,
  RESULT_OPTIONS,
  STATE_OPTIONS,
  CRITERIA_HELP,
} from '@/components/admin/field-options';

export const dynamic = 'force-dynamic';

export default async function CarrierPage({ params }: { params: Promise<{ id: string }> }) {
  await adminGuard();
  const carrierId = Number((await params).id);
  const db = getDb();

  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  if (!carrier) notFound();

  const [carrierProducts, documents, rules, medications, readiness] = await Promise.all([
    db.select().from(products).where(eq(products.carrierId, carrierId)).orderBy(asc(products.sortOrder)),
    db.select().from(sourceDocuments).where(eq(sourceDocuments.carrierId, carrierId)),
    db
      .select()
      .from(underwritingRules)
      .where(eq(underwritingRules.carrierId, carrierId))
      .orderBy(asc(underwritingRules.conditionCode)),
    db.select().from(medicationRules).where(eq(medicationRules.carrierId, carrierId)),
    carrierReadiness(db, carrierId),
  ]);

  const documentOptions = documents.map((doc) => ({ value: String(doc.id), label: doc.title }));
  const productOptions = carrierProducts.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <div className="stack-lg">
      <div>
        <Link href="/admin" className="small muted">
          ← All carriers
        </Link>
        <h1 style={{ fontSize: '1.5rem', marginTop: '0.4rem' }}>{carrier.name}</h1>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={carrier.status} />
          {carrier.isVerified ? (
            <span className="badge badge-positive">published v{carrier.publishedVersion}</span>
          ) : (
            <span className="badge badge-caution">not yet verified</span>
          )}
          {carrier.isFictionalSample ? (
            <span className="badge badge-danger">fictional sample data</span>
          ) : null}
        </div>
        {carrier.notes ? (
          <p className="notice" style={{ marginTop: '1rem' }}>
            {carrier.notes}
          </p>
        ) : null}
      </div>

      {/* ------------------------------ Readiness ------------------------- */}
      <section className="card">
        <h2 style={{ fontSize: '1.1rem' }}>Publish checklist</h2>
        <p className="muted small" style={{ marginTop: '0.3rem', marginBottom: '1rem' }}>
          A carrier module can only be published once every check passes. Publishing activates the
          carrier and records a new module version in the audit log.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
          {readiness.checks.map((check) => (
            <li
              key={check.key}
              style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline', padding: '0.35rem 0' }}
            >
              <span className={`badge ${check.passed ? 'badge-positive' : 'badge-caution'}`}>
                {check.passed ? 'ok' : 'todo'}
              </span>
              <span className="small">
                <strong>{check.label}</strong> — <span className="muted">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <ActionButton
          url={`/api/admin/carriers/${carrierId}/publish`}
          label={readiness.ready ? 'Publish verified carrier module' : 'Publish (checks outstanding)'}
          className="btn btn-gold"
          confirm="Publish this carrier module and make it live for agents?"
        />
      </section>

      {/* ------------------------------ Products -------------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Products ({carrierProducts.length})</h2>
        {carrierProducts.length === 0 ? (
          <p className="notice notice-caution">
            No products yet. Add one from the verified carrier documentation — issue ages, face
            amounts, increments and state availability all come from that document.
          </p>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Benefit</th>
                    <th>Ages</th>
                    <th>Face</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {carrierProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/admin/products/${product.id}`} style={{ fontWeight: 650 }}>
                          {product.name}
                        </Link>
                        <div className="tiny mono muted">{product.slug}</div>
                      </td>
                      <td>{product.benefitType.replace(/_/g, ' ')}</td>
                      <td>
                        {product.minAge}–{product.maxAge}
                      </td>
                      <td>
                        ${product.minFaceAmount.toLocaleString()}–$
                        {product.maxFaceAmount.toLocaleString()} / $
                        {product.faceIncrement.toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={product.status} />
                      </td>
                      <td>
                        <ActionButton
                          url={`/api/admin/products/${product.id}/activation`}
                          body={{ status: product.status === 'active' ? 'inactive' : 'active' }}
                          label={product.status === 'active' ? 'Deactivate' : 'Activate'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <RecordForm
          summary="Add a product"
          endpoint="/api/admin/products"
          constant={{ carrierId }}
          submitLabel="Create product (inactive)"
          fields={[
            { name: 'name', label: 'Product name', type: 'text', required: true },
            { name: 'slug', label: 'Slug', type: 'text', required: true },
            { name: 'benefitType', label: 'Benefit type', type: 'select', options: BENEFIT_TYPE_OPTIONS, required: true },
            { name: 'minAge', label: 'Minimum issue age', type: 'number', required: true },
            { name: 'maxAge', label: 'Maximum issue age', type: 'number', required: true },
            { name: 'minFaceAmount', label: 'Minimum face amount', type: 'number', required: true },
            { name: 'maxFaceAmount', label: 'Maximum face amount', type: 'number', required: true },
            { name: 'faceIncrement', label: 'Face increment', type: 'number', required: true },
            {
              name: 'tobaccoClasses',
              label: 'Tobacco classes',
              type: 'multiselect',
              options: [
                { value: 'non_tobacco', label: 'Non-tobacco' },
                { value: 'tobacco', label: 'Tobacco' },
                { value: 'unismoke', label: 'Unismoke' },
              ],
            },
            {
              name: 'sexClasses',
              label: 'Rate classes by sex',
              type: 'multiselect',
              options: [
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'unisex', label: 'Unisex' },
              ],
            },
            { name: 'waitingPeriodMonths', label: 'Waiting period (months)', type: 'number' },
            {
              name: 'simplicityScore',
              label: 'Application simplicity (1–5)',
              type: 'number',
              help: 'Final ranking tiebreaker only. 5 = easiest to submit.',
            },
            {
              name: 'rateMethodology',
              label: 'Rate methodology',
              type: 'select',
              options: [
                { value: 'exact_only', label: 'Exact rate-table rows only' },
                { value: 'per_thousand', label: 'Per $1,000 (carrier-verified)' },
              ],
            },
            {
              name: 'allowInterpolation',
              label: 'Allow computed premiums',
              type: 'checkbox',
              help: 'Only turn this on when the carrier’s documentation explicitly permits a per-$1,000 calculation.',
            },
            { name: 'applicationUrl', label: 'Application link', type: 'text', wide: true },
            { name: 'eApplicationUrl', label: 'e-Application link', type: 'text', wide: true },
            { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
          ]}
        />
      </section>

      {/* ------------------------- Source documents ----------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Source documents ({documents.length})</h2>
        {documents.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Effective</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.title}</td>
                      <td>{doc.docType}</td>
                      <td>{doc.effectiveDate ?? '—'}</td>
                      <td className="mono tiny">{doc.reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <RecordForm
          summary="Reference a source document"
          endpoint="/api/admin/documents"
          constant={{ carrierId }}
          submitLabel="Add document"
          fields={[
            { name: 'title', label: 'Title', type: 'text', required: true },
            {
              name: 'docType',
              label: 'Type',
              type: 'select',
              options: [
                { value: 'underwriting_guide', label: 'Underwriting guide' },
                { value: 'rate_book', label: 'Rate book' },
                { value: 'product_guide', label: 'Product guide' },
                { value: 'state_availability', label: 'State availability' },
                { value: 'build_chart', label: 'Build chart' },
                { value: 'rx_guide', label: 'Prescription guide' },
                { value: 'other', label: 'Other' },
              ],
            },
            { name: 'documentDate', label: 'Document date', type: 'date' },
            { name: 'effectiveDate', label: 'Effective date', type: 'date' },
            {
              name: 'reference',
              label: 'File path or URL',
              type: 'text',
              wide: true,
              help: 'Where the verified PDF lives. Rules cite this document and a page number.',
            },
            { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
          ]}
        />
      </section>

      {/* -------------------------- Underwriting rules -------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Underwriting rules ({rules.length})</h2>
        {rules.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Scope</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th>Effective</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <Link href={`/admin/rules/${rule.id}`} style={{ fontWeight: 650 }}>
                          {rule.conditionCode}
                        </Link>
                        <div className="tiny muted">{rule.ruleCategory}{rule.treatment ? ` · ${rule.treatment}` : ''}</div>
                      </td>
                      <td className="tiny">
                        {rule.productId
                          ? (carrierProducts.find((p) => p.id === rule.productId)?.name ?? `#${rule.productId}`)
                          : 'All products'}
                        <br />
                        {rule.stateCode ?? 'All states'}
                      </td>
                      <td>{rule.result}</td>
                      <td>
                        <StatusBadge status={rule.verificationStatus} />
                        <div className="tiny muted">v{rule.ruleVersion}</div>
                      </td>
                      <td className="tiny">
                        {rule.effectiveDate}
                        {rule.expirationDate ? ` → ${rule.expirationDate}` : ''}
                      </td>
                      <td className="tiny muted">{rule.sourcePage ?? '—'}</td>
                      <td>
                        {rule.verificationStatus === 'draft' ? (
                          <ActionButton
                            url={`/api/admin/rules/${rule.id}/status`}
                            body={{ status: 'verified' }}
                            label="Verify"
                          />
                        ) : rule.verificationStatus === 'verified' ? (
                          <ActionButton
                            url={`/api/admin/rules/${rule.id}/status`}
                            body={{ status: 'archived' }}
                            label="Archive"
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="notice notice-caution">
            No underwriting rules yet. Until a condition has a verified rule, any client who
            reports it comes back as “Requires underwriting verification” rather than a guess.
          </p>
        )}
        <RecordForm
          summary="Add an underwriting rule"
          endpoint="/api/admin/rules"
          constant={{ carrierId }}
          submitLabel="Create draft rule"
          fields={[
            { name: 'conditionCode', label: 'Condition code', type: 'text', required: true, help: 'e.g. diabetes, cancer, cardiac' },
            { name: 'ruleCategory', label: 'Rule category', type: 'text', required: true },
            { name: 'treatment', label: 'Treatment', type: 'text' },
            { name: 'lookbackMonths', label: 'Lookback (months)', type: 'number' },
            { name: 'productId', label: 'Product scope', type: 'select', options: productOptions, help: 'Leave blank for every product.' },
            { name: 'stateCode', label: 'State scope', type: 'select', options: STATE_OPTIONS },
            { name: 'result', label: 'Result', type: 'select', options: RESULT_OPTIONS, required: true },
            { name: 'benefitClassification', label: 'Benefit classification', type: 'select', options: BENEFIT_TYPE_OPTIONS },
            { name: 'priority', label: 'Priority', type: 'number', help: 'Higher wins between equally specific rules.' },
            { name: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
            { name: 'expirationDate', label: 'Expiration date', type: 'date' },
            { name: 'sourceDocumentId', label: 'Source document', type: 'select', options: documentOptions },
            { name: 'sourcePage', label: 'Source page', type: 'text' },
            { name: 'explanation', label: 'Agent-facing explanation', type: 'textarea', required: true, wide: true, help: 'Shown verbatim when this rule drives the result.' },
            { name: 'underwritingConcern', label: 'Underwriting concern', type: 'textarea', wide: true },
            { name: 'criteria', label: 'Criteria (JSON)', type: 'json', wide: true, help: CRITERIA_HELP, placeholder: '{"all":[{"fact":"diabetes.treatment","op":"in","value":["insulin"]}]}' },
          ]}
        />
      </section>

      {/* -------------------------- Medication rules ---------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Medication rules ({medications.length})</h2>
        {medications.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Implies</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {medications.map((rule) => (
                    <tr key={rule.id}>
                      <td className="mono">{rule.medicationName}</td>
                      <td>{rule.impliesConditionCode ?? '—'}</td>
                      <td>{rule.result}</td>
                      <td>
                        <StatusBadge status={rule.verificationStatus} />
                      </td>
                      <td>
                        {rule.verificationStatus === 'draft' ? (
                          <ActionButton
                            url={`/api/admin/medication-rules/${rule.id}/status`}
                            body={{ status: 'verified' }}
                            label="Verify"
                          />
                        ) : (
                          <ActionButton
                            url={`/api/admin/medication-rules/${rule.id}/status`}
                            body={{ status: 'archived' }}
                            label="Archive"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <RecordForm
          summary="Add a medication rule"
          endpoint="/api/admin/medication-rules"
          constant={{ carrierId }}
          submitLabel="Create draft medication rule"
          fields={[
            { name: 'medicationName', label: 'Medication', type: 'text', required: true },
            { name: 'impliesConditionCode', label: 'Implies condition', type: 'text' },
            { name: 'productId', label: 'Product scope', type: 'select', options: productOptions },
            { name: 'result', label: 'Result', type: 'select', options: RESULT_OPTIONS, required: true },
            { name: 'benefitClassification', label: 'Benefit classification', type: 'select', options: BENEFIT_TYPE_OPTIONS },
            { name: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
            { name: 'expirationDate', label: 'Expiration date', type: 'date' },
            { name: 'sourceDocumentId', label: 'Source document', type: 'select', options: documentOptions },
            { name: 'sourcePage', label: 'Source page', type: 'text' },
            { name: 'explanation', label: 'Explanation', type: 'textarea', required: true, wide: true },
          ]}
        />
      </section>
    </div>
  );
}
