import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  carriers,
  productFaceLimits,
  productStates,
  products,
  rateEntries,
  rateImports,
  rateTables,
  sourceDocuments,
} from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { ActionButton } from '@/components/admin/ActionButton';
import { RecordForm } from '@/components/admin/RecordForm';
import { RateImportForm } from '@/components/admin/RateImportForm';
import { StateGrid } from '@/components/admin/StateGrid';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { BENEFIT_TYPE_OPTIONS, STATE_OPTIONS } from '@/components/admin/field-options';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await adminGuard();
  const productId = Number((await params).id);
  const db = getDb();

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) notFound();

  const [[carrier], states, faceLimits, tables, imports, documents] = await Promise.all([
    db.select().from(carriers).where(eq(carriers.id, product.carrierId)).limit(1),
    db.select().from(productStates).where(eq(productStates.productId, productId)),
    db.select().from(productFaceLimits).where(eq(productFaceLimits.productId, productId)),
    db
      .select()
      .from(rateTables)
      .where(eq(rateTables.productId, productId))
      .orderBy(desc(rateTables.version)),
    db
      .select()
      .from(rateImports)
      .where(eq(rateImports.productId, productId))
      .orderBy(desc(rateImports.createdAt))
      .limit(10),
    db.select().from(sourceDocuments).where(eq(sourceDocuments.carrierId, product.carrierId)),
  ]);

  const entryCounts = tables.length
    ? await db
        .select({ rateTableId: rateEntries.rateTableId, count: sql<number>`count(*)::int` })
        .from(rateEntries)
        .groupBy(rateEntries.rateTableId)
    : [];

  const documentOptions = documents.map((doc) => ({ value: String(doc.id), label: doc.title }));

  return (
    <div className="stack-lg">
      <div>
        <Link href={`/admin/carriers/${product.carrierId}`} className="small muted">
          ← {carrier?.name}
        </Link>
        <h1 style={{ fontSize: '1.5rem', marginTop: '0.4rem' }}>{product.name}</h1>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={product.status} />
          <span className="badge badge-neutral">{product.benefitType.replace(/_/g, ' ')}</span>
          <span className="badge badge-neutral">
            ages {product.minAge}–{product.maxAge}
          </span>
          <span className="badge badge-neutral">
            ${product.minFaceAmount.toLocaleString()}–${product.maxFaceAmount.toLocaleString()} in $
            {product.faceIncrement.toLocaleString()}
          </span>
        </div>
      </div>

      <RecordForm
        alwaysOpen
        endpoint={`/api/admin/products/${productId}`}
        method="PATCH"
        submitLabel="Save product"
        initial={product as unknown as Record<string, unknown>}
        fields={[
          { name: 'name', label: 'Product name', type: 'text', required: true },
          { name: 'benefitType', label: 'Benefit type', type: 'select', options: BENEFIT_TYPE_OPTIONS },
          { name: 'minAge', label: 'Minimum issue age', type: 'number' },
          { name: 'maxAge', label: 'Maximum issue age', type: 'number' },
          { name: 'minFaceAmount', label: 'Minimum face amount', type: 'number' },
          { name: 'maxFaceAmount', label: 'Maximum face amount', type: 'number' },
          { name: 'faceIncrement', label: 'Face increment', type: 'number' },
          { name: 'waitingPeriodMonths', label: 'Waiting period (months)', type: 'number' },
          { name: 'simplicityScore', label: 'Application simplicity (1–5)', type: 'number' },
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
            help: 'Off means a missing rate row shows “Rate unavailable” instead of a calculated price.',
          },
          { name: 'applicationUrl', label: 'Application link', type: 'text', wide: true },
          { name: 'eApplicationUrl', label: 'e-Application link', type: 'text', wide: true },
          { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
        ]}
      />

      <StateGrid
        productId={productId}
        available={states.filter((state) => state.isAvailable).map((state) => state.stateCode)}
      />

      {/* --------------------------- Face limits -------------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Age-banded face limits</h2>
        {faceLimits.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Ages</th>
                    <th>Face range</th>
                    <th>State</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {faceLimits.map((limit) => (
                    <tr key={limit.id}>
                      <td>
                        {limit.minAge}–{limit.maxAge}
                      </td>
                      <td>
                        ${limit.minFaceAmount.toLocaleString()}–$
                        {limit.maxFaceAmount.toLocaleString()}
                      </td>
                      <td>{limit.stateCode ?? 'All'}</td>
                      <td>
                        <ActionButton
                          url={`/api/admin/face-limits/${limit.id}`}
                          method="DELETE"
                          label="Remove"
                          confirm="Remove this age-banded limit?"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="muted small">
            None. The product-level minimum and maximum apply at every issue age.
          </p>
        )}
        <RecordForm
          summary="Add an age-banded face limit"
          endpoint="/api/admin/face-limits"
          constant={{ productId }}
          submitLabel="Add limit"
          fields={[
            { name: 'minAge', label: 'From age', type: 'number', required: true },
            { name: 'maxAge', label: 'To age', type: 'number', required: true },
            { name: 'minFaceAmount', label: 'Minimum face', type: 'number', required: true },
            { name: 'maxFaceAmount', label: 'Maximum face', type: 'number', required: true },
            { name: 'stateCode', label: 'State (optional)', type: 'select', options: STATE_OPTIONS },
            { name: 'notes', label: 'Notes', type: 'text', wide: true },
          ]}
        />
      </section>

      {/* ---------------------------- Rate tables ------------------------- */}
      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>Rate tables</h2>
        {tables.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Benefit</th>
                    <th>State</th>
                    <th>Effective</th>
                    <th>Rows</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.id}>
                      <td>v{table.version}</td>
                      <td>{table.benefitType.replace(/_/g, ' ')}</td>
                      <td>{table.stateCode ?? 'All'}</td>
                      <td className="tiny">
                        {table.effectiveDate}
                        {table.endDate ? ` → ${table.endDate}` : ''}
                      </td>
                      <td>{entryCounts.find((c) => c.rateTableId === table.id)?.count ?? 0}</td>
                      <td>${Number(table.monthlyPolicyFee).toFixed(2)}</td>
                      <td>
                        <StatusBadge status={table.status} />
                        {table.isFictionalSample ? (
                          <div>
                            <span className="badge badge-danger">fictional</span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {table.status === 'draft' ? (
                          <ActionButton
                            url={`/api/admin/rate-tables/${table.id}/publish`}
                            label="Publish"
                            className="btn btn-sm btn-gold"
                            confirm="Publish this rate table? The currently published table for the same state and benefit type will be archived."
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
            No rate tables. Until one is published, every result for this product reads “Rate
            unavailable” — the engine never estimates a premium.
          </p>
        )}

        <RateImportForm
          productId={productId}
          benefitType={product.benefitType}
          documents={documentOptions}
        />

        {imports.length > 0 ? (
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Recent imports</summary>
            <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((row) => (
                    <tr key={row.id}>
                      <td className="mono tiny">{row.filename}</td>
                      <td>{row.acceptedCount}</td>
                      <td>{row.rejectedCount}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="tiny">{row.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
