import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { carriers, medicationRules, products, rateTables, underwritingRules } from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { ActionButton } from '@/components/admin/ActionButton';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { CreateCarrierForm } from '@/components/admin/CreateCarrierForm';
import { SignOutButton } from '@/components/admin/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await adminGuard();
  const db = getDb();

  const rows = await db.select().from(carriers).orderBy(asc(carriers.name));
  const productCounts = await db
    .select({ carrierId: products.carrierId, count: sql<number>`count(*)::int` })
    .from(products)
    .groupBy(products.carrierId);
  const ruleCounts = await db
    .select({
      carrierId: underwritingRules.carrierId,
      total: sql<number>`count(*)::int`,
      verified: sql<number>`count(*) filter (where ${underwritingRules.verificationStatus} = 'verified')::int`,
    })
    .from(underwritingRules)
    .groupBy(underwritingRules.carrierId);
  const medCounts = await db
    .select({ carrierId: medicationRules.carrierId, count: sql<number>`count(*)::int` })
    .from(medicationRules)
    .groupBy(medicationRules.carrierId);
  const publishedRates = await db
    .select({ productId: rateTables.productId, count: sql<number>`count(*)::int` })
    .from(rateTables)
    .where(eq(rateTables.status, 'published'))
    .groupBy(rateTables.productId);
  const allProducts = await db.select().from(products);

  const ratedProductIds = new Set(publishedRates.map((r) => r.productId));

  return (
    <div className="stack-lg">
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Carriers</h1>
          <p className="muted small" style={{ marginTop: '0.3rem' }}>
            Signed in as {user.email}. A carrier stays inactive until a verified module is
            published.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Status</th>
                <th>Products</th>
                <th>Rules (verified)</th>
                <th>Rx rules</th>
                <th>Rated products</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((carrier) => {
                const carrierProducts = allProducts.filter((p) => p.carrierId === carrier.id);
                const rules = ruleCounts.find((r) => r.carrierId === carrier.id);
                return (
                  <tr key={carrier.id}>
                    <td>
                      <Link href={`/admin/carriers/${carrier.id}`} style={{ fontWeight: 650 }}>
                        {carrier.name}
                      </Link>
                      <div className="tiny mono muted">{carrier.slug}</div>
                      {carrier.isFictionalSample ? (
                        <span className="badge badge-danger" style={{ marginTop: '0.3rem' }}>
                          fictional sample
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge status={carrier.status} />
                      {carrier.isVerified ? (
                        <div style={{ marginTop: '0.3rem' }}>
                          <span className="badge badge-positive">
                            published v{carrier.publishedVersion}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td>{productCounts.find((p) => p.carrierId === carrier.id)?.count ?? 0}</td>
                    <td>
                      {rules?.total ?? 0} ({rules?.verified ?? 0})
                    </td>
                    <td>{medCounts.find((m) => m.carrierId === carrier.id)?.count ?? 0}</td>
                    <td>
                      {carrierProducts.filter((p) => ratedProductIds.has(p.id)).length}/
                      {carrierProducts.length}
                    </td>
                    <td>
                      {carrier.status === 'active' ? (
                        <ActionButton
                          url={`/api/admin/carriers/${carrier.id}/activation`}
                          body={{ status: 'inactive' }}
                          label="Deactivate"
                        />
                      ) : (
                        <ActionButton
                          url={`/api/admin/carriers/${carrier.id}/activation`}
                          body={{ status: 'active' }}
                          label="Activate"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCarrierForm />
    </div>
  );
}
