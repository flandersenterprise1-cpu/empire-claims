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
  treatment?: string;
  lookbackMonths?: number;
  priority: number;
  sourcePage: string;
}

/**
 * Adult Single Condition Decision Chart — Agent Guide pp.10-12 — plus the Adult
 * Build Chart on p.13.
 *
 * Three outcomes: Decline, Graded, and Select (the level product). Select is the
 * default, so only Decline and Graded need rules; anything the chart marks
 * Select simply matches nothing and lands on the level plan.
 *
 * Transamerica is noticeably more liberal than the other carriers loaded here —
 * COPD ever, congestive heart failure ever, Parkinson's, MS, stroke and a heart
 * attack within 12 months are all Select. That is not an error in transcription;
 * it is what the chart says, and it is exactly the kind of difference the
 * comparison is meant to surface.
 */
const P10 = 'pp.10-12';

export const TRANSAMERICA_CONDITION_RULES: TransamericaRule[] = [
  /* ------------------------------- Decline -------------------------------- */
  {
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines a client who is currently bedridden, in a nursing home, assisted living or long-term care facility, or receiving hospice, palliative or home health care.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'adl',
    ruleCategory: 'activities_of_daily_living',
    criteria: { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    result: 'refer',
    explanation:
      'The decision chart does not rate activities of daily living directly, but declines the bedridden, facility-confined and home-health-care situations that usually accompany them. Confirm with the carrier’s decision engine.',
    priority: 500,
    sourcePage: P10,
  },
  {
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
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
      'The Adult Single Condition Decision Chart declines Alzheimer’s disease, dementia, ALS, Huntington’s disease and cognitive disorder, in each case ever.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'hiv',
    ruleCategory: 'hiv',
    criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation: 'The Adult Single Condition Decision Chart declines HIV/AIDS, ever.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'transplant',
    ruleCategory: 'transplant',
    criteria: { all: [{ fact: 'transplant.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines an organ transplant recipient, or a recommendation for one, ever.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    treatment: 'defibrillator',
    criteria: { all: [{ fact: 'cardiac.events', op: 'contains_any', value: ['defibrillator'] }] },
    result: 'decline',
    explanation: 'The Adult Single Condition Decision Chart declines an implanted defibrillator, ever.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 24,
    criteria: {
      any: [
        { fact: 'cancer.treatmentStatus', op: 'in', value: ['in_treatment', 'treatment_planned', 'refused_treatment', 'palliative'] },
        {
          all: [
            { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
            { fact: 'cancer.type', op: 'ne', value: 'basal_squamous_skin' },
          ],
        },
      ],
    },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines cancer, excluding basal cell carcinoma, that has never been treated or whose last treatment was within 2 years.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'substance_abuse',
    ruleCategory: 'substance_abuse',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines alcohol or drug treatment, and drug use, within 2 years. After 2 years both are Select.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'mental_health',
    ruleCategory: 'mental_health',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'mental_health.present', op: 'eq', value: true },
        { fact: 'mental_health.lastEventMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines a suicide attempt within 2 years. After 2 years it is Select.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'pending_tests',
    ruleCategory: 'pending_tests',
    lookbackMonths: 6,
    criteria: { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'The Adult Single Condition Decision Chart declines pending tests, surgery, hospitalization, medical diagnosis or test results within 6 months. After 6 months it is Select.',
    underwritingConcern:
      'If the test or procedure was more than 6 months ago, or once it completes, this becomes Select. Worth re-quoting.',
    priority: 900,
    sourcePage: P10,
  },
  {
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    treatment: 'pulmonary_fibrosis',
    criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }, { fact: 'respiratory.oxygenUse', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The Adult Single Condition Decision Chart grades supplemental oxygen prescribed within the last 12 months. After 12 months it is Select. Note that cystic and pulmonary fibrosis are declined outright, ever.',
    priority: 200,
    sourcePage: P10,
  },

  /* -------------------------------- Graded -------------------------------- */
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 48,
    criteria: {
      all: [
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte', value: 24 },
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 48 },
        { fact: 'cancer.type', op: 'ne', value: 'basal_squamous_skin' },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The Adult Single Condition Decision Chart grades cancer whose last treatment was 2 to 4 years ago. Over 4 years ago it is Select.',
    priority: 200,
    sourcePage: P10,
  },
  {
    conditionCode: 'liver',
    ruleCategory: 'liver',
    criteria: { all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['cirrhosis'] }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation: 'The Adult Single Condition Decision Chart grades cirrhosis, ever.',
    priority: 200,
    sourcePage: P10,
  },
  {
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    treatment: 'dialysis',
    lookbackMonths: 12,
    criteria: { all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The Adult Single Condition Decision Chart grades kidney dialysis within 12 months. After 12 months it is Select.',
    priority: 200,
    sourcePage: P10,
  },
  {
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    treatment: 'wheelchair',
    lookbackMonths: 12,
    criteria: { all: [{ fact: 'confinement.type', op: 'eq', value: 'home_confined' }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The Adult Single Condition Decision Chart grades wheelchair use within 12 months, other than temporary use of up to 3 months after surgery or injury. After 12 months it is Select.',
    priority: 200,
    sourcePage: P10,
  },

  /* ------------------------- Build chart, Agent Guide p.13 ---------------- */
  {
    conditionCode: 'build',
    ruleCategory: 'build',
    criteria: {
      any: [
        { fact: 'build.bmi', op: 'lt', value: 15 },
        { fact: 'build.bmi', op: 'gt', value: 48 },
      ],
    },
    result: 'decline',
    explanation:
      'The Adult Build Chart covers body mass index from 15.000 to 48.000. A build outside that range is not written.',
    priority: 900,
    sourcePage: 'p.13',
  },
  {
    conditionCode: 'build',
    ruleCategory: 'build',
    criteria: {
      any: [
        { all: [{ fact: 'build.bmi', op: 'gte', value: 15 }, { fact: 'build.bmi', op: 'lt', value: 18.5 }] },
        { all: [{ fact: 'build.bmi', op: 'gt', value: 46 }, { fact: 'build.bmi', op: 'lte', value: 48 }] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The Adult Build Chart rates a body mass index of 15.000 to 18.499, or 46.001 to 48.000, as Graded. Between 18.500 and 46.000 the build is Select.',
    priority: 200,
    sourcePage: 'p.13',
  },
];

/**
 * Chart rows the interview does not yet establish. Each would be a Decline or
 * Graded at Transamerica, so a client with one may be rated worse than this
 * platform shows.
 */
export const TRANSAMERICA_UNMAPPED = [
  'Amputation not due to trauma (Decline, ever)',
  'Clotting Disorder (Decline)',
  'Sickle Cell Anemia (Decline, ever)',
  'Down Syndrome, Cerebral Palsy (Decline, ever)',
  'Cystic or Pulmonary Fibrosis (Decline, ever) — the interview does not separate these from other lung disease',
  'Hospitalization of 2 or more nights within 12 months (Decline)',
  'Incarceration, probation or parole (Decline, current)',
  'Felony charges within 2 years (Decline)',
  'Reckless driving / DUI within 2 years (Graded)',
  'Cardiomyopathy, Chronic Pancreatitis, Muscular Dystrophy (Graded, ever)',
  'Terminal illness with a life expectancy of 12 months or less (Decline, current)',
];
