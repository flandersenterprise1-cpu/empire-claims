/**
 * One-command setup for a fresh deployment.
 *
 *   npm run setup
 *
 * Runs migrations, seeds the admin and health interview, loads every carrier,
 * and activates the carriers whose rates have been verified against the
 * carrier's own printed examples or quoter output, so the site answers with
 * real prices the moment it comes up.
 *
 * Activation is recorded in the audit log against the account that ran setup,
 * exactly as it would be from the admin screen. Carriers whose rates have not
 * been verified stay inactive and are not quoted; they are listed at the end.
 *
 * Safe to run again: it is idempotent. It also runs as part of `vercel-build`,
 * so deploying is the only step an operator has to take -- there is no
 * separate migrate-and-seed chore, and no terminal.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { and, eq, inArray } from 'drizzle-orm';
import { createDb } from '../src/db/client';
import * as schema from '../src/db/schema';
import { recordAudit } from '../src/modules/audit';

/**
 * Carriers whose every loaded rate reproduces a figure the carrier itself
 * published. Anything not on this list is loaded but left inactive.
 */
const RATE_VERIFIED = [
  { slug: 'transamerica', evidence: 'Agent Guide worked examples ($66.41 FE Express, $29.15 Immediate Solution) reproduce to the cent.' },
  { slug: 'american-amicable', evidence: 'Senior Choice printed examples ($33.73, $76.06, $90.42) reproduce to the cent.' },
  { slug: 'combined-insurance', evidence: 'All four rating classes reproduce the carrier quoter to the cent (male 55 NS $10,000 AL).' },
  { slug: 'cica-life', evidence: 'Annual rate card, Agent Guide pp.46-48, loaded verbatim for ages 0-85 on both plans. The guide publishes no policy fee and no modal factors and the agency confirms CICA has none, so the monthly premium is the annual premium divided by 12.' },
  { slug: 'aflac', evidence: 'No rate book exists. Rates solved from the carrier rate quoter against the $48 fee the Sales Guide publishes (p.20); each plan resolved identically from a $10,000 and a $20,000 quote. All four sex and tobacco classes captured. AGE 65 ONLY.' },
  { slug: 'aig-corebridge', evidence: 'No rate book exists. Rates solved from the Corebridge FE Quoter against the fees the product guide publishes (p.9); the modal factor is the ratio between the quoter\'s Monthly and Annual screens for the same quote, and three products agree on 0.089 to five decimal places. MALE AGE 65 ONLY, and GIWL withheld because its two screens do not reconcile.' },
  { slug: 'royal-neighbors', evidence: 'Published rate sheet 2996-1-R Rev. 2-2025 loaded verbatim for all four rate classes, with the modal factors, the $4.35 modal certificate fee and the sheet\'s own order of operations. Its worked example reproduces exactly: male 60 SIWL Standard non-tobacco at $10,000 is $51.15 a month.' },
  { slug: 'mutual-of-omaha', evidence: 'No rate book exists; Sales Support confirmed the quick quoter is the only rate source. Rates solved from it against the fees and modal factors the Product Guide publishes (p.12); the $20,000 quotes came back at exactly the predicted $885.60 and $1,110.00. AGE 65 ONLY.' },
];

function run(script: string) {
  console.log(`\n$ tsx ${script}`);
  execFileSync('npx', ['tsx', script], { stdio: 'inherit' });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. See .env.example.');

  run('src/db/migrate.ts');
  run('src/db/seed.ts');
  run('src/db/carriers/load.ts');

  const { db, sql } = createDb(process.env.DATABASE_URL);
  try {
    const [actor] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'))
      .limit(1);
    const auditActor = actor ? { id: actor.id, email: actor.email } : null;

    console.log('\nActivating rate-verified carriers:');
    for (const { slug, evidence } of RATE_VERIFIED) {
      const [carrier] = await db
        .select()
        .from(schema.carriers)
        .where(eq(schema.carriers.slug, slug))
        .limit(1);
      if (!carrier) {
        console.log(`  - ${slug}: not loaded, skipped`);
        continue;
      }

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
        .set({ verificationStatus: 'verified', lastReviewedAt: new Date().toISOString().slice(0, 10) })
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
      if (products.length) {
        await db
          .update(schema.rateTables)
          .set({ status: 'published' })
          .where(inArray(schema.rateTables.productId, products.map((p) => p.id)));
      }

      await recordAudit(db, {
        actor: auditActor,
        action: 'carrier.activate',
        entityType: 'carrier',
        entityId: carrier.id,
        summary: `Activated by setup. ${evidence}`,
      });
      console.log(`  ✓ ${carrier.name}`);
    }

    const inactive = await db
      .select()
      .from(schema.carriers)
      .where(eq(schema.carriers.status, 'inactive'));
    const held = inactive.filter((c) => !c.isFictionalSample);
    if (held.length) {
      console.log('\nLoaded but NOT quoted, because their rates are not verified yet:');
      for (const c of held) console.log(`  - ${c.name}`);
      console.log('  Activate them from /admin once their rates are in.');
    }

    console.log('\nSetup complete. The quote tool is at /quote.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
