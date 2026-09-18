/**
 * Carrier module publishing.
 *
 * A carrier only goes live once an administrator has loaded verified source
 * documentation, rules and rate tables — and the system checks, rather than
 * trusting, before it flips the switch.
 */
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { recordAudit, type AuditActor } from '@/modules/audit';
import type { Db } from '@/modules/catalog/repository';

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CarrierReadiness {
  carrierId: number;
  carrierName: string;
  checks: ReadinessCheck[];
  ready: boolean;
}

export async function carrierReadiness(db: Db, carrierId: number): Promise<CarrierReadiness> {
  const [carrier] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.id, carrierId))
    .limit(1);
  if (!carrier) throw new Error(`Carrier ${carrierId} not found.`);

  const products = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.carrierId, carrierId));
  const productIds = products.map((p) => p.id);

  const [documents, rules, states, rateTables] = await Promise.all([
    db.select().from(schema.sourceDocuments).where(eq(schema.sourceDocuments.carrierId, carrierId)),
    db.select().from(schema.underwritingRules).where(eq(schema.underwritingRules.carrierId, carrierId)),
    productIds.length
      ? db.select().from(schema.productStates)
      : Promise.resolve([] as (typeof schema.productStates.$inferSelect)[]),
    productIds.length
      ? db.select().from(schema.rateTables)
      : Promise.resolve([] as (typeof schema.rateTables.$inferSelect)[]),
  ]);

  const myStates = states.filter((s) => productIds.includes(s.productId) && s.isAvailable);
  const myRateTables = rateTables.filter((t) => productIds.includes(t.productId));
  const verifiedRules = rules.filter((r) => r.verificationStatus === 'verified');
  const publishedRates = myRateTables.filter((t) => t.status === 'published');

  const checks: ReadinessCheck[] = [
    {
      key: 'source_documents',
      label: 'Source documentation on file',
      passed: documents.length > 0,
      detail: `${documents.length} document(s) referenced.`,
    },
    {
      key: 'products',
      label: 'At least one product configured',
      passed: products.length > 0,
      detail: `${products.length} product(s).`,
    },
    {
      key: 'states',
      label: 'State availability configured',
      passed: myStates.length > 0,
      detail: `${myStates.length} product/state combination(s) marked available.`,
    },
    {
      key: 'verified_rules',
      label: 'Verified underwriting rules',
      passed: verifiedRules.length > 0,
      detail: `${verifiedRules.length} of ${rules.length} rule(s) verified.`,
    },
    {
      key: 'published_rates',
      label: 'Published rate table',
      passed: publishedRates.length > 0,
      detail: `${publishedRates.length} of ${myRateTables.length} rate table(s) published.`,
    },
  ];

  return {
    carrierId,
    carrierName: carrier.name,
    checks,
    ready: checks.every((c) => c.passed),
  };
}

export async function publishCarrier(db: Db, carrierId: number, actor: AuditActor | null) {
  const readiness = await carrierReadiness(db, carrierId);
  if (!readiness.ready) {
    const failed = readiness.checks.filter((c) => !c.passed).map((c) => c.label);
    throw new Error(`Carrier is not ready to publish. Outstanding: ${failed.join('; ')}.`);
  }

  const [before] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.id, carrierId))
    .limit(1);

  const [carrier] = await db
    .update(schema.carriers)
    .set({
      status: 'active',
      isVerified: true,
      publishedVersion: (before?.publishedVersion ?? 0) + 1,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.carriers.id, carrierId))
    .returning();

  await recordAudit(db, {
    actor,
    action: 'carrier.publish',
    entityType: 'carrier',
    entityId: carrierId,
    entityVersion: carrier.publishedVersion,
    summary: `Published verified carrier module v${carrier.publishedVersion}`,
    before,
    after: carrier,
  });

  return carrier;
}

export async function setCarrierActivation(
  db: Db,
  carrierId: number,
  status: 'active' | 'inactive',
  actor: AuditActor | null,
) {
  const [before] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.id, carrierId))
    .limit(1);
  if (!before) throw new Error(`Carrier ${carrierId} not found.`);

  if (status === 'active' && !before.isVerified) {
    throw new Error('Publish a verified carrier module before activating this carrier.');
  }

  const [carrier] = await db
    .update(schema.carriers)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.carriers.id, carrierId))
    .returning();

  await recordAudit(db, {
    actor,
    action: `carrier.${status === 'active' ? 'activate' : 'deactivate'}`,
    entityType: 'carrier',
    entityId: carrierId,
    summary: `Carrier ${status}`,
    before,
    after: carrier,
  });
  return carrier;
}

export async function setProductActivation(
  db: Db,
  productId: number,
  status: 'active' | 'inactive',
  actor: AuditActor | null,
) {
  const [before] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);
  if (!before) throw new Error(`Product ${productId} not found.`);

  const [product] = await db
    .update(schema.products)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.products.id, productId))
    .returning();

  await recordAudit(db, {
    actor,
    action: `product.${status === 'active' ? 'activate' : 'deactivate'}`,
    entityType: 'product',
    entityId: productId,
    summary: `Product ${status}`,
    before,
    after: product,
  });
  return product;
}
