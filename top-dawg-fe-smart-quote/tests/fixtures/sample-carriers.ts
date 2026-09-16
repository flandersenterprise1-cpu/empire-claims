/**
 * ============================ FICTIONAL TEST DATA ==========================
 * Every carrier, product, rate and underwriting rule in this file is INVENTED
 * for testing. None of it describes a real insurance company, a real premium
 * or a real underwriting decision.
 * ===========================================================================
 */
import type {
  FactSet,
  ProductBundle,
  RateEntryRecord,
  UnderwritingRuleRecord,
} from '@/modules/engine/types';

export const ALL_STATES = ['TX', 'FL', 'CA', 'NY', 'OH'];

let nextId = 1000;
const id = () => (nextId += 1);

export function facts(
  values: FactSet['values'] = {},
  options: { unknownPaths?: string[]; absentPaths?: string[]; reportedConditions?: string[] } = {},
): FactSet {
  return {
    values,
    unknownPaths: options.unknownPaths ?? [],
    absentPaths: options.absentPaths ?? [],
    reportedConditions: options.reportedConditions ?? [],
  };
}

export function rule(overrides: Partial<UnderwritingRuleRecord> = {}): UnderwritingRuleRecord {
  return {
    id: id(),
    carrierId: 1,
    productId: null,
    stateCode: null,
    ruleCategory: 'test',
    conditionCode: 'test_condition',
    treatment: null,
    lookbackMonths: null,
    criteria: null,
    result: 'allow',
    benefitClassification: null,
    explanation: 'FICTIONAL TEST RULE.',
    underwritingConcern: null,
    priority: 100,
    sourceDocumentTitle: 'FICTIONAL test guide',
    sourcePage: 'p.1',
    effectiveDate: '2020-01-01',
    expirationDate: null,
    lastReviewedAt: '2024-01-01',
    ruleVersion: 1,
    verificationStatus: 'verified',
    isFictionalSample: true,
    ...overrides,
  };
}

/** Flat $10/mo per rate row so premium assertions stay readable. */
export function rateEntries(
  monthlyPremium: number,
  options: { ages?: number[]; faces?: number[]; tobacco?: RateEntryRecord['tobaccoClass'][] } = {},
): RateEntryRecord[] {
  const entries: RateEntryRecord[] = [];
  for (const age of options.ages ?? [60, 65, 70]) {
    for (const face of options.faces ?? [5000, 10000, 15000]) {
      for (const sex of ['male', 'female'] as const) {
        for (const tobaccoClass of options.tobacco ?? (['non_tobacco', 'tobacco'] as const)) {
          entries.push({
            age,
            sex,
            tobaccoClass,
            faceAmount: face,
            // Tobacco costs 50% more; larger faces cost proportionally more.
            monthlyPremium:
              Math.round(
                monthlyPremium * (face / 10000) * (tobaccoClass === 'tobacco' ? 1.5 : 1) * 100,
              ) / 100,
          });
        }
      }
    }
  }
  return entries;
}

export interface BundleOptions {
  carrierName?: string;
  carrierStatus?: 'active' | 'inactive';
  carrierVerified?: boolean;
  productStatus?: 'active' | 'inactive';
  benefitType?: ProductBundle['product']['benefitType'];
  states?: string[];
  minAge?: number;
  maxAge?: number;
  minFace?: number;
  maxFace?: number;
  increment?: number;
  tobaccoClasses?: ProductBundle['product']['tobaccoClasses'];
  waitingPeriodMonths?: number;
  simplicityScore?: number;
  rules?: UnderwritingRuleRecord[];
  medicationRules?: ProductBundle['medicationRules'];
  rates?: RateEntryRecord[];
  rateStatus?: 'draft' | 'published' | 'archived';
  rateEffectiveDate?: string;
  rateEndDate?: string | null;
  monthlyPolicyFee?: number;
  faceLimits?: ProductBundle['faceLimits'];
  rateMethodology?: 'exact_only' | 'per_thousand';
  allowInterpolation?: boolean;
}

/** Builds one FICTIONAL product bundle for the pure engine tests. */
export function bundle(name: string, options: BundleOptions = {}): ProductBundle {
  const carrierId = id();
  const productId = id();
  const states = options.states ?? ALL_STATES;

  return {
    carrier: {
      id: carrierId,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: options.carrierName ?? `${name} (FICTIONAL)`,
      status: options.carrierStatus ?? 'active',
      isVerified: options.carrierVerified ?? true,
      isFictionalSample: true,
      agentPortalUrl: null,
    },
    product: {
      id: productId,
      carrierId,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: `${name} plan (FICTIONAL)`,
      benefitType: options.benefitType ?? 'level',
      status: options.productStatus ?? 'active',
      minFaceAmount: options.minFace ?? 5000,
      maxFaceAmount: options.maxFace ?? 15000,
      faceIncrement: options.increment ?? 1000,
      ageBasis: 'last_birthday',
      minAge: options.minAge ?? 50,
      maxAge: options.maxAge ?? 85,
      tobaccoClasses: options.tobaccoClasses ?? ['non_tobacco', 'tobacco'],
      sexClasses: ['male', 'female'],
      waitingPeriodMonths: options.waitingPeriodMonths ?? 0,
      simplicityScore: options.simplicityScore ?? 3,
      rateMethodology: options.rateMethodology ?? 'exact_only',
      allowInterpolation: options.allowInterpolation ?? false,
      applicationUrl: 'https://example.invalid/apply',
      eApplicationUrl: null,
    },
    states: states.map((stateCode) => ({
      productId,
      stateCode,
      isAvailable: true,
      effectiveDate: null,
      endDate: null,
    })),
    faceLimits: options.faceLimits ?? [],
    rules: (options.rules ?? []).map((r) => ({ ...r, carrierId })),
    medicationRules: (options.medicationRules ?? []).map((r) => ({ ...r, carrierId })),
    rateTables: [
      {
        id: id(),
        productId,
        stateCode: null,
        benefitType: options.benefitType ?? 'level',
        effectiveDate: options.rateEffectiveDate ?? '2020-01-01',
        endDate: options.rateEndDate ?? null,
        status: options.rateStatus ?? 'published',
        version: 1,
        monthlyPolicyFee: options.monthlyPolicyFee ?? 0,
        rateBasis: 'monthly_exact',
        annualPolicyFee: 0,
        monthlyModalFactor: null,
        policyFeeThreshold: null,
        monthlyPolicyFeeBelowThreshold: null,
        isFictionalSample: true,
        entries: options.rates ?? rateEntries(30),
      },
    ],
  };
}

export const INTAKE = {
  stateCode: 'TX',
  age: 65,
  sex: 'female' as const,
  tobaccoUse: false,
  faceAmount: 10000,
  monthlyBudget: null,
};
