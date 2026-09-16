/**
 * Transamerica Life Insurance Company — FE Express Solution.
 *
 * Sources:
 *   Transamerica FE Express Solution Agent Guide — 3247945R6 (09/24)
 *   Transamerica FE Express Solution Products At-A-Glance — 3247989R4 (08/24)
 *
 * Two products: an immediate level death benefit and a graded death benefit
 * that pays 110% of premiums received in the first two policy years.
 *
 * Unlike the other carriers loaded so far, Transamerica publishes its state
 * EXCLUSIONS, so state availability can be configured from the document.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const TRANSAMERICA_CARRIER = {
  slug: 'transamerica',
  name: 'Transamerica',
  agentGuide: 'Transamerica FE Express Solution Agent Guide',
  agentGuideRef: '3247945R6 (09/24)',
  productGuide: 'Transamerica FE Express Solution — Products At-A-Glance',
  productGuideRef: '3247989R4 (08/24)',
  effectiveDate: '2024-09-01',
};

/** Products At-A-Glance: "State Availability Exclusions — CA, GU, NY, PA, PR, & VI". */
export const TRANSAMERICA_EXCLUDED_STATES = ['CA', 'NY', 'PA'];

export interface TransamericaProductSpec {
  slug: string;
  name: string;
  benefitType: BenefitType;
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
  waitingPeriodMonths: number;
  annualPolicyFee: number;
  monthlyModalFactor: number;
  faceLimits?: Array<{ minAge: number; maxAge: number; minFaceAmount: number; maxFaceAmount: number; notes: string }>;
  notes: string;
}

export const TRANSAMERICA_PRODUCTS: TransamericaProductSpec[] = [
  {
    slug: 'fe-express-solution',
    name: 'FE Express Solution',
    benefitType: 'level',
    minAge: 18,
    maxAge: 85,
    minFaceAmount: 5000,
    maxFaceAmount: 50000,
    waitingPeriodMonths: 0,
    annualPolicyFee: 42,
    monthlyModalFactor: 0.086,
    faceLimits: [
      { minAge: 18, maxAge: 75, minFaceAmount: 5000, maxFaceAmount: 50000, notes: 'Products At-A-Glance' },
      { minAge: 76, maxAge: 85, minFaceAmount: 5000, maxFaceAmount: 25000, notes: 'Products At-A-Glance' },
    ],
    notes:
      'Nonparticipating whole life with an immediate level death benefit — first day full coverage. Issue ages 18-85, age last birthday. Risk classes Select Nontobacco and Select Tobacco. Level premiums to age 100. $42 annual policy fee, monthly modal factor 0.0860. Includes the Concierge Planning Rider at no additional cost.',
  },
  {
    slug: 'graded-fe-express-solution',
    name: 'Graded FE Express Solution',
    benefitType: 'graded',
    minAge: 18,
    maxAge: 80,
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    waitingPeriodMonths: 24,
    annualPolicyFee: 42,
    monthlyModalFactor: 0.086,
    notes:
      'Nonparticipating whole life with a graded death benefit. If the insured dies within the first two policy years and the death is not accidental, the death benefit is limited to 110% of the premiums received, minus any loan balance. After two policy years the death benefit is the face amount regardless of cause. Issue ages 18-80, age last birthday. Level premiums to age 121. $42 annual policy fee, monthly modal factor 0.0860.',
  },
];

export interface TransamericaRule {
  conditionCode: string;
  ruleCategory: string;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  explanation: string;
  underwritingConcern?: string;
  priority: number;
  sourcePage: string;
}

/**
 * Transamerica FE Express does not publish a condition-by-condition chart in the
 * supplied documents. It describes an instant-decision engine driven by
 * prescription and diagnostic data, with three outcomes, and states the shape of
 * each (Agent Guide, "Underwriting" section).
 */
export const TRANSAMERICA_RULES: TransamericaRule[] = [
  {
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    result: 'refer',
    explanation:
      'Transamerica FE Express reaches an instant decision from prescription and diagnostic data rather than a published condition chart. A client who is currently hospitalised, in a facility or on hospice needs the carrier’s own decision engine before an application is taken.',
    priority: 500,
    sourcePage: 'Agent Guide — Underwriting',
  },
  {
    conditionCode: 'adl',
    ruleCategory: 'activities_of_daily_living',
    criteria: { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    result: 'refer',
    explanation:
      'Transamerica FE Express reaches an instant decision from prescription and diagnostic data rather than a published condition chart. A client needing help with activities of daily living needs the carrier’s own decision engine before an application is taken.',
    priority: 500,
    sourcePage: 'Agent Guide — Underwriting',
  },
];

/**
 * The Agent Guide describes the decision engine's outcomes but the supplied
 * documents do not contain the Adult Single Condition Decision Chart that drives
 * them, so no condition-level rules can be written yet.
 */
export const TRANSAMERICA_UNMAPPED = [
  'Adult Single Condition Decision Chart — referenced by the Agent Guide but NOT included in the supplied documents. This is the chart that maps each medical condition to Select / Graded / Decline.',
  'Height and weight chart — referenced as rating Select / Graded / Decline, not supplied.',
  'Lifestyle factors: alcohol and drug use, driving record, felonies.',
  'Comorbidity rules: "more than 1 comorbidity" is a decline.',
  'The separate Transamerica Solution series (Immediate Solution, 10 Pay Solution, Easy Solution) is a different product line with its own rate basis and has not been loaded.',
];
