/**
 * Combined Insurance Company of America (a Chubb company) — Generational Life.
 *
 * Sources: Producer Guide 500202-R2 (EXP 03/27) and the Generational Life
 * Underwriting Guide.
 *
 * Combined assigns the rating class itself, from the application answers plus a
 * real-time pharmaceutical check (Producer Guide p.8-9). Preferred, Standard and
 * Substandard are all level-benefit classes and differ only in price, so all
 * three are modelled as products and the agent sees the range. Nothing in the
 * interview can predict which one the carrier's system will land on, and the
 * product notes say so.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const COMBINED_CARRIER = {
  slug: 'combined-insurance',
  name: 'Combined Insurance',
  producerGuide: 'Generational Life Producer Guide — 500202-R2 (EXP 03/27)',
  underwritingGuide: 'Generational Life Underwriting Guide',
  effectiveDate: '2025-03-01',
};

export interface CombinedProductSpec {
  slug: string;
  name: string;
  benefitType: BenefitType;
  rateClass: 'preferred' | 'standard' | 'substandard' | 'graded';
  minFaceAmount: number;
  maxFaceAmount: number;
  waitingPeriodMonths: number;
  notes: string;
}

const CLASS_NOTE =
  'Combined assigns the rating class from its own pharmaceutical check at point of sale; it cannot be determined in advance from the health interview. Quote the range across the classes rather than a single class.';

export const COMBINED_PRODUCTS: CombinedProductSpec[] = [
  {
    slug: 'generational-life-preferred',
    name: 'Generational Life — Preferred',
    benefitType: 'level',
    rateClass: 'preferred',
    minFaceAmount: 5000,
    maxFaceAmount: 50000,
    waitingPeriodMonths: 0,
    notes: `Producer Guide p.3, p.9. Level death benefit, 100% of face to age 121. ${CLASS_NOTE}`,
  },
  {
    slug: 'generational-life-standard',
    name: 'Generational Life — Standard',
    benefitType: 'level',
    rateClass: 'standard',
    minFaceAmount: 5000,
    maxFaceAmount: 50000,
    waitingPeriodMonths: 0,
    notes: `Producer Guide p.3, p.9. Level death benefit, 100% of face to age 121. ${CLASS_NOTE}`,
  },
  {
    slug: 'generational-life-substandard',
    name: 'Generational Life — Substandard',
    benefitType: 'level',
    rateClass: 'substandard',
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    waitingPeriodMonths: 0,
    notes: `Producer Guide p.3, p.9. Level death benefit, 100% of face to age 121. ${CLASS_NOTE}`,
  },
  {
    slug: 'generational-life-graded',
    name: 'Generational Life — Graded Death Benefit',
    benefitType: 'graded',
    rateClass: 'graded',
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    waitingPeriodMonths: 24,
    notes:
      'Producer Guide p.3. First two years pay return of premium with 3.75% annual interest; 100% of face after two years, and 100% for accidental death in all years.',
  },
];

export interface CombinedRule {
  conditionCode: string;
  ruleCategory: string;
  treatment?: string;
  lookbackMonths?: number;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  explanation: string;
  underwritingConcern?: string;
  priority: number;
  sourcePage: string;
}

const P8 = 'Producer Guide p.8';

export const COMBINED_RULES: CombinedRule[] = [
  /* -------------------------- Eligibility gates -------------------------- */
  {
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    criteria: {
      any: [
        { fact: 'confinement.type', op: 'in', value: ['nursing_home', 'assisted_living', 'hospice'] },
        { fact: 'confinement.present', op: 'eq', value: true },
      ],
    },
    result: 'decline',
    explanation:
      'To be eligible for Generational Life the primary insured may not currently reside in a nursing home or assisted living facility, or be under hospice care.',
    underwritingConcern: 'Do not submit while the client is in a facility or on hospice.',
    priority: 900,
    sourcePage: P8,
  },
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 6,
    criteria: {
      all: [
        { fact: 'cancer.treatmentStatus', op: 'in', value: ['in_treatment', 'treatment_planned', 'palliative'] },
        { fact: 'cancer.diagnosedMonthsAgo', op: 'lt', value: 6 },
      ],
    },
    result: 'decline',
    explanation:
      'The Producer Guide instructs producers not to submit an application if the applicant is currently under treatment for cancer, stroke or heart attack and was diagnosed within 6 months of the application date.',
    priority: 900,
    sourcePage: P8,
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    lookbackMonths: 6,
    criteria: {
      all: [
        { fact: 'cardiac.events', op: 'contains_any', value: ['heart_attack', 'stroke'] },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 6 },
      ],
    },
    result: 'decline',
    explanation:
      'The Producer Guide instructs producers not to submit an application if the applicant is currently under treatment for cancer, stroke or heart attack and was diagnosed within 6 months of the application date.',
    priority: 900,
    sourcePage: P8,
  },
  {
    conditionCode: 'pending_tests',
    ruleCategory: 'pending_tests',
    criteria: { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
    result: 'refer',
    explanation:
      'The Producer Guide instructs producers not to submit an application for any applicant who has been recommended to have diagnostic testing — blood work, CT, MRI, x-ray, a cardiovascular work-up — or to see a specialist, until a confirmed diagnosis has been made by a physician.',
    priority: 500,
    sourcePage: P8,
  },

  /* ------------------ Graded Death Benefit — ever diagnosed ---------------- */
  {
    conditionCode: 'hiv',
    ruleCategory: 'hiv',
    criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were ever diagnosed with AIDS or HIV.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
    criteria: {
      all: [
        {
          fact: 'neurological.conditions',
          op: 'contains_any',
          value: ['alzheimers', 'dementia', 'parkinsons', 'memory_loss', 'als', 'huntingtons', 'ms'],
        },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were ever diagnosed with Alzheimer’s disease, dementia or a progressive neurological disorder, or diagnosed within the past 5 years with ALS, Huntington’s disease or MS.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    treatment: 'oxygen',
    criteria: { all: [{ fact: 'respiratory.oxygenUse', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were ever diagnosed with any condition that requires oxygen.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    treatment: 'dialysis',
    criteria: { all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were ever diagnosed with any condition that requires dialysis.',
    priority: 200,
    sourcePage: P8,
  },

  /* -------------- Graded Death Benefit — within the past 5 years ---------- */
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 60,
    criteria: {
      any: [
        { fact: 'cancer.diagnosedMonthsAgo', op: 'lt', value: 60 },
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 60 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were diagnosed, treated, tested positive or given advice by a medical professional for cancer within the past 5 years.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    lookbackMonths: 60,
    criteria: {
      all: [
        { fact: 'cardiac.events', op: 'contains_any', value: ['heart_attack', 'stroke'] },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 60 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they had a heart attack or stroke within the past 5 years.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    treatment: 'insulin',
    lookbackMonths: 60,
    criteria: {
      any: [
        { fact: 'diabetes.treatment', op: 'in', value: ['insulin', 'pills_and_insulin'] },
        { fact: 'diabetes.complications', op: 'contains_any', value: ['neuropathy'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were diagnosed, treated or given advice within the past 5 years for insulin-using diabetes or diabetic neuropathy.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    lookbackMonths: 60,
    criteria: {
      all: [
        { fact: 'kidney.present', op: 'eq', value: true },
        { fact: 'kidney.dialysis', op: 'ne', value: true },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were diagnosed, treated or given advice for chronic kidney disease within the past 5 years.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'liver',
    ruleCategory: 'liver',
    lookbackMonths: 60,
    criteria: { all: [{ fact: 'liver.present', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were diagnosed, treated or given advice for chronic liver disease within the past 5 years.',
    priority: 200,
    sourcePage: P8,
  },
  {
    conditionCode: 'substance_abuse',
    ruleCategory: 'substance_abuse',
    lookbackMonths: 60,
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 60 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'The primary insured qualifies for the Graded Death Benefit if they were diagnosed, treated or given advice for alcohol or drug abuse within the past 5 years.',
    priority: 200,
    sourcePage: P8,
  },
];

/**
 * Generational Life conditions the interview does not yet ask about, so no rule
 * is written for them.
 */
export const COMBINED_UNMAPPED = [
  'Terminal illness diagnosed in the last 2 years (eligibility gate)',
  'Anemia (graded, past 5 years)',
  'Pulmonary Arterial Hypertension (graded, past 5 years)',
  'Hereditary Angioedema (graded, past 5 years)',
  'Bipolar disorder (graded, ever)',
  'Schizophrenia (graded, ever)',
  'Replacement of an existing life or annuity policy (eligibility gate)',
];
