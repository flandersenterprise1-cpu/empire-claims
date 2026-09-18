/**
 * Loads everything the engine needs out of PostgreSQL and shapes it into
 * plain `ProductBundle` records. This is the only seam between the database
 * and the (pure) engine, which keeps the engine trivially testable.
 */
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import type {
  BenefitType,
  MedicationRuleRecord,
  ProductBundle,
  RateTableRecord,
  Sex,
  TobaccoClass,
  UnderwritingRuleRecord,
} from '@/modules/engine/types';
import type { QuestionRecord } from '@/modules/questionnaire';

export type Db = PostgresJsDatabase<typeof schema>;

export interface CatalogQuery {
  stateCode: string;
  age: number;
  /**
   * Age nearest birthday, when a date of birth was given.
   *
   * Carriers do not agree on how to age a client: most rate on age last
   * birthday, but some (Combined, for one) rate on age nearest birthday, which
   * is up to a year higher. Rate rows for BOTH ages therefore have to be
   * loaded, because which one a product needs is a property of the product.
   * Loading only the last-birthday age silently starves every nearest-birthday
   * product of its rates and they all report "Rate unavailable".
   */
  ageNearestBirthday?: number | null;
  faceAmount: number;
  asOf: string;
  /** Admin preview can look at products that are not live yet. */
  includeInactive?: boolean;
  /**
   * Whether the clearly-labelled FICTIONAL demo carrier may take part.
   *
   * It exists so the engine can be demonstrated and tested without real
   * carrier data, and its rates are invented. It must never reach an agent
   * quoting a real client, so it is excluded unless a caller asks for it --
   * the admin preview and the engine tests do, the quote flow does not.
   */
  includeFictionalSample?: boolean;
}

export async function loadQuoteCatalog(db: Db, query: CatalogQuery): Promise<ProductBundle[]> {
  const {
    stateCode,
    age,
    ageNearestBirthday,
    faceAmount,
    includeInactive = false,
    includeFictionalSample = false,
  } = query;
  const ages = [...new Set([age, ageNearestBirthday].filter((a): a is number => a != null))];

  const carrierRows = await db.select().from(schema.carriers);
  const productRows = await db.select().from(schema.products);

  const visibleCarriers = carrierRows.filter(
    (c) =>
      (includeInactive || c.status === 'active') &&
      (includeFictionalSample || !c.isFictionalSample),
  );
  const carrierIds = visibleCarriers.map((c) => c.id);
  if (carrierIds.length === 0) return [];

  const visibleProducts = productRows.filter(
    (p) => carrierIds.includes(p.carrierId) && (includeInactive || p.status === 'active'),
  );
  const productIds = visibleProducts.map((p) => p.id);
  if (productIds.length === 0) return [];

  const [stateRows, faceLimitRows, ruleRows, medicationRows, rateTableRows] = await Promise.all([
    db
      .select()
      .from(schema.productStates)
      .where(
        and(
          inArray(schema.productStates.productId, productIds),
          eq(schema.productStates.stateCode, stateCode),
        ),
      ),
    db
      .select()
      .from(schema.productFaceLimits)
      .where(inArray(schema.productFaceLimits.productId, productIds)),
    db
      .select({
        rule: schema.underwritingRules,
        sourceTitle: schema.sourceDocuments.title,
      })
      .from(schema.underwritingRules)
      .leftJoin(
        schema.sourceDocuments,
        eq(schema.underwritingRules.sourceDocumentId, schema.sourceDocuments.id),
      )
      .where(
        and(
          inArray(schema.underwritingRules.carrierId, carrierIds),
          sql`${schema.underwritingRules.verificationStatus} <> 'archived'`,
          or(
            isNull(schema.underwritingRules.stateCode),
            eq(schema.underwritingRules.stateCode, stateCode),
          ),
        ),
      ),
    db
      .select({
        rule: schema.medicationRules,
        sourceTitle: schema.sourceDocuments.title,
      })
      .from(schema.medicationRules)
      .leftJoin(
        schema.sourceDocuments,
        eq(schema.medicationRules.sourceDocumentId, schema.sourceDocuments.id),
      )
      .where(
        and(
          inArray(schema.medicationRules.carrierId, carrierIds),
          sql`${schema.medicationRules.verificationStatus} <> 'archived'`,
        ),
      ),
    db
      .select()
      .from(schema.rateTables)
      .where(
        and(
          inArray(schema.rateTables.productId, productIds),
          eq(schema.rateTables.status, 'published'),
          or(isNull(schema.rateTables.stateCode), eq(schema.rateTables.stateCode, stateCode)),
        ),
      ),
  ]);

  // Only the handful of rate rows this quote could possibly use.
  const rateTableIds = rateTableRows.map((t) => t.id);
  const rateEntryRows = rateTableIds.length
    ? await db
        .select()
        .from(schema.rateEntries)
        .where(
          and(
            inArray(schema.rateEntries.rateTableId, rateTableIds),
            inArray(schema.rateEntries.age, ages),
            or(
              eq(schema.rateEntries.faceAmount, faceAmount),
              eq(schema.rateEntries.faceAmount, 0), // per-$1,000 sentinel rows
            ),
          ),
        )
    : [];

  const carrierById = new Map(visibleCarriers.map((c) => [c.id, c]));

  return visibleProducts
    .map((product): ProductBundle | null => {
      const carrier = carrierById.get(product.carrierId);
      if (!carrier) return null;

      const rules: UnderwritingRuleRecord[] = ruleRows
        .filter(
          (r) =>
            r.rule.carrierId === carrier.id &&
            (r.rule.productId == null || r.rule.productId === product.id),
        )
        .map((r) => ({
          id: r.rule.id,
          carrierId: r.rule.carrierId,
          productId: r.rule.productId,
          stateCode: r.rule.stateCode,
          ruleCategory: r.rule.ruleCategory,
          conditionCode: r.rule.conditionCode,
          treatment: r.rule.treatment,
          lookbackMonths: r.rule.lookbackMonths,
          criteria: r.rule.criteria as UnderwritingRuleRecord['criteria'],
          result: r.rule.result,
          benefitClassification: r.rule.benefitClassification as BenefitType | null,
          explanation: r.rule.explanation,
          underwritingConcern: r.rule.underwritingConcern,
          priority: r.rule.priority,
          sourceDocumentTitle: r.sourceTitle,
          sourcePage: r.rule.sourcePage,
          effectiveDate: r.rule.effectiveDate,
          expirationDate: r.rule.expirationDate,
          lastReviewedAt: r.rule.lastReviewedAt,
          ruleVersion: r.rule.ruleVersion,
          verificationStatus: r.rule.verificationStatus,
          isFictionalSample: r.rule.isFictionalSample,
        }));

      const medicationRules: MedicationRuleRecord[] = medicationRows
        .filter(
          (r) =>
            r.rule.carrierId === carrier.id &&
            (r.rule.productId == null || r.rule.productId === product.id),
        )
        .map((r) => ({
          id: r.rule.id,
          carrierId: r.rule.carrierId,
          productId: r.rule.productId,
          medicationName: r.rule.medicationName,
          impliesConditionCode: r.rule.impliesConditionCode,
          result: r.rule.result,
          benefitClassification: r.rule.benefitClassification as BenefitType | null,
          explanation: r.rule.explanation,
          sourcePage: r.rule.sourcePage,
          sourceDocumentTitle: r.sourceTitle,
          effectiveDate: r.rule.effectiveDate,
          expirationDate: r.rule.expirationDate,
          ruleVersion: r.rule.ruleVersion,
          verificationStatus: r.rule.verificationStatus,
          isFictionalSample: r.rule.isFictionalSample,
        }));

      const rateTables: RateTableRecord[] = rateTableRows
        .filter((t) => t.productId === product.id)
        .map((t) => ({
          id: t.id,
          productId: t.productId,
          stateCode: t.stateCode,
          benefitType: t.benefitType,
          effectiveDate: t.effectiveDate,
          endDate: t.endDate,
          status: t.status,
          version: t.version,
          monthlyPolicyFee: Number(t.monthlyPolicyFee),
          rateBasis: t.rateBasis,
          annualPolicyFee: Number(t.annualPolicyFee),
          monthlyModalFactor: t.monthlyModalFactor == null ? null : Number(t.monthlyModalFactor),
          policyFeeThreshold: t.policyFeeThreshold,
          monthlyPolicyFeeBelowThreshold:
            t.monthlyPolicyFeeBelowThreshold == null ? null : Number(t.monthlyPolicyFeeBelowThreshold),
          isFictionalSample: t.isFictionalSample,
          entries: rateEntryRows
            .filter((e) => e.rateTableId === t.id)
            .map((e) => ({
              age: e.age,
              sex: e.sex as Sex,
              tobaccoClass: e.tobaccoClass as TobaccoClass,
              faceAmount: e.faceAmount,
              monthlyPremium: Number(e.monthlyPremium),
              ratePerThousand: e.ratePerThousand == null ? null : Number(e.ratePerThousand),
            })),
        }));

      return {
        carrier: {
          id: carrier.id,
          slug: carrier.slug,
          name: carrier.name,
          status: carrier.status,
          isVerified: carrier.isVerified,
          isFictionalSample: carrier.isFictionalSample,
          agentPortalUrl: carrier.agentPortalUrl,
        },
        product: {
          id: product.id,
          carrierId: product.carrierId,
          slug: product.slug,
          name: product.name,
          benefitType: product.benefitType,
          status: product.status,
          minFaceAmount: product.minFaceAmount,
          maxFaceAmount: product.maxFaceAmount,
          faceIncrement: product.faceIncrement,
          ageBasis: product.ageBasis,
          minAge: product.minAge,
          maxAge: product.maxAge,
          tobaccoClasses: (product.tobaccoClasses ?? []) as TobaccoClass[],
          sexClasses: (product.sexClasses ?? []) as Sex[],
          waitingPeriodMonths: product.waitingPeriodMonths,
          simplicityScore: product.simplicityScore,
          rateMethodology: product.rateMethodology as 'exact_only' | 'per_thousand',
          allowInterpolation: product.allowInterpolation,
          applicationUrl: product.applicationUrl,
          eApplicationUrl: product.eApplicationUrl,
        },
        states: stateRows
          .filter((s) => s.productId === product.id)
          .map((s) => ({
            productId: s.productId,
            stateCode: s.stateCode,
            isAvailable: s.isAvailable,
            effectiveDate: s.effectiveDate,
            endDate: s.endDate,
          })),
        faceLimits: faceLimitRows
          .filter((l) => l.productId === product.id)
          .map((l) => ({
            productId: l.productId,
            minAge: l.minAge,
            maxAge: l.maxAge,
            minFaceAmount: l.minFaceAmount,
            maxFaceAmount: l.maxFaceAmount,
            stateCode: l.stateCode,
          })),
        rules,
        medicationRules,
        rateTables,
      };
    })
    .filter((bundle): bundle is ProductBundle => bundle !== null);
}

export async function loadActiveQuestions(db: Db): Promise<QuestionRecord[]> {
  const rows = await db
    .select()
    .from(schema.healthQuestions)
    .where(eq(schema.healthQuestions.isActive, true));

  return rows
    .map((row) => ({
      id: row.id,
      code: row.code,
      category: row.category,
      prompt: row.prompt,
      helpText: row.helpText,
      answerType: row.answerType,
      options: row.options,
      isRequired: row.isRequired,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      parentQuestionId: row.parentQuestionId,
      showWhen: row.showWhen as QuestionRecord['showWhen'],
      factPath: row.factPath,
      version: row.version,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}
