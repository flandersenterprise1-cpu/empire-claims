/**
 * Loaders for CICA Life, AIG / Corebridge and Transamerica.
 *
 * Same contract as load.ts: everything lands inactive / draft and must be
 * verified by an administrator before it can reach an agent.
 */
import { eq } from 'drizzle-orm';
import type { createDb } from '../client';
import * as schema from '../schema';
import {
  AIG_CARRIER,
  AIG_EXCLUDED_STATES,
  AIG_FOOTPRINT_CAVEAT,
  AIG_PRODUCTS,
  AIG_RULES,
  aigExplanation,
} from './aig-corebridge';
import { CICA_CARRIER, CICA_PRODUCTS, CICA_RULES, cicaExplanation } from './cica-life';
import {
  CICA_APPROVED_STATES,
  CICA_GUARANTEED_FACE_BANDS,
  CICA_GUARANTEED_RATES,
  CICA_PARTIAL_STATES,
  CICA_STANDARD_FACE_BANDS,
  CICA_STANDARD_RATES,
  type CicaFaceBand,
  type CicaRateRow,
} from './cica-rates';
import {
  TRANSAMERICA_CARRIER,
  TRANSAMERICA_EXCLUDED_STATES,
  TRANSAMERICA_PRODUCTS,
  TRANSAMERICA_CONDITION_RULES,
} from './transamerica';
import {
  FIDELITY_LIFE_CARRIER,
  FIDELITY_LIFE_PRODUCT,
  FIDELITY_LIFE_UNAVAILABLE_STATES,
} from './fidelity-life';
import { FEX_GRADED_RATES, FEX_SELECT_RATES, type FexRateRow } from './transamerica-fex-rates';
import { STATE_CODES } from '../../lib/constants';
import {
  AFLAC_CARRIER,
  AFLAC_EXCLUDED_STATES,
  AFLAC_PRODUCTS,
} from './aflac';
import { AFLAC_DRUG_RULES } from './aflac-drugs';

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
        'Superior Choice loaded from the Risk Assessment Guide (AG-CLA-JULY-2025-130), the Benefits At A Glance sheet, the Corporate Brochure and the CICA Life of America Agent Guide (May 2026). Annual rates, issue-age face bands and state approvals all come from the Agent Guide. OUTSTANDING before activation: the annual policy fee and the modal factors — the Agent Guide prints neither, so a monthly premium cannot be produced and the engine will show \'Rate unavailable\'.',
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
        minFaceAmount: 1000,
        maxFaceAmount: spec.slug.endsWith('guaranteed-issue') ? 30000 : 30000,
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

    // Face amounts narrow with age, so they are age bands rather than one
    // range. Agent Guide p.36.
    const bands: CicaFaceBand[] = spec.slug.endsWith('guaranteed-issue')
      ? CICA_GUARANTEED_FACE_BANDS
      : CICA_STANDARD_FACE_BANDS;
    for (const band of bands) {
      await db.insert(schema.productFaceLimits).values({
        productId: product.id,
        minAge: band.minAge,
        maxAge: band.maxAge,
        minFaceAmount: band.minFaceAmount,
        maxFaceAmount: band.maxFaceAmount,
        stateCode: null,
        notes: 'Agent Guide p.36, issue-age band.',
      });
    }

    // Agent Guide pp.14-15. Utah and Wisconsin carry partial marks that the
    // grid does not resolve to a plan, so they are held unavailable with the
    // reason recorded rather than guessed either way.
    const partial = new Map(CICA_PARTIAL_STATES.map((p) => [p.code, p.marks]));
    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: CICA_APPROVED_STATES.includes(code),
        effectiveDate: CICA_CARRIER.effectiveDate,
        notes: CICA_APPROVED_STATES.includes(code)
          ? null
          : partial.has(code)
            ? `The state approval grid marks only ${partial.get(code)} of its 4 columns and does not say which plans. Held unavailable until CICA confirms.`
            : 'Carries no marks in the Agent Guide state approval grid (pp.14-15).',
      })),
    );

    // Annual rate per $1,000 by issue age and sex, Agent Guide pp.46-48. No
    // modal factor is published, so no monthly premium can be derived; the
    // table loads with an annual basis and the engine reports the gap rather
    // than inventing a figure.
    const rateRows: CicaRateRow[] = spec.slug.endsWith('guaranteed-issue')
      ? CICA_GUARANTEED_RATES
      : CICA_STANDARD_RATES;
    const [rateTable] = await db
      .insert(schema.rateTables)
      .values({
        productId: product.id,
        stateCode: null,
        benefitType: spec.benefitType,
        effectiveDate: CICA_CARRIER.effectiveDate,
        status: 'draft',
        version: 1,
        monthlyPolicyFee: '0',
        rateBasis: 'annual_per_thousand',
        annualPolicyFee: '0',
        // Deliberately null: the Agent Guide publishes no modal factor, and
        // the rate engine refuses to price an annual_per_thousand table
        // without one rather than assume a conversion.
        monthlyModalFactor: null,
        sourceDocumentId: doc.id,
        sourcePage: 'pp.46-48',
        notes:
          'Annual premium rate per $1,000, Agent Guide pp.46-48. POLICY FEE AND MODAL FACTORS NOT PUBLISHED — both must be supplied by CICA before this table can produce a monthly premium.',
        createdByUserId: adminId,
      })
      .returning();

    const entries = rateRows.flatMap(([age, male, female]) => [
      { rateTableId: rateTable.id, age, sex: 'male' as const, tobaccoClass: 'unismoke' as const,
        faceAmount: 0, monthlyPremium: '0', annualPremium: null, ratePerThousand: String(male) },
      { rateTableId: rateTable.id, age, sex: 'female' as const, tobaccoClass: 'unismoke' as const,
        faceAmount: 0, monthlyPremium: '0', annualPremium: null, ratePerThousand: String(female) },
    ]);
    for (let i = 0; i < entries.length; i += 500) {
      await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
    }
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
    `\u2713 CICA Life: ${CICA_PRODUCTS.length} products, ${ruleCount} draft rules, ` +
      `${(CICA_STANDARD_RATES.length + CICA_GUARANTEED_RATES.length) * 2} annual rate rows, ` +
      `approved in ${CICA_APPROVED_STATES.length} of ${STATE_CODES.length} jurisdictions. ` +
      `No policy fee or modal factor published \u2014 monthly premiums will read "Rate unavailable".`,
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

    const excluded = AIG_EXCLUDED_STATES[spec.slug] ?? [];
    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: !excluded.includes(code),
        effectiveDate: AIG_CARRIER.effectiveDate,
        notes: excluded.includes(code)
          ? code === 'ME'
            ? 'GIWL guide p.162: "Product not approved for sale in NY & ME."'
            : 'Both guides: "AGL does not solicit, issue or deliver policies or contracts in the state of New York."'
          : AIG_FOOTPRINT_CAVEAT,
      })),
    );
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
  for (const rule of TRANSAMERICA_CONDITION_RULES) {
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
        treatment: rule.treatment ?? null,
        lookbackMonths: rule.lookbackMonths ?? null,
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

/* -------------------------------------------------------------------------- */
/* Transamerica — Solution series (Immediate, 10 Pay, Easy)                    */
/* -------------------------------------------------------------------------- */

import {
  EASY_SOLUTION,
  IMMEDIATE_MT_PREFERRED,
  IMMEDIATE_MT_STANDARD,
  IMMEDIATE_PREFERRED,
  IMMEDIATE_STANDARD,
  TEN_PAY_MT_PREFERRED,
  TEN_PAY_MT_STANDARD,
  TEN_PAY_PREFERRED,
  TEN_PAY_STANDARD,
  type EasySolutionRow,
  type SolutionSexedRow,
  type SolutionUnisexRow,
} from './transamerica-solution-rates';

const SOLUTION_MODAL = 0.085;
const SOLUTION_FEE = 3.5;
const SOLUTION_FEE_LOW = 5.0;
const SOLUTION_FEE_THRESHOLD = 5000;

/** Maximum issue amount by age, Product Rate/Underwriting Guide p.16. */
const SOLUTION_FACE_BANDS = [
  { minAge: 0, maxAge: 55, maxFaceAmount: 50000 },
  { minAge: 56, maxAge: 65, maxFaceAmount: 40000 },
  { minAge: 66, maxAge: 75, maxFaceAmount: 30000 },
  { minAge: 76, maxAge: 85, maxFaceAmount: 25000 },
];

interface SolutionSpec {
  slug: string;
  name: string;
  riskClass: string;
  national: SolutionSexedRow[] | EasySolutionRow[];
  montana?: SolutionUnisexRow[];
  unisexTobacco?: boolean;
  minAge: number;
  maxAge: number;
  maxFaceAmount: number;
  banded: boolean;
  benefitType: 'level' | 'graded';
  waitingPeriodMonths: number;
  notes: string;
}

const SOLUTION_PRODUCTS: SolutionSpec[] = [
  {
    slug: 'immediate-solution-preferred',
    name: 'Immediate Solution — Preferred',
    riskClass: 'preferred',
    national: IMMEDIATE_PREFERRED,
    montana: IMMEDIATE_MT_PREFERRED,
    minAge: 18, maxAge: 85, maxFaceAmount: 50000, banded: true,
    benefitType: 'level', waitingPeriodMonths: 0,
    notes:
      'Level premiums to age 121, issue ages 0-85 age last birthday (quoted from 18 here). Minimum issue amount $1,000. Maximum by age: 0-55 $50,000, 56-65 $40,000, 66-75 $30,000, 76-85 $25,000. Preferred rates are quoted when every question in application section C4 is answered No.',
  },
  {
    slug: 'immediate-solution-standard',
    name: 'Immediate Solution — Standard',
    riskClass: 'standard',
    national: IMMEDIATE_STANDARD,
    montana: IMMEDIATE_MT_STANDARD,
    minAge: 18, maxAge: 85, maxFaceAmount: 50000, banded: true,
    benefitType: 'level', waitingPeriodMonths: 0,
    notes:
      'Standard rates are quoted when one question in application section C4 is answered Yes. NOT AVAILABLE IN WASHINGTON per the rate pages. Washington issue ages for Immediate Solution are 0-65 male and 0-71 female, which this platform does not yet model per state.',
  },
  {
    slug: 'ten-pay-solution-preferred',
    name: '10 Pay Solution — Preferred',
    riskClass: 'preferred',
    national: TEN_PAY_PREFERRED,
    montana: TEN_PAY_MT_PREFERRED,
    minAge: 18, maxAge: 85, maxFaceAmount: 50000, banded: true,
    benefitType: 'level', waitingPeriodMonths: 0,
    notes: 'Paid up after ten years. Preferred rates are quoted when every question in application section C4 is answered No.',
  },
  {
    slug: 'ten-pay-solution-standard',
    name: '10 Pay Solution — Standard',
    riskClass: 'standard',
    national: TEN_PAY_STANDARD,
    montana: TEN_PAY_MT_STANDARD,
    minAge: 18, maxAge: 85, maxFaceAmount: 50000, banded: true,
    benefitType: 'level', waitingPeriodMonths: 0,
    notes: 'Paid up after ten years. Standard rates are quoted when one question in application section C4 is answered Yes. NOT AVAILABLE IN WASHINGTON per the rate pages.',
  },
  {
    slug: 'easy-solution',
    name: 'Easy Solution',
    riskClass: 'easy',
    national: EASY_SOLUTION,
    unisexTobacco: true,
    minAge: 18, maxAge: 80, maxFaceAmount: 25000, banded: false,
    benefitType: 'graded', waitingPeriodMonths: 24,
    notes:
      'The fallback product, quoted when application section C3 has a Yes answer or section C4 has two Yes answers. Level premiums to age 121, issue ages 18-80 age last birthday (PA 18-70 male). Minimum issue amount $1,000 ($5,000 in PA), maximum $25,000. The death benefit during the first two policy years is the face amount for accidental death and a return of premium for any other cause; after two years it is the face amount. Easy Solution has no tobacco distinction.',
  },
];

export async function loadTransamericaSolutionSeries(db: Database, adminId: number | null) {
  const [carrier] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.slug, TRANSAMERICA_CARRIER.slug))
    .limit(1);
  if (!carrier) throw new Error('Load the Transamerica carrier before the Solution series.');

  const [doc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: 'Product Rate/Underwriting Guide — Immediate Solution, 10 Pay Solution & Easy Solution',
      docType: 'rate_book',
      reference: 'Solution series rate/underwriting guide',
      notes: 'Application design p.3, calculating a rate p.15, product overviews and rate pages pp.16-28.',
      uploadedByUserId: adminId,
    })
    .returning();

  let sortOrder = 10;
  let rateRowCount = 0;

  for (const spec of SOLUTION_PRODUCTS) {
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'inactive',
        minFaceAmount: 1000,
        maxFaceAmount: spec.maxFaceAmount,
        faceIncrement: 1000,
        ageBasis: 'last_birthday',
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses: spec.unisexTobacco ? ['unismoke'] : ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: 4,
        rateMethodology: 'per_thousand',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: (sortOrder += 1),
      })
      .returning();

    if (spec.banded) {
      for (const band of SOLUTION_FACE_BANDS) {
        await db.insert(schema.productFaceLimits).values({
          productId: product.id,
          minAge: band.minAge,
          maxAge: band.maxAge,
          minFaceAmount: 1000,
          maxFaceAmount: band.maxFaceAmount,
          notes: 'Maximum issue amount by age — rate guide p.16.',
        });
      }
    }

    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        // The rate pages mark the Standard tables "Not available in WA".
        isAvailable: !(spec.riskClass === 'standard' && code === 'WA'),
        notes:
          spec.riskClass === 'standard' && code === 'WA'
            ? 'Standard premiums are marked "Not available in WA" on the rate pages.'
            : null,
      })),
    );

    // National table, then the Montana unisex table where the guide publishes one.
    const tables: Array<{ stateCode: string | null; rows: unknown[]; label: string }> = [
      { stateCode: null, rows: spec.national, label: 'national rate pages' },
    ];
    if (spec.montana) {
      tables.push({ stateCode: 'MT', rows: spec.montana, label: 'Montana rate pages (unisex)' });
    }

    for (const t of tables) {
      const [rateTable] = await db
        .insert(schema.rateTables)
        .values({
          productId: product.id,
          stateCode: t.stateCode,
          benefitType: spec.benefitType,
          effectiveDate: TRANSAMERICA_CARRIER.effectiveDate,
          status: 'draft',
          version: 1,
          monthlyPolicyFee: String(SOLUTION_FEE),
          rateBasis: 'annual_per_thousand_modal_first',
          annualPolicyFee: '0',
          monthlyModalFactor: String(SOLUTION_MODAL),
          policyFeeThreshold: SOLUTION_FEE_THRESHOLD,
          monthlyPolicyFeeBelowThreshold: String(SOLUTION_FEE_LOW),
          sourceDocumentId: doc.id,
          sourcePage: t.stateCode === 'MT' ? 'MT rate pages' : 'rate pages',
          isFictionalSample: false,
          notes: `Annual premiums per unit ($1,000), ${t.label}. Monthly premium = round(rate x ${SOLUTION_MODAL}, 2) x units + $${SOLUTION_FEE} ($${SOLUTION_FEE_LOW} below $${SOLUTION_FEE_THRESHOLD.toLocaleString()}).`,
          createdByUserId: adminId,
        })
        .returning();

      const entries: (typeof schema.rateEntries.$inferInsert)[] = [];
      for (const row of t.rows as Array<Record<string, never>>) {
        const r = row as unknown as SolutionSexedRow & SolutionUnisexRow & EasySolutionRow;
        if (t.stateCode === 'MT') {
          // Montana is unisex: one rate per tobacco class.
          for (const tobaccoClass of ['non_tobacco', 'tobacco'] as const) {
            entries.push({
              rateTableId: rateTable.id, age: r.age, sex: 'unisex', tobaccoClass,
              faceAmount: 0, monthlyPremium: '0', ratePerThousand: String(r[tobaccoClass]),
            });
          }
        } else if (spec.unisexTobacco) {
          // Easy Solution: one rate per sex, no tobacco distinction.
          for (const sex of ['male', 'female'] as const) {
            entries.push({
              rateTableId: rateTable.id, age: r.age, sex, tobaccoClass: 'unismoke',
              faceAmount: 0, monthlyPremium: '0', ratePerThousand: String(r[sex] as unknown as number),
            });
          }
        } else {
          for (const sex of ['male', 'female'] as const) {
            for (const tobaccoClass of ['non_tobacco', 'tobacco'] as const) {
              entries.push({
                rateTableId: rateTable.id, age: r.age, sex, tobaccoClass,
                faceAmount: 0, monthlyPremium: '0',
                ratePerThousand: String((r[sex] as { non_tobacco: number; tobacco: number })[tobaccoClass]),
              });
            }
          }
        }
      }
      for (let i = 0; i < entries.length; i += 500) {
        await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
      }
      rateRowCount += entries.length;
    }
  }

  console.log(
    `✓ Transamerica Solution series: ${SOLUTION_PRODUCTS.length} products, ${rateRowCount} verified rate rows (national + Montana unisex).`,
  );
}

/* -------------------------------------------------------------------------- */
/* Aflac Final Expense                                                         */
/* -------------------------------------------------------------------------- */

export async function loadAflac(db: Database, adminId: number | null) {
  await resetCarrier(db, AFLAC_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: AFLAC_CARRIER.slug,
      name: AFLAC_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        `Final Expense whole life, underwritten by ${AFLAC_CARRIER.underwriter}. Product structure, face bands, administration fee and state availability from the Final Expense & Medicare Supplement Sales Guide; medication rules from drug list ${AFLAC_CARRIER.drugListRef}. OUTSTANDING before activation: premium rates and modal factors (the sales guide refers to "the modal factors outlined" but does not print them), and the application itself — the Section A/B/C health questions that decide the rating class are not in any supplied document.`,
    })
    .returning();

  const [guideDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: AFLAC_CARRIER.salesGuide,
      docType: 'product_guide',
      effectiveDate: AFLAC_CARRIER.effectiveDate,
      notes: 'Plan structure and eligibility p.20, face amounts p.20, state availability p.12.',
      uploadedByUserId: adminId,
    })
    .returning();

  const [drugDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: AFLAC_CARRIER.drugList,
      docType: 'medication_list',
      reference: AFLAC_CARRIER.drugListRef,
      effectiveDate: AFLAC_CARRIER.drugListEffective,
      notes:
        'Per-plan unacceptable-medication marks. Recovered positionally: the marks are vector graphics, not text.',
      uploadedByUserId: adminId,
    })
    .returning();

  const productIdByColumn = new Map<string, number>();
  for (const [index, spec] of AFLAC_PRODUCTS.entries()) {
    const widest = spec.faceBands.reduce(
      (acc, b) => ({
        min: Math.min(acc.min, b.minFaceAmount),
        max: Math.max(acc.max, b.maxFaceAmount),
      }),
      { min: Infinity, max: 0 },
    );
    const [product] = await db
      .insert(schema.products)
      .values({
        carrierId: carrier.id,
        slug: spec.slug,
        name: spec.name,
        benefitType: spec.benefitType,
        status: 'inactive',
        minFaceAmount: widest.min,
        maxFaceAmount: widest.max,
        faceIncrement: 1000,
        ageBasis: 'last_birthday',
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        // The sales guide describes no tobacco distinction for these plans.
        tobaccoClasses: ['unismoke'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: 5,
        rateMethodology: 'per_thousand',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    productIdByColumn.set(spec.drugColumn, product.id);

    for (const band of spec.faceBands) {
      await db.insert(schema.productFaceLimits).values({
        productId: product.id,
        minAge: band.minAge,
        maxAge: band.maxAge,
        minFaceAmount: band.minFaceAmount,
        maxFaceAmount: band.maxFaceAmount,
        stateCode: null,
        notes: 'Sales Guide p.20, issue-age band.',
      });
    }

    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: !AFLAC_EXCLUDED_STATES.includes(code),
        effectiveDate: AFLAC_CARRIER.effectiveDate,
        notes: AFLAC_EXCLUDED_STATES.includes(code)
          ? 'Sales Guide p.12: "Final Expense is available in all states except NY." Aflac Tier One is not licensed in New York.'
          : null,
      })),
    );
  }

  const COLUMN_BY_LETTER: Record<string, string> = {
    P: 'fe_preferred',
    S: 'fe_standard',
    M: 'fe_modified',
  };

  const medRows = [];
  for (const [drug, condition, plans, page] of AFLAC_DRUG_RULES) {
    const anyCondition = condition.trim().toLowerCase() === 'any condition';
    for (const letter of plans) {
      const productId = productIdByColumn.get(COLUMN_BY_LETTER[letter]);
      if (productId === undefined) continue;
      const planName = AFLAC_PRODUCTS.find(
        (p) => p.drugColumn === COLUMN_BY_LETTER[letter],
      )!.name;
      medRows.push({
        carrierId: carrier.id,
        productId,
        medicationName: drug.toLowerCase(),
        impliesConditionCode: null,
        // A named condition means "unacceptable when prescribed for this".
        // The interview does not record what a medication was prescribed for,
        // so those go to the underwriter rather than declining outright.
        result: (anyCondition ? 'decline' : 'refer') as 'decline' | 'refer',
        benefitClassification: null,
        explanation: anyCondition
          ? `${drug} is marked unacceptable for ${planName} on the Aflac drug list, for any condition.`
          : `${drug} is marked unacceptable for ${planName} on the Aflac drug list when prescribed for: ${condition}. The health interview records which medications the client takes, not what each was prescribed for, so this needs underwriting verification rather than an automatic decline.`,
        sourceDocumentId: drugDoc.id,
        sourcePage: `p.${page}`,
        effectiveDate: AFLAC_CARRIER.drugListEffective,
        verificationStatus: 'draft' as const,
        isFictionalSample: false,
        createdByUserId: adminId,
      });
    }
  }
  for (let i = 0; i < medRows.length; i += 500) {
    await db.insert(schema.medicationRules).values(medRows.slice(i, i + 500));
  }

  const declines = medRows.filter((r) => r.result === 'decline').length;
  console.log(
    `✓ Aflac: ${AFLAC_PRODUCTS.length} products, ${medRows.length} draft medication rules ` +
      `(${declines} decline, ${medRows.length - declines} refer), ` +
      `available in ${STATE_CODES.length - AFLAC_EXCLUDED_STATES.length} of ${STATE_CODES.length} jurisdictions. ` +
      `No rates or modal factors published — premiums will read "Rate unavailable".`,
  );
  void guideDoc;
  return carrier;
}
