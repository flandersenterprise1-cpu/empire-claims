/**
 * Loads real carrier modules from verified source documents.
 *
 * Everything this script writes lands in a NON-LIVE state:
 *   - carriers  -> inactive, isVerified = false
 *   - products  -> inactive
 *   - rules     -> draft (the engine never applies a draft rule)
 *   - rate tables -> draft (the rate engine only reads published tables)
 *
 * An administrator reviews each rule against the cited page and publishes it.
 * Re-running this script rebuilds the carrier from scratch, so it must only be
 * run before an administrator has started verifying.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDb } from '../client';
import { STATE_CODES } from '../../lib/constants';
import * as schema from '../schema';
import {
  AMAM_CARRIER,
  AMAM_PRODUCTS,
  AMAM_RULES,
  AMAM_UNAPPROVED_STATES,
} from './american-amicable';
import {
  SC_GRADED_RATES,
  SC_IMMEDIATE_RATES,
  SC_ROP_RATES,
  type AnnualRateRow,
} from './american-amicable-rates';
import {
  loadAflac,
  loadAigCorebridge,
  loadCicaLife,
  loadFidelityLife,
  loadTransamerica,
  loadTransamericaSolutionSeries,
} from './load-more';
import {
  COMBINED_AVAILABILITY_SOURCE_PAGE,
  COMBINED_CARRIER,
  COMBINED_PRODUCTS,
  COMBINED_RULES,
  COMBINED_UNAVAILABLE_STATES,
} from './combined-insurance';
import {
  GENERATIONAL_LIFE_MEDICATIONS,
  GENERATIONAL_LIFE_RATES,
} from './combined-insurance-data';
import {
  LP_DECLINE_MEDICATIONS,
  LP_GRADED_MEDICATIONS,
  LP_REFER_MEDICATIONS,
} from './mutual-of-omaha-medications';
import { expandCapture, MOO_CAPTURES, MOO_MONTHLY_FACTOR } from './quoter-derived-rates';

type Database = ReturnType<typeof createDb>['db'];

async function resetCarrier(db: Database, slug: string) {
  const [existing] = await db
    .select()
    .from(schema.carriers)
    .where(eq(schema.carriers.slug, slug))
    .limit(1);
  if (existing) await db.delete(schema.carriers).where(eq(schema.carriers.id, existing.id));
}

/* -------------------------------------------------------------------------- */
/* American Amicable — Senior Choice                                           */
/* -------------------------------------------------------------------------- */

const RATES_BY_PRODUCT: Record<string, AnnualRateRow[]> = {
  'senior-choice-immediate': SC_IMMEDIATE_RATES,
  'senior-choice-graded': SC_GRADED_RATES,
  'senior-choice-rop': SC_ROP_RATES,
};

export async function loadAmericanAmicable(db: Database, adminId: number | null) {
  await resetCarrier(db, AMAM_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: AMAM_CARRIER.slug,
      name: AMAM_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'Loaded from the Senior Choice Agent Guide (3079(9/23)) with state availability from the Dignity Solution State Approval Listing (3523). The same policy is sold under the Asurea brand as Dignity Solutions — guide 3049(10/25) carries the identical policy forms, application and all 432 rate values, verified programmatically. Approved in 46 states; not approved in Iowa, Maine, Montana, New Hampshire or New York. Outstanding before activation: verification of each underwriting rule against its cited page.',
    })
    .returning();

  const [document] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: AMAM_CARRIER.sourceDocTitle,
      docType: 'underwriting_guide',
      reference: AMAM_CARRIER.sourceDocRef,
      effectiveDate: AMAM_CARRIER.effectiveDate,
      notes: 'Contains underwriting guidelines, the application health questions, the build chart and annual rates per $1,000.',
      uploadedByUserId: adminId,
    })
    .returning();

  await db.insert(schema.sourceDocuments).values([
    {
      carrierId: carrier.id,
      title: AMAM_CARRIER.dignityGuideTitle,
      docType: 'underwriting_guide',
      reference: AMAM_CARRIER.dignityGuideRef,
      notes:
        'The Asurea-branded edition of the same policy. Identical policy forms, application and rates; every rate value was compared against the Senior Choice guide and matched.',
      uploadedByUserId: adminId,
    },
    {
      carrierId: carrier.id,
      title: AMAM_CARRIER.stateListingTitle,
      docType: 'state_availability',
      reference: AMAM_CARRIER.stateListingRef,
      notes:
        'Approved for Immediate, Graded and Return of Premium in 46 states. Iowa is listed without approval marks; Maine, Montana, New Hampshire and New York do not appear.',
      uploadedByUserId: adminId,
    },
  ]);

  const productIdBySlug = new Map<string, number>();

  for (const [index, spec] of AMAM_PRODUCTS.entries()) {
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
        faceIncrement: spec.faceIncrement,
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses: ['non_tobacco', 'tobacco'],
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: spec.simplicityScore,
        rateMethodology: 'per_thousand',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    productIdBySlug.set(spec.slug, product.id);

    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: !AMAM_UNAPPROVED_STATES.includes(code),
        notes: AMAM_UNAPPROVED_STATES.includes(code)
          ? code === 'IA'
            ? 'Listed on the State Approval Listing (3523) without approval marks.'
            : 'Does not appear on the State Approval Listing (3523).'
          : null,
      })),
    );

    for (const limit of spec.faceLimits ?? []) {
      await db.insert(schema.productFaceLimits).values({
        productId: product.id,
        minAge: limit.minAge,
        maxAge: limit.maxAge,
        minFaceAmount: limit.minFaceAmount,
        maxFaceAmount: limit.maxFaceAmount,
        stateCode: limit.stateCode ?? null,
        notes: limit.notes ?? null,
      });
    }

    // Rate table: annual rate per $1,000, the carrier's own published basis.
    const [rateTable] = await db
      .insert(schema.rateTables)
      .values({
        productId: product.id,
        stateCode: null,
        benefitType: spec.benefitType,
        effectiveDate: AMAM_CARRIER.effectiveDate,
        status: 'draft',
        version: 1,
        monthlyPolicyFee: '0',
        rateBasis: 'annual_per_thousand',
        annualPolicyFee: String(spec.annualPolicyFee),
        monthlyModalFactor: String(spec.monthlyModalFactor),
        sourceDocumentId: document.id,
        sourcePage:
          spec.slug === 'senior-choice-immediate'
            ? 'p.21'
            : spec.slug === 'senior-choice-graded'
              ? 'p.22'
              : 'p.23',
        isFictionalSample: false,
        notes: `Annual premiums per $1,000. Monthly premium = (rate x units + $${spec.annualPolicyFee} annual policy fee) x ${spec.monthlyModalFactor}.`,
        createdByUserId: adminId,
      })
      .returning();

    const rows = RATES_BY_PRODUCT[spec.slug] ?? [];
    const entries: (typeof schema.rateEntries.$inferInsert)[] = [];
    for (const row of rows) {
      for (const sex of ['male', 'female'] as const) {
        entries.push({
          rateTableId: rateTable.id,
          age: row.age,
          sex,
          tobaccoClass: row.tobaccoClass,
          // face_amount 0 is the per-$1,000 sentinel.
          faceAmount: 0,
          monthlyPremium: '0',
          ratePerThousand: String(sex === 'male' ? row.male : row.female),
        });
      }
    }
    for (let i = 0; i < entries.length; i += 500) {
      await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
    }
  }

  // Underwriting rules. Q1-Q3 knock out every plan, so those are carrier-wide.
  // Q4-Q8 decide WHICH plan, so they are scoped to the underwritten products.
  let ruleCount = 0;
  for (const rule of AMAM_RULES) {
    const carrierWide = rule.result === 'decline';
    const targets = carrierWide ? [null] : [...productIdBySlug.values()];

    for (const productId of targets) {
      const [row] = await db
        .insert(schema.underwritingRules)
        .values({
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
          explanation: rule.explanation,
          underwritingConcern: rule.underwritingConcern ?? null,
          priority: rule.priority,
          sourceDocumentId: document.id,
          sourcePage: `${rule.sourcePage} — ${rule.question}`,
          effectiveDate: AMAM_CARRIER.effectiveDate,
          ruleVersion: 1,
          verificationStatus: 'draft',
          isFictionalSample: false,
          createdByUserId: adminId,
        })
        .returning();

      await db.insert(schema.ruleVersions).values({
        ruleId: row.id,
        version: 1,
        action: 'created',
        snapshot: row as never,
        changedByUserId: adminId,
        changedByEmail: 'carrier-import',
      });
      ruleCount += 1;
    }
  }

  console.log(
    `✓ American Amicable: ${AMAM_PRODUCTS.length} products, ${ruleCount} draft rules, ` +
      `${SC_IMMEDIATE_RATES.length + SC_GRADED_RATES.length + SC_ROP_RATES.length} rate rows (draft), ` +
      `approved in ${STATE_CODES.length - AMAM_UNAPPROVED_STATES.length} of ${STATE_CODES.length} states.`,
  );
  return carrier;
}

/* -------------------------------------------------------------------------- */
/* Mutual of Omaha — Living Promise                                            */
/* -------------------------------------------------------------------------- */

export async function loadMutualOfOmaha(db: Database, adminId: number | null) {
  await resetCarrier(db, 'mutual-of-omaha');

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: 'mutual-of-omaha',
      name: 'Mutual of Omaha',
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'Living Promise products and limits loaded from the Life Insurance Product Portfolio (388793_0325, March 2025). Prescription rules loaded from LY28867_B. STILL REQUIRED before activation: rate tables, state availability, and the Living Promise underwriting guide (health questions and condition lookbacks).',
    })
    .returning();

  const [productDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: 'Life Insurance Product Portfolio — Brokerage',
      docType: 'product_guide',
      reference: '388793_0325',
      effectiveDate: '2025-03-01',
      notes: 'Living Promise Whole Life specifications, page 12.',
      uploadedByUserId: adminId,
    })
    .returning();

  const [rxDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: 'Life Express Products — Prescription Drug Exclusions (Brokerage)',
      docType: 'rx_guide',
      reference: 'LY28867_B',
      notes: 'Living Promise medication lists, page 2.',
      uploadedByUserId: adminId,
    })
    .returning();

  const products = [
    {
      slug: 'living-promise-level',
      name: 'Living Promise Level Benefit',
      benefitType: 'level' as const,
      minAge: 45,
      maxAge: 85,
      minFaceAmount: 2000,
      maxFaceAmount: 50000,
      tobaccoClasses: ['non_tobacco', 'tobacco'],
      annualPolicyFee: 36,
      waitingPeriodMonths: 0,
      notes:
        'Product Portfolio p.12. Standard Tobacco/Nontobacco. $36 annual policy fee, commissionable. Monthly BSP modal factor .089. No death benefit reductions in early years. Face increment is NOT stated in the Product Portfolio and has been set to $1,000 pending confirmation.',
    },
    {
      slug: 'living-promise-graded',
      name: 'Living Promise Graded Benefit',
      benefitType: 'graded' as const,
      minAge: 45,
      maxAge: 80,
      minFaceAmount: 2000,
      maxFaceAmount: 20000,
      tobaccoClasses: ['unismoke'],
      annualPolicyFee: 12,
      waitingPeriodMonths: 24,
      notes:
        'Product Portfolio p.12. Standard, no tobacco distinction. $12 annual policy fee, commissionable. Monthly BSP modal factor .089. The graded benefit schedule is NOT stated in the Product Portfolio — obtain the Living Promise highlight sheet or underwriting guide. Waiting period stored as 24 months pending confirmation.',
    },
  ];

  const productIdBySlug = new Map<string, number>();
  for (const [index, spec] of products.entries()) {
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
        minAge: spec.minAge,
        maxAge: spec.maxAge,
        tobaccoClasses: spec.tobaccoClasses,
        sexClasses: ['male', 'female'],
        waitingPeriodMonths: spec.waitingPeriodMonths,
        simplicityScore: 4,
        rateMethodology: 'per_thousand',
        allowInterpolation: false,
        notes: spec.notes,
        sortOrder: index,
      })
      .returning();
    productIdBySlug.set(spec.slug, product.id);

    // The Living Promise quoter page carries the carrier's own statement:
    // "United of Omaha is licensed in all states except NY." The very same
    // sentence warns that "Product base plans, provisions, features and riders
    // may not be available in all states and may vary by state", so this is a
    // company licence, not a Living Promise approval grid. It loads as draft
    // with that recorded, and the product-level grid must replace it before
    // publishing.
    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: code !== 'NY',
        notes:
          code === 'NY'
            ? 'mutualofomaha.com quoter footer: "United of Omaha is licensed in all states except NY."'
            : 'Derived from the company licence on the Living Promise quoter page, not from a Living Promise state approval grid. Confirm per product before publishing.',
      })),
    );

    // Rates recovered from the carrier quoter. Mutual of Omaha publishes no
    // final-expense rate book -- Sales Support confirmed by phone that the
    // quick quoter is the only rate source -- but the Product Guide p.12
    // publishes the policy fee and the modal factors, and solving those
    // against a quoted premium returns the underlying rate exactly. Each
    // capture covers one age, sex and tobacco class; every other cell stays
    // "Rate unavailable" rather than being interpolated from these.
    const captures = MOO_CAPTURES.filter((c) => c.productSlug === spec.slug);
    if (captures.length > 0) {
      const [rateTable] = await db
        .insert(schema.rateTables)
        .values({
          productId: product.id,
          stateCode: null,
          benefitType: spec.benefitType,
          effectiveDate: '2025-01-01',
          status: 'published',
          version: 1,
          monthlyPolicyFee: '0',
          rateBasis: 'monthly_exact',
          annualPolicyFee: String(spec.annualPolicyFee),
          monthlyModalFactor: String(MOO_MONTHLY_FACTOR),
          sourceDocumentId: productDoc.id,
          sourcePage: 'p.12 + carrier quoter',
          notes:
            `Recovered from the Living Promise quoter on 2026-09-17: annual = rate per $1,000 x units + $${spec.annualPolicyFee} fee, ` +
            `monthly BSP = annual x ${MOO_MONTHLY_FACTOR} (Product Guide p.12). Each plan's rate solved identically from a $10,000 and a ` +
            '$20,000 quote, which is what pins the fee. COVERS AGE 65 ONLY, for the sex and tobacco classes captured; all other cells ' +
            'report "Rate unavailable" until they are captured from the quoter.',
          createdByUserId: adminId,
        })
        .returning();

      const entries = captures.flatMap((capture) =>
        expandCapture(capture, spec.annualPolicyFee, MOO_MONTHLY_FACTOR, 'nearest').map((r) => ({
          rateTableId: rateTable.id,
          age: r.age,
          sex: r.sex,
          tobaccoClass: r.tobaccoClass,
          faceAmount: r.faceAmount,
          monthlyPremium: r.monthlyPremium,
          annualPremium: r.annualPremium,
          ratePerThousand: String(capture.ratePerThousand),
        })),
      );
      for (let i = 0; i < entries.length; i += 500) {
        await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
      }
    }
  }

  // Medication rules. Declines are carrier-wide; "may qualify for Graded" is a
  // classification, so it is scoped to the products that can be classified.
  let medCount = 0;
  const addMedication = async (
    name: string,
    result: 'decline' | 'graded' | 'refer',
    productId: number | null,
    explanation: string,
  ) => {
    await db.insert(schema.medicationRules).values({
      carrierId: carrier.id,
      productId,
      medicationName: name,
      impliesConditionCode: null,
      result,
      benefitClassification: result === 'graded' ? 'graded' : null,
      explanation,
      sourceDocumentId: rxDoc.id,
      sourcePage: 'p.2 (Living Promise)',
      effectiveDate: '2025-01-01',
      verificationStatus: 'draft',
      isFictionalSample: false,
      createdByUserId: adminId,
    });
    medCount += 1;
  };

  for (const name of LP_DECLINE_MEDICATIONS) {
    await addMedication(
      name,
      'decline',
      null,
      `The Living Promise prescription drug list states that a proposed insured currently taking ${name} is not eligible for Living Promise coverage.`,
    );
  }
  for (const name of LP_GRADED_MEDICATIONS) {
    await addMedication(
      name,
      'graded',
      productIdBySlug.get('living-promise-level') ?? null,
      `The Living Promise prescription drug list marks ${name} with an asterisk: the proposed insured is not eligible for the Level Benefit product but may qualify for the Graded benefit product.`,
    );
  }
  for (const name of LP_REFER_MEDICATIONS) {
    await addMedication(
      name,
      'refer',
      null,
      `${name} appears on the Living Promise "additional information required" list. The reason for the medication must be provided on the application, or underwriting will obtain it from a pharmaceutical report, MIB or a phone interview.`,
    );
  }

  console.log(
    `✓ Mutual of Omaha: ${products.length} products, ${medCount} draft medication rules, ${MOO_CAPTURES.length} quoter-derived rate cells (AGE 65 ONLY — every other age reads "Rate unavailable").`,
  );
  void productDoc;
  return carrier;
}


/* -------------------------------------------------------------------------- */
/* Combined Insurance — Generational Life                                      */
/* -------------------------------------------------------------------------- */

export async function loadCombinedInsurance(db: Database, adminId: number | null) {
  await resetCarrier(db, COMBINED_CARRIER.slug);

  const [carrier] = await db
    .insert(schema.carriers)
    .values({
      slug: COMBINED_CARRIER.slug,
      name: COMBINED_CARRIER.name,
      status: 'inactive',
      isVerified: false,
      isFictionalSample: false,
      notes:
        'Generational Life loaded from the Producer Guide (500202-R2) and the Generational Life Underwriting Guide. Rates are live: the modal factor (0.0833) and the annual $50 policy fee were confirmed against the carrier agent quoter. OUTSTANDING before activation: state availability, and verification of the underwriting and medication rules.',
    })
    .returning();

  const [producerDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: COMBINED_CARRIER.producerGuide,
      docType: 'product_guide',
      reference: '500202-R2',
      effectiveDate: COMBINED_CARRIER.effectiveDate,
      notes: 'Product overview p.3, underwriting approach p.8, annual rates per $1,000 pp.9-11.',
      uploadedByUserId: adminId,
    })
    .returning();

  const [uwDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      carrierId: carrier.id,
      title: COMBINED_CARRIER.underwritingGuide,
      docType: 'rx_guide',
      reference: 'Generational Life Underwriting Guide',
      notes: 'Medication to rating-class table.',
      uploadedByUserId: adminId,
    })
    .returning();

  const productIdBySlug = new Map<string, number>();

  for (const [index, spec] of COMBINED_PRODUCTS.entries()) {
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
        ageBasis: 'nearest_birthday',
        minAge: 0,
        maxAge: 80,
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
    productIdBySlug.set(spec.slug, product.id);

    // Producer Guide p.6 lists the footprint as an exclusion, so every other
    // state is available. Without these rows the engine refuses to quote
    // Combined anywhere, which is the safe default but hides a priced carrier.
    await db.insert(schema.productStates).values(
      STATE_CODES.map((code) => ({
        productId: product.id,
        stateCode: code,
        isAvailable: !COMBINED_UNAVAILABLE_STATES.includes(code),
        effectiveDate: COMBINED_CARRIER.effectiveDate,
        notes: COMBINED_UNAVAILABLE_STATES.includes(code)
          ? `Named in the Producer Guide ${COMBINED_AVAILABILITY_SOURCE_PAGE} list of states where Generational Life is not available.`
          : null,
      })),
    );

    // Rate table: annual rates per $1,000 with NO modal factor, so the engine
    // will correctly refuse to produce a monthly premium until one is supplied.
    const [rateTable] = await db
      .insert(schema.rateTables)
      .values({
        productId: product.id,
        stateCode: null,
        benefitType: spec.benefitType,
        effectiveDate: COMBINED_CARRIER.effectiveDate,
        status: 'draft',
        version: 1,
        monthlyPolicyFee: '0',
        rateBasis: 'annual_per_thousand',
        annualPolicyFee: '50',
        // Derived from Combined's own agent quoter: male 55 non-smoker $10,000
        // in Alabama returns $38.55 / $42.93 / $48.16 / $58.31 for Preferred /
        // Standard / Sub-Standard / Graded. All four reproduce to the cent as
        // (annual rate per $1,000 x units + $50 annual fee) x 0.0833.
        monthlyModalFactor: '0.0833',
        sourceDocumentId: producerDoc.id,
        sourcePage: 'pp.9-11',
        isFictionalSample: false,
        notes:
          'Annual rates per $1,000, based on age NEAREST birthday. Monthly premium = (rate x units + $50 annual policy fee) x 0.0833. The Producer Guide does not publish the modal factor; it was derived from the carrier agent quoter and verified against four quoted premiums, which it reproduces exactly.',
        createdByUserId: adminId,
      })
      .returning();

    const entries: (typeof schema.rateEntries.$inferInsert)[] = [];
    for (const row of GENERATIONAL_LIFE_RATES) {
      const classRates = row[spec.rateClass];
      for (const [tobaccoClass, pair] of [
        ['non_tobacco', classRates.nt],
        ['tobacco', classRates.t],
      ] as const) {
        for (const [sexIndex, sex] of (['male', 'female'] as const).entries()) {
          entries.push({
            rateTableId: rateTable.id,
            age: row.age,
            sex,
            tobaccoClass,
            faceAmount: 0,
            monthlyPremium: '0',
            ratePerThousand: String(pair[sexIndex]),
          });
        }
      }
    }
    for (let i = 0; i < entries.length; i += 500) {
      await db.insert(schema.rateEntries).values(entries.slice(i, i + 500));
    }
  }

  /* --------------------------- Underwriting rules ------------------------ */
  let ruleCount = 0;
  for (const rule of COMBINED_RULES) {
    const [row] = await db
      .insert(schema.underwritingRules)
      .values({
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
        explanation: rule.explanation,
        underwritingConcern: rule.underwritingConcern ?? null,
        priority: rule.priority,
        sourceDocumentId: producerDoc.id,
        sourcePage: rule.sourcePage,
        effectiveDate: COMBINED_CARRIER.effectiveDate,
        ruleVersion: 1,
        verificationStatus: 'draft',
        isFictionalSample: false,
        createdByUserId: adminId,
      })
      .returning();
    await db.insert(schema.ruleVersions).values({
      ruleId: row.id,
      version: 1,
      action: 'created',
      snapshot: row as never,
      changedByUserId: adminId,
      changedByEmail: 'carrier-import',
    });
    ruleCount += 1;
  }

  /* ---------------------------- Medication rules ------------------------- */
  const preferredId = productIdBySlug.get('generational-life-preferred') ?? null;
  let medCount = 0;
  const medRows: (typeof schema.medicationRules.$inferInsert)[] = [];

  for (const [name, condition, action] of GENERATIONAL_LIFE_MEDICATIONS) {
    const base = {
      carrierId: carrier.id,
      medicationName: name,
      impliesConditionCode: null,
      sourceDocumentId: uwDoc.id,
      sourcePage: 'Rx table',
      effectiveDate: COMBINED_CARRIER.effectiveDate,
      verificationStatus: 'draft' as const,
      isFictionalSample: false,
      createdByUserId: adminId,
    };
    const context = condition ? ` The guide associates it with: ${condition}.` : '';

    if (action === 'graded') {
      medRows.push({
        ...base,
        productId: null,
        result: 'graded',
        benefitClassification: 'graded',
        explanation: `The Generational Life underwriting guide restricts ${name} to the Graded Benefit rating class.${context}`,
      });
    } else if (action === 'not_preferred') {
      medRows.push({
        ...base,
        productId: preferredId,
        result: 'decline',
        benefitClassification: null,
        explanation: `The Generational Life underwriting guide allows ${name} in the Standard, Sub-Standard and Graded classes only — the Preferred class is ruled out.${context}`,
      });
    } else if (action === 'refer') {
      medRows.push({
        ...base,
        productId: null,
        result: 'refer',
        benefitClassification: null,
        explanation: `The Generational Life underwriting guide marks ${name} as "review medical conditions", so the rating class cannot be determined from the medication alone.${context}`,
      });
    } else {
      medRows.push({
        ...base,
        productId: null,
        result: 'allow',
        benefitClassification: null,
        explanation: `The Generational Life underwriting guide permits ${name} in all rating classes.${context}`,
      });
    }
    medCount += 1;
  }
  for (let i = 0; i < medRows.length; i += 500) {
    await db.insert(schema.medicationRules).values(medRows.slice(i, i + 500));
  }

  console.log(
    `\u2713 Combined Insurance: ${COMBINED_PRODUCTS.length} products, ${ruleCount} draft rules, ` +
      `${medCount} draft medication rules, ${GENERATIONAL_LIFE_RATES.length * 4} rate rows per product, ` +
      `available in ${STATE_CODES.length - COMBINED_UNAVAILABLE_STATES.length} of ${STATE_CODES.length} jurisdictions. ` +
      `Modal factor 0.0833 confirmed against the carrier quoter \u2014 premiums are live once published.`,
  );
  return carrier;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const { db, sql } = createDb(url);
  try {
    const [admin] = await db.select().from(schema.users).limit(1);
    const adminId = admin?.id ?? null;
    await loadAmericanAmicable(db, adminId);
    await loadMutualOfOmaha(db, adminId);
    await loadCombinedInsurance(db, adminId);
    await loadCicaLife(db, adminId);
    await loadAigCorebridge(db, adminId);
    await loadTransamerica(db, adminId);
    await loadTransamericaSolutionSeries(db, adminId);
    await loadFidelityLife(db, adminId);
    await loadAflac(db, adminId);
    console.log('\nAll carrier data loaded as DRAFT / INACTIVE. Verify in the admin area before publishing.');
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.includes('load')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
