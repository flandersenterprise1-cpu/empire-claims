/**
 * FICTIONAL demonstration carrier.
 *
 * ============================ IMPORTANT =================================
 * Every product, rate, limit and underwriting rule below is INVENTED for
 * testing and demonstration. It does not describe any real insurance
 * company, is not a real premium, and is not a real underwriting decision.
 * Rows created from this file are flagged `is_fictional_sample = true` and
 * the UI labels them as fictional everywhere they appear.
 * ========================================================================
 *
 * It exists so the rules engine, rate engine and ranking can be exercised
 * end to end before any real carrier documentation arrives.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const DEMO_CARRIER = {
  slug: 'sample-mutual-fictional',
  name: 'Sample Mutual (FICTIONAL)',
  notes:
    'FICTIONAL demo carrier. Every rate and rule is invented for testing. Delete before production use.',
};

export interface DemoProduct {
  slug: string;
  name: string;
  benefitType: BenefitType;
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
  faceIncrement: number;
  waitingPeriodMonths: number;
  simplicityScore: number;
  /** Optional age-banded face caps. */
  faceLimits?: Array<{ minAge: number; maxAge: number; minFaceAmount: number; maxFaceAmount: number }>;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: 'sample-level',
    name: 'Sample Level Benefit (FICTIONAL)',
    benefitType: 'level',
    minAge: 50,
    maxAge: 85,
    minFaceAmount: 3000,
    maxFaceAmount: 25000,
    faceIncrement: 1000,
    waitingPeriodMonths: 0,
    simplicityScore: 4,
    faceLimits: [{ minAge: 76, maxAge: 85, minFaceAmount: 3000, maxFaceAmount: 15000 }],
  },
  {
    slug: 'sample-graded',
    name: 'Sample Graded Benefit (FICTIONAL)',
    benefitType: 'graded',
    minAge: 50,
    maxAge: 80,
    minFaceAmount: 3000,
    maxFaceAmount: 15000,
    faceIncrement: 1000,
    waitingPeriodMonths: 24,
    simplicityScore: 4,
  },
  {
    slug: 'sample-gi',
    name: 'Sample Guaranteed Issue (FICTIONAL)',
    benefitType: 'guaranteed_issue',
    minAge: 50,
    maxAge: 80,
    minFaceAmount: 3000,
    maxFaceAmount: 10000,
    faceIncrement: 1000,
    waitingPeriodMonths: 24,
    simplicityScore: 5,
  },
];

export interface DemoRule {
  /** Product slugs the rule is scoped to; omit for carrier-wide. */
  products?: string[];
  ruleCategory: string;
  conditionCode: string;
  treatment?: string;
  lookbackMonths?: number;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  explanation: string;
  underwritingConcern?: string;
  priority?: number;
  sourcePage: string;
}

const LEVEL_AND_GRADED = ['sample-level', 'sample-graded'];

export const DEMO_RULES: DemoRule[] = [
  /* ------------------------- Carrier-wide knockouts ---------------------- */
  {
    ruleCategory: 'confinement',
    conditionCode: 'confinement',
    criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: current hospitalization, nursing-home, hospice or bed confinement is an automatic decline on every Sample Mutual plan, including guaranteed issue.',
    underwritingConcern: 'Confinement must end and the client must be back home before any application is taken.',
    priority: 900,
    sourcePage: 'Demo UW guide p.1',
  },
  {
    ruleCategory: 'activities_of_daily_living',
    conditionCode: 'adl',
    criteria: { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: needing help with any activity of daily living is an automatic decline on every Sample Mutual plan.',
    priority: 900,
    sourcePage: 'Demo UW guide p.1',
  },

  /* ----------------------- Level & graded knockouts ---------------------- */
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'hiv',
    conditionCode: 'hiv',
    criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation: 'FICTIONAL RULE: an HIV or AIDS diagnosis is not eligible for underwritten Sample Mutual plans.',
    sourcePage: 'Demo UW guide p.2',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'kidney',
    conditionCode: 'kidney',
    treatment: 'dialysis',
    criteria: { all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] },
    result: 'decline',
    explanation: 'FICTIONAL RULE: dialysis, current or recommended, is an automatic decline.',
    sourcePage: 'Demo UW guide p.4',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cancer',
    conditionCode: 'cancer',
    criteria: {
      all: [
        { fact: 'cancer.present', op: 'eq', value: true },
        {
          fact: 'cancer.treatmentStatus',
          op: 'in',
          value: ['in_treatment', 'treatment_planned', 'refused_treatment', 'palliative'],
        },
      ],
    },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: cancer that is in treatment, awaiting treatment, untreated by choice or palliative is an automatic decline.',
    underwritingConcern: 'Re-quote once treatment has been complete for the full waiting period.',
    priority: 200,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'neurological',
    conditionCode: 'neurological',
    criteria: {
      all: [
        {
          fact: 'neurological.conditions',
          op: 'contains_any',
          value: ['alzheimers', 'dementia', 'als', 'huntingtons', 'memory_loss'],
        },
      ],
    },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: Alzheimer’s, dementia, ALS, Huntington’s or diagnosed cognitive impairment is an automatic decline.',
    sourcePage: 'Demo UW guide p.5',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'respiratory',
    conditionCode: 'respiratory',
    treatment: 'oxygen',
    criteria: { all: [{ fact: 'respiratory.oxygenUse', op: 'eq', value: true }] },
    result: 'decline',
    explanation: 'FICTIONAL RULE: oxygen use for a lung condition is an automatic decline.',
    sourcePage: 'Demo UW guide p.4',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'liver',
    conditionCode: 'liver',
    criteria: {
      all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['cirrhosis', 'liver_failure'] }],
    },
    result: 'decline',
    explanation: 'FICTIONAL RULE: cirrhosis or liver failure is an automatic decline.',
    sourcePage: 'Demo UW guide p.4',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'transplant',
    conditionCode: 'transplant',
    criteria: { all: [{ fact: 'transplant.status', op: 'in', value: ['pending', 'on_list'] }] },
    result: 'decline',
    explanation: 'FICTIONAL RULE: a scheduled or waiting-list transplant is an automatic decline.',
    sourcePage: 'Demo UW guide p.5',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'diabetes',
    conditionCode: 'diabetes',
    treatment: 'complications',
    criteria: {
      all: [
        {
          fact: 'diabetes.complications',
          op: 'contains_any',
          value: ['amputation', 'diabetic_coma', 'insulin_shock'],
        },
      ],
    },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: diabetes with amputation, diabetic coma or insulin shock is an automatic decline.',
    priority: 200,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cardiac',
    conditionCode: 'cardiac',
    lookbackMonths: 12,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 12 },
      ],
    },
    result: 'decline',
    explanation:
      'FICTIONAL RULE: any heart attack, stroke, TIA, bypass, stent or pacemaker within the last 12 months is an automatic decline.',
    priority: 200,
    sourcePage: 'Demo UW guide p.2',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'build',
    conditionCode: 'build',
    criteria: { any: [{ fact: 'build.bmi', op: 'gt', value: 50 }, { fact: 'build.bmi', op: 'lt', value: 16 }] },
    result: 'decline',
    explanation: 'FICTIONAL RULE: a build outside the 16–50 BMI range is outside the published build chart.',
    sourcePage: 'Demo build chart p.1',
  },

  /* --------------------------- Graded classifications -------------------- */
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cardiac',
    conditionCode: 'cardiac',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 12 },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'FICTIONAL RULE: a cardiac event between 12 and 24 months ago classifies graded, not level.',
    underwritingConcern: 'The graded plan pays a reduced benefit during the first 24 months.',
    priority: 150,
    sourcePage: 'Demo UW guide p.2',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cancer',
    conditionCode: 'cancer',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cancer.treatmentStatus', op: 'eq', value: 'completed' },
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
        { fact: 'cancer.type', op: 'nin', value: ['basal_squamous_skin'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'FICTIONAL RULE: internal cancer with treatment completed less than 24 months ago classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'diabetes',
    conditionCode: 'diabetes',
    treatment: 'insulin',
    criteria: {
      all: [
        { fact: 'diabetes.treatment', op: 'in', value: ['insulin', 'pills_and_insulin'] },
        { fact: 'diabetes.insulinStartAge', op: 'lt', value: 30 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: insulin started before age 30 classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'respiratory',
    conditionCode: 'respiratory',
    criteria: {
      all: [
        { fact: 'respiratory.present', op: 'eq', value: true },
        { fact: 'respiratory.oxygenUse', op: 'eq', value: false },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: COPD or emphysema without oxygen classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.4',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'neurological',
    conditionCode: 'neurological',
    criteria: {
      all: [
        { fact: 'neurological.conditions', op: 'contains_any', value: ['parkinsons', 'ms'] },
        {
          fact: 'neurological.conditions',
          op: 'contains_none',
          value: ['alzheimers', 'dementia', 'als', 'huntingtons', 'memory_loss'],
        },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: Parkinson’s or multiple sclerosis without cognitive involvement classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.5',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'kidney',
    conditionCode: 'kidney',
    criteria: {
      all: [
        { fact: 'kidney.present', op: 'eq', value: true },
        { fact: 'kidney.stage', op: 'in', value: ['stage_4', 'stage_5'] },
        { fact: 'kidney.dialysis', op: 'eq', value: false },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: stage 4 or 5 kidney disease without dialysis classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.4',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'substance_abuse',
    conditionCode: 'substance_abuse',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: substance-use treatment within 24 months classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.6',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'transplant',
    conditionCode: 'transplant',
    criteria: { all: [{ fact: 'transplant.status', op: 'eq', value: 'completed' }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: a completed transplant classifies graded.',
    priority: 150,
    sourcePage: 'Demo UW guide p.5',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'liver',
    conditionCode: 'liver',
    criteria: {
      all: [
        { fact: 'liver.present', op: 'eq', value: true },
        {
          fact: 'liver.conditions',
          op: 'contains_none',
          value: ['cirrhosis', 'liver_failure'],
        },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'FICTIONAL RULE: hepatitis or fatty liver disease without cirrhosis classifies graded.',
    priority: 140,
    sourcePage: 'Demo UW guide p.4',
  },

  /* ------------------------------- Referrals ----------------------------- */
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'pending_tests',
    conditionCode: 'pending_tests',
    criteria: { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
    result: 'refer',
    explanation:
      'FICTIONAL RULE: an incomplete test, biopsy or procedure must be resolved with the carrier before an application is taken.',
    sourcePage: 'Demo UW guide p.1',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'mental_health',
    conditionCode: 'mental_health',
    lookbackMonths: 12,
    criteria: {
      all: [
        { fact: 'mental_health.present', op: 'eq', value: true },
        { fact: 'mental_health.lastEventMonthsAgo', op: 'lt', value: 12 },
      ],
    },
    result: 'refer',
    explanation:
      'FICTIONAL RULE: a mental-health hospitalization within 12 months needs a carrier underwriter’s review.',
    sourcePage: 'Demo UW guide p.6',
  },

  /* ---------------------- Explicit level acceptances ---------------------- */
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'diabetes',
    conditionCode: 'diabetes',
    treatment: 'oral_or_diet',
    criteria: {
      all: [
        { fact: 'diabetes.present', op: 'eq', value: true },
        { fact: 'diabetes.treatment', op: 'in', value: ['diet', 'pills'] },
        { fact: 'diabetes.complications', op: 'contains_none', value: ['amputation', 'diabetic_coma', 'insulin_shock', 'nephropathy'] },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    explanation:
      'FICTIONAL RULE: diet- or pill-controlled diabetes with no listed complications is acceptable at level benefits.',
    priority: 100,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cancer',
    conditionCode: 'cancer',
    criteria: {
      any: [
        { fact: 'cancer.type', op: 'eq', value: 'basal_squamous_skin' },
        {
          all: [
            { fact: 'cancer.treatmentStatus', op: 'eq', value: 'completed' },
            { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte', value: 24 },
            { fact: 'cancer.recurrence', op: 'eq', value: false },
          ],
        },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    explanation:
      'FICTIONAL RULE: basal/squamous skin cancer, or any cancer treated and clear for 24 months with no recurrence, is acceptable at level benefits.',
    priority: 100,
    sourcePage: 'Demo UW guide p.3',
  },
  {
    products: LEVEL_AND_GRADED,
    ruleCategory: 'cardiac',
    conditionCode: 'cardiac',
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 24 },
        { fact: 'cardiac.multipleEvents', op: 'eq', value: false },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    explanation:
      'FICTIONAL RULE: a single cardiac event more than 24 months ago is acceptable at level benefits.',
    priority: 100,
    sourcePage: 'Demo UW guide p.2',
  },
];

export interface DemoMedicationRule {
  medicationName: string;
  impliesConditionCode?: string;
  result: RuleResult;
  benefitClassification?: BenefitType;
  explanation: string;
  sourcePage: string;
}

export const DEMO_MEDICATION_RULES: DemoMedicationRule[] = [
  {
    medicationName: 'coumadin',
    impliesConditionCode: 'cardiac',
    result: 'refer',
    explanation:
      'FICTIONAL RULE: warfarin/Coumadin requires the carrier to confirm the underlying reason before a level classification.',
    sourcePage: 'Demo Rx guide p.1',
  },
  {
    medicationName: 'aricept',
    impliesConditionCode: 'neurological',
    result: 'decline',
    explanation:
      'FICTIONAL RULE: donepezil/Aricept indicates treatment for cognitive impairment and is an automatic decline.',
    sourcePage: 'Demo Rx guide p.1',
  },
  {
    medicationName: 'prednisone',
    impliesConditionCode: 'respiratory',
    result: 'refer',
    explanation:
      'FICTIONAL RULE: chronic prednisone needs the carrier to confirm the treated condition.',
    sourcePage: 'Demo Rx guide p.2',
  },
];

/** Fictional monthly rates per $1,000 of coverage, by age band and class. */
export const DEMO_RATE_BASIS: Record<
  'level' | 'graded' | 'guaranteed_issue',
  { male: { non_tobacco: number; tobacco: number }; female: { non_tobacco: number; tobacco: number } }
> = {
  level: {
    male: { non_tobacco: 0.42, tobacco: 0.63 },
    female: { non_tobacco: 0.35, tobacco: 0.52 },
  },
  graded: {
    male: { non_tobacco: 0.55, tobacco: 0.78 },
    female: { non_tobacco: 0.46, tobacco: 0.66 },
  },
  guaranteed_issue: {
    male: { non_tobacco: 0.74, tobacco: 0.74 },
    female: { non_tobacco: 0.62, tobacco: 0.62 },
  },
};
