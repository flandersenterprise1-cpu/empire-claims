const MAP: Record<string, string> = {
  active: 'badge-positive',
  inactive: 'badge-neutral',
  verified: 'badge-positive',
  published: 'badge-positive',
  draft: 'badge-caution',
  expired: 'badge-danger',
  archived: 'badge-neutral',
  failed: 'badge-danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${MAP[status] ?? 'badge-neutral'}`}>{status}</span>;
}
