/**
 * Loaders for CICA Life, AIG / Corebridge and Transamerica.
 *
 * Same contract as load.ts: everything lands inactive / draft and must be
 * verified by an administrator before it can reach an agent.
 */
import { eq } from 'drizzle-orm';
import type { createDb } from '../client';
import * as schema from '../schema';
import { AIG_CARRIER, AIG_PRODUCTS, AIG_RULES, aigExplanation } from './aig-corebridge';
import { CICA_CARRIER, CICA_PRODUCTS, CICA_RULES, cicaExplanation } from './cica-life';
import {
  TRANSAMERICA_CARRIER,
  TRANSAMERICA_EXCLUDED_STATES,
  TRANSAMERICA_PRODUCTS,
  TRANSAMERICA_RULES,
} from './transamerica';
import {
  FIDELITY_LIFE_CARRIER,
  FIDELITY_LIFE_PRODUCT,
  FIDELITY_LIFE_UNAVAILABLE_STATES,
} from './fidelity-life';
import { FEX_GRADED_RATES, FEX_SELECT_RATES, type FexRateRow } from './transamerica-fex-rates';
import { STATE_CODES } from '../../lib/constants';

type Database = ReturnType<typeof createDb>['db'];

async function resetCarrier(db: Database, slug: string) {
  const [existing] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.slug, slug))
    .limit(1);
  if (existing) await db.delete(schema.carriers).where(eq(schema.carriers.id, existing.id));
}

async function insertRule(
  db: Database,
  values: typeof schema.underwritingRules.$inferInsert,
  adminId: number | null,
) {
  const [row] = await db.insert(schema.underwritingRules).values(values).returning();
  await db.insert(schema.ruleVersions).values({
    ruleId: row.id,
    version: 1,
    action: 'created',
    snapshot: row as never,
    changedByUserId: adminId,
    changedByEmail: 'carrier-import',
  });
  return row;
}

/* -------------------------------------------------------------------------- */
/* CICA Life — Superior Choice                                                 */
/* -------------------------------------------------------------------------- */

export async function loadCicaLife(db: Database, adminId: number | null) {
  await resetCarrier(db, CICA_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: CICA_CARRIER.slug,
      name: CICA_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'Superior Choice loaded from the Risk Assessment Guide (AG-CLA-JULY-2025-130), the Benefits At A Glance sheet and the Corporate Brochure. OUTSTANDING before activation: face amounts, premium rates and state availability — none of the three supplied documents contain them.',
    })
    .returning();

  const [doc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: CICA_CARRIER.riskGuide,
      docType: 'underwriting_guide',
      reference: CICA_CARRIER.riskGuideRef,
      effectiveDate: CICA_CARRIER.effectiveDate,
      notes: 'Condition table marking Standard Issue (SI) and Guaranteed Issue (GI) availability.',
      uploadedByUserId: adminId,
    })
    .returning();

  const productIds: number[] = [];
  for (const [index, spec] of CICA_PRODUCTS.entries()) {
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'inactive',
        minFaceAmount: 3000,
        maxFaceAmount: 25000,
        faceIncrement: 1000,
        ageBasis: 'last_birthday',
        minAge: 0,
        maxAge: 85,
        // The Benefits At A Glance sheet states there are no smoking restrictions.
        tobaccoClasses: ['unismoke'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: spec.simplicityScore,
        rateMethodology: 'exact_only',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    productIds.push(product.id);
  }

  let ruleCount = 0;
  for (const rule of CICA_RULES) {
    // "Standard Issue not available" is a classification, so it applies to the
    // underwritten product; the GI product accepts everyone by definition.
    await insertRule(
      db,
      {
        carrierId: carrier.id,
        productId: null,
        stateCode: null,
        ruleCategory: rule.ruleCategory,
        conditionCode: rule.conditionCode,
        treatment: rule.treatment ?? null,
        lookbackMonths: rule.lookbackMonths ?? null,
        criteria: rule.criteria as never,
        result: rule.result,
        benefitClassification: rule.benefitClassification ?? null,
        explanation: cicaExplanation(rule),
        priority: rule.priority,
        sourceDocumentId: doc.id,
        sourcePage: 'Risk Assessment Guide',
        effectiveDate: CICA_CARRIER.effectiveDate,
        ruleVersion: 1,
        verificationStatus: 'draft',
        isFictionalSample: false,
        createdByUserId: adminId,
      },
      adminId,
    );
    ruleCount += 1;
  }

  console.log(
    `✓ CICA Life: ${CICA_PRODUCTS.length} products, ${ruleCount} draft rules. No face amounts or rates supplied — premiums will read "Rate unavailable".`,
  );
  return carrier;
}

/* -------------------------------------------------------------------------- */
/* AIG / Corebridge — SimpliNow Legacy + GIWL                                  */
/* -------------------------------------------------------------------------- */

export async function loadAigCorebridge(db: Database, adminId: number | null) {
  await resetCarrier(db, AIG_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: AIG_CARRIER.slug,
      name: AIG_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'SimpliNow Legacy and Guaranteed Issue Whole Life loaded from AGLC201453 REV0424 and AGLC200472 REV1224. OUTSTANDING before activation: premium rates (use the SimpliNow Quoter or a rate sheet), SimpliNow face amounts, state availability, the build chart and the prescription decline list.',
    })
    .returning();

  const [siwlDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: AIG_CARRIER.siwlGuide,
      docType: 'underwriting_guide',
      reference: AIG_CARRIER.siwlRef,
      effectiveDate: AIG_CARRIER.effectiveDate,
      notes: 'Condition / sub-condition / time frame / decision table, pp.4-7. Build chart p.8. Prescription decline list p.10.',
      uploadedByUserId: adminId,
    })
    .returning();

  await db.insert(schema.sourceDocuments).values({
    carrierId: carrier.id,
    title: AIG_CARRIER.giwlGuide,
    docType: 'product_guide',
    reference: AIG_CARRIER.giwlRef,
    notes: 'Guaranteed Issue Whole Life product highlights.',
    uploadedByUserId: adminId,
  });

  const underwrittenProductIds: number[] = [];
  for (const [index, spec] of AIG_PRODUCTS.entries()) {
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'inactive',
        minFaceAmount: spec.minFaceAmount,
        maxFaceAmount: spec.maxFaceAmount,
        faceIncrement: 1000,
        ageBasis: 'last_birthday',
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses: ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: 5,
        rateMethodology: 'exact_only',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    if (spec.underwritten) underwrittenProductIds.push(product.id);
  }

  // The SimpliNow underwriting table decides between the two underwritten
  // products. GIWL asks no health questions, so no rule is scoped to it.
  let ruleCount = 0;
  for (const rule of AIG_RULES) {
    for (const productId of underwrittenProductIds) {
      await insertRule(
        db,
        {
          carrierId: carrier.id,
          productId,
          stateCode: null,
          ruleCategory: rule.ruleCategory,
          conditionCode: rule.conditionCode,
          treatment: rule.treatment ?? null,
          lookbackMonths: rule.lookbackMonths ?? null,
          criteria: rule.criteria as never,
          result: rule.result,
          benefitClassification: rule.benefitClassification ?? null,
          explanation: aigExplanation(rule),
          underwritingConcern: rule.concern ?? null,
          priority: rule.priority,
          sourceDocumentId: siwlDoc.id,
          sourcePage: 'pp.4-7',
          effectiveDate: AIG_CARRIER.effectiveDate,
          ruleVersion: 1,
          verificationStatus: 'draft',
          isFictionalSample: false,
          createdByUserId: adminId,
        },
        adminId,
      );
      ruleCount += 1;
    }
  }

  console.log(
    `✓ AIG / Corebridge: ${AIG_PRODUCTS.length} products, ${ruleCount} draft rules. No rate tables supplied — premiums will read "Rate unavailable".`,
  );
  return carrier;
}

/* -------------------------------------------------------------------------- */
/* Transamerica — FE Express Solution                                          */
/* -------------------------------------------------------------------------- */

const FEX_RATES: Record<string, FexRateRow[]> = {
  'fe-express-solution': FEX_SELECT_RATES,
  'graded-fe-express-solution': FEX_GRADED_RATES,
};

export async function loadTransamerica(db: Database, adminId: number | null) {
  await resetCarrier(db, TRANSAMERICA_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: TRANSAMERICA_CARRIER.slug,
      name: TRANSAMERICA_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'FE Express Solution loaded from the Agent Guide (3247945R6) and Products At-A-Glance (3247989R4), including verified rates and state exclusions. OUTSTANDING before activation: the Adult Single Condition Decision Chart and the height/weight chart, which the Agent Guide references but which were not supplied — without them no condition-level underwriting rules can be written.',
    })
    .returning();

  const [agentDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: TRANSAMERICA_CARRIER.agentGuide,
      docType: 'underwriting_guide',
      reference: TRANSAMERICA_CARRIER.agentGuideRef,
      effectiveDate: TRANSAMERICA_CARRIER.effectiveDate,
      notes: 'Underwriting approach and annual premiums per unit.',
      uploadedByUserId: adminId,
    })
    .returning();

  await db.insert(schema.sourceDocuments).values({
    carrierId: carrier.id,
    title: TRANSAMERICA_CARRIER.productGuide,
    docType: 'product_guide',
    reference: TRANSAMERICA_CARRIER.productGuideRef,
    notes: 'Products At-A-Glance, including state availability exclusions.',
    uploadedByUserId: adminId,
  });

  const productIds: number[] = [];
  for (const [index, spec] of TRANSAMERICA_PRODUCTS.entries()) {
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'inactive',
        minFaceAmount: spec.minFaceAmount,
        maxFaceAmount: spec.maxFaceAmount,
        faceIncrement: 1000,
        ageBasis: 'last_birthday',
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses: ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: 5,
        rateMethodology: 'per_thousand',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    productIds.push(product.id);

    for (const limit of spec.faceLimits ?? []) {
      await db.insert(schema.productFaceLimits).values({
        productId: product.id,
        minAge: limit.minAge,
        maxAge: limit.maxAge,
        minFaceAmount: limit.minFaceAmount,
        maxFaceAmount: limit.maxFaceAmount,
        notes: limit.notes,
      });
    }

    // State availability: the Products At-A-Glance lists exclusions, so every
    // other state can be marked available from the document itself.
    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: !TRANSAMERICA_EXCLUDED_STATES.includes(code),
        notes: TRANSAMERICA_EXCLUDED_STATES.includes(code)
          ? 'Listed under "State Availability Exclusions" in the Products At-A-Glance.'
          : null,
      })),
    );

    const [rateTable] = await db
      .insert(schema.rateTables)
      .values({
        productId: product.id,
        stateCode: null,
        benefitType: spec.benefitType,
        effectiveDate: TRANSAMERICA_CARRIER.effectiveDate,
        status: 'draft',
        version: 1,
        monthlyPolicyFee: '0',
        rateBasis: 'annual_per_thousand',
        annualPolicyFee: String(spec.annualPolicyFee),
        monthlyModalFactor: String(spec.monthlyModalFactor),
        sourceDocumentId: agentDoc.id,
        sourcePage: 'rate pages',
        isFictionalSample: false,
        notes: `Annual premiums per unit ($1,000). Monthly premium = (rate x units + $${spec.annualPolicyFee} annual policy fee) x ${spec.monthlyModalFactor}.`,
        createdByUserId: adminId,
      })
      .returning();

    const entries: (typeof schema.rateEntries.$inferInsert)[] = [];
    for (const row of FEX_RATES[spec.slug] ?? []) {
      for (const sex of ['male', 'female'] as const) {
        for (const tobaccoClass of ['non_tobacco', 'tobacco'] as const) {
          entries.push({
            rateTableId: rateTable.id,
            age: row.age,
            sex,
            tobaccoClass,
            faceAmount: 0,
            monthlyPremium: '0',
            ratePerThousand: String(row[sex][tobaccoClass]),
          });
        }
      }
    }
    for (let i = 0; i < entries.length; i += 500) {
      await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
    }
  }

  let ruleCount = 0;
  for (const rule of TRANSAMERICA_RULES) {
    await insertRule(
      db,
      {
        carrierId: carrier.id,
        productId: null,
        stateCode: null,
        ruleCategory: rule.ruleCategory,
        conditionCode: rule.conditionCode,
        criteria: rule.criteria as never,
        result: rule.result,
        benefitClassification: rule.benefitClassification ?? null,
        explanation: rule.explanation,
        underwritingConcern: rule.underwritingConcern ?? null,
        priority: rule.priority,
        sourceDocumentId: agentDoc.id,
        sourcePage: rule.sourcePage.slice(0, 40),
        effectiveDate: TRANSAMERICA_CARRIER.effectiveDate,
        ruleVersion: 1,
        verificationStatus: 'draft',
        isFictionalSample: false,
        createdByUserId: adminId,
      },
      adminId,
    );
    ruleCount += 1;
  }

  console.log(
    `✓ Transamerica: ${TRANSAMERICA_PRODUCTS.length} products, ${ruleCount} draft rules, ` +
      `${FEX_SELECT_RATES.length + FEX_GRADED_RATES.length} verified rate rows, state availability configured from the published exclusions.`,
  );
  return carrier;
}

/* -------------------------------------------------------------------------- */
/* Fidelity Life Association — RAPIDecision Guaranteed Issue                   */
/* -------------------------------------------------------------------------- */

export async function loadFidelityLife(db: Database, adminId: number | null) {
  // The seeded placeholder for this carrier was created as "InstaBrain", which
  // is a Fidelity Life product name rather than the carrier name.
  await resetCarrier(db, FIDELITY_LIFE_CARRIER.placeholderSlug);
  await resetCarrier(db, FIDELITY_LIFE_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: FIDELITY_LIFE_CARRIER.slug,
      name: FIDELITY_LIFE_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'Previously seeded as the "InstaBrain" placeholder; InstaBrain is a Fidelity Life product name, not the carrier. Only a state availability grid was supplied for the final-expense-relevant product (RAPIDecision Guaranteed Issue), so state availability is configured and nothing else is. The InstaBrain Term Producer Guide is term life insurance ($50,000 minimum face, ages 18-60) and is out of scope for this final expense platform.',
    })
    .returning();

  const [doc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: FIDELITY_LIFE_CARRIER.availabilityDoc,
      docType: 'state_availability',
      reference: FIDELITY_LIFE_CARRIER.availabilityRef,
      documentDate: FIDELITY_LIFE_CARRIER.availabilityAsOf,
      notes:
        'Every state marked Yes except Montana. New York and Wyoming are absent — the footnote states Fidelity Life Association does not do business there. Dated 07/10/2019; re-confirm before activation.',
      uploadedByUserId: adminId,
    })
    .returning();
  void doc;

  const [product] = await db
    .insert(schema.products)
    .values({
      carrierId: carrier.id,
      slug: FIDELITY_LIFE_PRODUCT.slug,
      name: FIDELITY_LIFE_PRODUCT.name,
      benefitType: 'guaranteed_issue',
      status: 'inactive',
      minFaceAmount: 3000,
      maxFaceAmount: 25000,
      faceIncrement: 1000,
      ageBasis: 'last_birthday',
      minAge: 50,
      maxAge: 85,
      tobaccoClasses: ['unismoke'],
      sexClasses: ['male', 'female'],
      waitingPeriodMonths: 24,
      simplicityScore: 5,
      rateMethodology: 'exact_only',
      allowInterpolation: false,
      notes: FIDELITY_LIFE_PRODUCT.notes,
      sortOrder: 0,
    })
    .returning();

  await db.insert(schema.productStates).values(
    STATE_CODES.map((code) => ({
      productId: product.id,
      stateCode: code,
      isAvailable: !FIDELITY_LIFE_UNAVAILABLE_STATES.includes(code),
      effectiveDate: FIDELITY_LIFE_CARRIER.availabilityAsOf,
      notes: FIDELITY_LIFE_UNAVAILABLE_STATES.includes(code)
        ? code === 'MT'
          ? 'Marked "No" in the RAPIDecision Guaranteed Issue availability grid.'
          : 'Fidelity Life Association does not do business in this state.'
        : null,
    })),
  );

  const available = STATE_CODES.length - FIDELITY_LIFE_UNAVAILABLE_STATES.length;
  console.log(
    `\u2713 Fidelity Life Association: 1 product, state availability configured (${available} of ${STATE_CODES.length} states). ` +
      `No issue ages, face amounts or rates supplied \u2014 premiums will read "Rate unavailable". InstaBrain Term not loaded (term product, out of scope).`,
  );
  return carrier;
}
