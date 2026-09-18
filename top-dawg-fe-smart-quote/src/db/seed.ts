/**
 * Seeds the database.
 *
 * Creates: the bootstrap administrator, the eight real carriers as INACTIVE
 * placeholders (no products, no rates, no rules), the universal health
 * interview, and — only when SEED_DEMO_CARRIER=true — one clearly labelled
 * FICTIONAL carrier so the engine can be demonstrated and tested.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDb } from './client';
import * as schema from './schema';
import { SEED_CARRIERS } from './seed-data/carriers';
import { SEED_QUESTIONS } from './seed-data/health-questions';
import {
  DEMO_CARRIER,
  DEMO_MEDICATION_RULES,
  DEMO_PRODUCTS,
  DEMO_RATE_BASIS,
  DEMO_RULES,
} from './seed-data/demo-carrier';
import { STATE_CODES } from '../lib/constants';
import { hashPassword } from '../modules/auth';

type Database = ReturnType<typeof createDb>['db'];

const TODAY = new Date().toISOString().slice(0, 10);

async function seedAdmin(db: Database) {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@topdawg.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2024';

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) {
    console.log(`• Administrator ${email} already exists.`);
    return existing;
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
      displayName: 'Top Dawg Administrator',
    })
    .returning();
  console.log(`✓ Administrator created: ${email}`);
  return user;
}

async function seedCarrierPlaceholders(db: Database) {
  for (const carrier of SEED_CARRIERS) {
    await db
      .insert(schema.carriers)
      .values({
        slug: carrier.slug,
        name: carrier.name,
        status: 'inactive',
        isVerified: false,
        isFictionalSample: false,
        notes: carrier.notes,
      })
      .onConflictDoNothing({ target: schema.carriers.slug });
  }
  console.log(`✓ ${SEED_CARRIERS.length} carrier placeholders present (all INACTIVE, no rates, no rules).`);
}

async function seedQuestions(db: Database) {
  const idByCode = new Map<string, number>();

  for (const question of SEED_QUESTIONS) {
    const [row] = await db
      .insert(schema.healthQuestions)
      .values({
        code: question.code,
        category: question.category,
        prompt: question.prompt,
        helpText: question.helpText ?? null,
        answerType: question.answerType,
        options: question.options ?? null,
        isRequired: question.isRequired ?? true,
        sortOrder: question.sortOrder,
        isActive: true,
        showWhen: (question.showWhen ?? null) as never,
        factPath: question.factPath,
      })
      .onConflictDoUpdate({
        target: schema.healthQuestions.code,
        set: {
          category: question.category,
          prompt: question.prompt,
          helpText: question.helpText ?? null,
          answerType: question.answerType,
          options: (question.options ?? null) as never,
          isRequired: question.isRequired ?? true,
          sortOrder: question.sortOrder,
          showWhen: (question.showWhen ?? null) as never,
          factPath: question.factPath,
          updatedAt: new Date(),
        },
      })
      .returning();
    idByCode.set(question.code, row.id);
  }

  for (const question of SEED_QUESTIONS) {
    if (!question.parentCode) continue;
    const id = idByCode.get(question.code);
    const parentId = idByCode.get(question.parentCode);
    if (id && parentId) {
      await db
        .update(schema.healthQuestions)
        .set({ parentQuestionId: parentId })
        .where(eq(schema.healthQuestions.id, id));
    }
  }

  console.log(`✓ ${SEED_QUESTIONS.length} health questions seeded (gates + conditional follow-ups).`);
}

function fictionalMonthlyPremium(
  benefitType: 'level' | 'graded' | 'guaranteed_issue',
  sex: 'male' | 'female',
  tobacco: 'non_tobacco' | 'tobacco',
  age: number,
  faceAmount: number,
): number {
  const basis = DEMO_RATE_BASIS[benefitType][sex][tobacco];
  const perThousand = basis * (1 + (age - 50) * 0.055);
  const premium = (faceAmount / 1000) * perThousand;
  return Math.round(premium * 100) / 100;
}

async function seedDemoCarrier(db: Database, adminId: number) {
  // Rebuild from scratch so the demo data is always internally consistent.
  const [existing] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.slug, DEMO_CARRIER.slug))
    .limit(1);
  if (existing) {
    await db.delete(schema.carriers).where(eq(schema.carriers.id, existing.id));
  }

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: DEMO_CARRIER.slug,
      name: DEMO_CARRIER.name,
      status: 'active',
      isVerified: true,
      isFictionalSample: true,
      notes: DEMO_CARRIER.notes,
      publishedVersion: 1,
      publishedAt: new Date(),
    })
    .returning();

  const [document] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: 'FICTIONAL Sample Mutual underwriting guide (demo only)',
      docType: 'underwriting_guide',
      reference: 'internal://demo/sample-mutual-uw-guide',
      documentDate: TODAY,
      effectiveDate: TODAY,
      notes: 'Invented content used only to demonstrate and test the rules engine.',
      uploadedByUserId: adminId,
    })
    .returning();

  const productIdBySlug = new Map<string, number>();

  for (const [index, spec] of DEMO_PRODUCTS.entries()) {
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'active',
        minFaceAmount: spec.minFaceAmount,
        maxFaceAmount: spec.maxFaceAmount,
        faceIncrement: spec.faceIncrement,
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses:
          spec.benefitType === 'guaranteed_issue' ? ['unismoke'] : ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: spec.simplicityScore,
        rateMethodology: 'exact_only',
        allowInterpolation: false,
        applicationUrl: 'https://example.invalid/fictional-demo-application',
        notes: 'FICTIONAL demo product.',
        sortOrder: index,
      })
      .returning();
    productIdBySlug.set(spec.slug, product.id);

    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        // One deliberate gap so state-availability filtering is visible in the demo.
        isAvailable: code !== 'NY',
        effectiveDate: '2020-01-01',
        notes: code === 'NY' ? 'FICTIONAL: not filed in New York.' : null,
      })),
    );

    for (const limit of spec.faceLimits ?? []) {
      await db.insert(schema.productFaceLimits).values({
        productId: product.id,
        minAge: limit.minAge,
        maxAge: limit.maxAge,
        minFaceAmount: limit.minFaceAmount,
        maxFaceAmount: limit.maxFaceAmount,
        notes: 'FICTIONAL age-banded face cap.',
      });
    }

    /* ------------------------------ Rate table --------------------------- */
    const [rateTable] = await db
      .insert(schema.rateTables)
      .values({
        productId: product.id,
        stateCode: null,
        benefitType: spec.benefitType,
        effectiveDate: '2020-01-01',
        status: 'published',
        version: 1,
        monthlyPolicyFee: '0',
        sourceDocumentId: document.id,
        sourcePage: 'Demo rate book p.1',
        isFictionalSample: true,
        notes: 'FICTIONAL rates. Not a real premium.',
        createdByUserId: adminId,
      })
      .returning();

    const entries: (typeof schema.rateEntries.$inferInsert)[] = [];
    const tobaccoClasses: Array<'non_tobacco' | 'tobacco' | 'unismoke'> =
      spec.benefitType === 'guaranteed_issue' ? ['unismoke'] : ['non_tobacco', 'tobacco'];

    for (let age = spec.minAge; age <= spec.maxAge; age += 1) {
      for (const sex of ['male', 'female'] as const) {
        for (const tobaccoClass of tobaccoClasses) {
          for (
            let face = spec.minFaceAmount;
            face <= spec.maxFaceAmount;
            face += spec.faceIncrement
          ) {
            const premium = fictionalMonthlyPremium(
              spec.benefitType as 'level' | 'graded' | 'guaranteed_issue',
              sex,
              tobaccoClass === 'tobacco' ? 'tobacco' : 'non_tobacco',
              age,
              face,
            );
            entries.push({
              rateTableId: rateTable.id,
              age,
              sex,
              tobaccoClass,
              faceAmount: face,
              monthlyPremium: String(premium),
              annualPremium: String(Math.round(premium * 12 * 100) / 100),
            });
          }
        }
      }
    }

    const CHUNK = 1000;
    for (let i = 0; i < entries.length; i += CHUNK) {
      await db.insert(schema.rateEntries).values(entries.slice(i, i + CHUNK));
    }
    console.log(`  · ${spec.name}: ${entries.length} FICTIONAL rate rows.`);
  }

  /* -------------------------------- Rules -------------------------------- */
  let ruleCount = 0;
  for (const rule of DEMO_RULES) {
    const targets = rule.products ?? [null];
    for (const slug of targets) {
      const [row] = await db
        .insert(schema.underwritingRules)
        .values({
          carrierId: carrier.id,
          productId: slug ? (productIdBySlug.get(slug) ?? null) : null,
          stateCode: null,
          ruleCategory: rule.ruleCategory,
          conditionCode: rule.conditionCode,
          treatment: rule.treatment ?? null,
          lookbackMonths: rule.lookbackMonths ?? null,
          criteria: rule.criteria as never,
          result: rule.result,
          benefitClassification: rule.benefitClassification ?? null,
          explanation: rule.explanation,
          underwritingConcern: rule.underwritingConcern ?? null,
          priority: rule.priority ?? 100,
          sourceDocumentId: document.id,
          sourcePage: rule.sourcePage,
          effectiveDate: '2020-01-01',
          lastReviewedAt: TODAY,
          ruleVersion: 1,
          verificationStatus: 'verified',
          isFictionalSample: true,
          createdByUserId: adminId,
          publishedByUserId: adminId,
          publishedAt: new Date(),
        })
        .returning();

      await db.insert(schema.ruleVersions).values({
        ruleId: row.id,
        version: 1,
        action: 'published',
        snapshot: row as never,
        changedByUserId: adminId,
        changedByEmail: 'seed',
      });
      ruleCount += 1;
    }
  }

  for (const med of DEMO_MEDICATION_RULES) {
    await db.insert(schema.medicationRules).values({
      carrierId: carrier.id,
      medicationName: med.medicationName,
      impliesConditionCode: med.impliesConditionCode ?? null,
      result: med.result,
      benefitClassification: med.benefitClassification ?? null,
      explanation: med.explanation,
      sourceDocumentId: document.id,
      sourcePage: med.sourcePage,
      effectiveDate: '2020-01-01',
      lastReviewedAt: TODAY,
      verificationStatus: 'verified',
      isFictionalSample: true,
      createdByUserId: adminId,
    });
  }

  console.log(
    `✓ FICTIONAL demo carrier seeded: ${DEMO_PRODUCTS.length} products, ${ruleCount} underwriting rules, ${DEMO_MEDICATION_RULES.length} medication rules.`,
  );
}

export async function runSeed(db: Database, options: { demoCarrier: boolean }) {
  const admin = await seedAdmin(db);
  await seedCarrierPlaceholders(db);
  await seedQuestions(db);
  if (options.demoCarrier) {
    await seedDemoCarrier(db, admin.id);
  } else {
    console.log('• Skipping the fictional demo carrier (SEED_DEMO_CARRIER is not "true").');
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const { db, sql } = createDb(url);
  try {
    await runSeed(db, { demoCarrier: process.env.SEED_DEMO_CARRIER === 'true' });
    console.log('\nSeed complete.');
  } finally {
    await sql.end();
  }
}

const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
