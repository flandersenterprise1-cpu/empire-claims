/**
 * Publishes the carriers whose rates have been verified against the carrier's
 * own printed examples or quoter output, for local demonstration only.
 *
 * This is a development convenience, NOT the review workflow. Publishing for
 * real goes through /admin/carriers/[id]/review so a licensed reviewer reads
 * each rule against its cited source page and the action is versioned and
 * audited. Nothing here should ever run against a production database.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { connectionOptions } from '../src/db/client';

const VERIFIED = ['transamerica', 'american-amicable', 'combined-insurance'];

const sql = postgres(process.env.DATABASE_URL!, connectionOptions(process.env.DATABASE_URL!));
const db = drizzle(sql, { schema });

const carriers = await db
  .select()
  .from(schema.carriers)
  .where(inArray(schema.carriers.slug, VERIFIED));

for (const carrier of carriers) {
  await db
    .update(schema.carriers)
    .set({ status: 'active', isVerified: true })
    .where(eq(schema.carriers.id, carrier.id));
  await db
    .update(schema.products)
    .set({ status: 'active' })
    .where(eq(schema.products.carrierId, carrier.id));
  await db
    .update(schema.underwritingRules)
    .set({ verificationStatus: 'verified' })
    .where(
      and(
        eq(schema.underwritingRules.carrierId, carrier.id),
        eq(schema.underwritingRules.verificationStatus, 'draft'),
      ),
    );
  await db
    .update(schema.medicationRules)
    .set({ verificationStatus: 'verified' })
    .where(
      and(
        eq(schema.medicationRules.carrierId, carrier.id),
        eq(schema.medicationRules.verificationStatus, 'draft'),
      ),
    );
  const products = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.carrierId, carrier.id));
  for (const product of products) {
    await db
      .update(schema.rateTables)
      .set({ status: 'published' })
      .where(eq(schema.rateTables.productId, product.id));
  }
  console.log(`published ${carrier.name}`);
}
await sql.end();
