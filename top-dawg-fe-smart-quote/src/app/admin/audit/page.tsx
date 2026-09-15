import { getDb } from '@/db/client';
import { adminGuard } from '@/lib/admin-guard';
import { listAudit } from '@/modules/audit';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  await adminGuard();
  const entries = await listAudit(getDb(), { limit: 250 });

  return (
    <div className="stack-lg">
      <div>
        <h1 style={{ fontSize: '1.5rem' }}>Audit log</h1>
        <p className="muted small" style={{ marginTop: '0.3rem' }}>
          Who changed a rule, what changed, when, and which version was published. Newest first.
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Version</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="tiny">
                    {entry.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="tiny">{entry.actorEmail ?? 'system'}</td>
                  <td className="tiny mono">{entry.action}</td>
                  <td className="tiny">
                    {entry.entityType}
                    {entry.entityId ? ` #${entry.entityId}` : ''}
                  </td>
                  <td className="tiny">{entry.entityVersion ?? '—'}</td>
                  <td className="small">{entry.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 ? <p className="muted small">Nothing logged yet.</p> : null}
    </div>
  );
}
