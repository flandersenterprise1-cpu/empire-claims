/**
 * Audit log. Every administrative mutation records who changed what, when,
 * and which version was published.
 */
import { desc, eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Db } from '@/modules/catalog/repository';

export interface AuditActor {
  id: number;
  email: string;
}

export interface AuditEntry {
  actor: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  entityVersion?: number | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

export async function recordAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(schema.auditLog).values({
    actorUserId: entry.actor?.id ?? null,
    actorEmail: entry.actor?.email ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId == null ? null : String(entry.entityId),
    entityVersion: entry.entityVersion ?? null,
    summary: entry.summary ?? null,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
    ipAddress: entry.ipAddress ?? null,
  });
}

export async function listAudit(
  db: Db,
  options: { entityType?: string; entityId?: string; limit?: number } = {},
) {
  const limit = Math.min(options.limit ?? 100, 500);
  const filters = [];
  if (options.entityType) filters.push(eq(schema.auditLog.entityType, options.entityType));
  if (options.entityId) filters.push(eq(schema.auditLog.entityId, options.entityId));

  const query = db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(limit);
  if (filters.length > 0) return query.where(and(...filters));
  return query;
}
