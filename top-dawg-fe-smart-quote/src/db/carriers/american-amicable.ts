/**
 * American Amicable — Senior Choice Whole Life.
 *
 * Source: "AGENT GUIDE — Underwriting Guidelines / Premium Rates, Senior Choice
 * Whole Life Insurance (Ages 50 through 85)", form 3079(9/23), CN14-001.
 *
 * The Senior Choice application routes the applicant to a plan deterministically
 * from eight yes/no health questions (Agent Guide p.4 and p.9):
 *
 *   Q1, Q2 or Q3 = Yes  -> not eligible for ANY Senior Choice plan
 *   Any of Q4-Q7 = Yes  -> Return of Premium Death Benefit  (modelled as "modified")
 *   Any of Q8    = Yes  -> Graded Death Benefit
 *   All 1-8      = No   -> Immediate Death Benefit          (level)
 *
 * The rules below translate those compound application questions into the
 * granular facts this platform's health interview actually collects. Where a
 * question asks about something the interview does not yet establish, no rule is
 * written — the engine then returns "Requires underwriting verification" rather
 * than guessing. Unmapped items are listed in UNMAPPED_QUESTION_ITEMS below.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

/**
 * State approval, from form 3523 "Dignity Solution State Approval Listing".
 * Every other state is approved for all three plans (IDB / GDB / ROP).
 *
 * Iowa appears on the listing as a row but carries no approval marks, so it is
 * treated as not approved — the conservative reading. Maine, Montana, New
 * Hampshire and New York do not appear on the listing at all.
 */
export const AMAM_UNAPPROVED_STATES = ['IA', 'ME', 'MT', 'NH', 'NY'];

export const AMAM_CARRIER = {
  slug: 'american-amicable',
  name: 'American Amicable',
  sourceDocTitle: 'Senior Choice Agent Guide — Underwriting Guidelines & Premium Rates',
  sourceDocRef: 'Form 3079(9/23) CN14-001',
  /** Printed on the guide as 9/23. */
  effectiveDate: '2023-09-01',

  /**
   * The same policy sold under the Asurea brand. Form 3049(10/25) "Dignity
   * Solutions Agent Guide" covers the identical policy forms — 9767 Immediate,
   * 9644 Graded, 9645 Return of Premium — and the identical application, form
   * 9466. All 432 rate values in the two guides were compared programmatically
   * and are identical, as are the $30 annual policy fee and the modal factors.
   * So the rates and rules loaded here serve both brand names.
   */
  dignityGuideTitle: 'Dignity Solutions Agent Guide — Underwriting Guidelines & Premium Rates',
  dignityGuideRef: 'Form 3049(10/25) CN13-029',
  stateListingTitle: 'Dignity Solution State Approval Listing',
  stateListingRef: 'Form 3523',
};

export interface AmamProductSpec {
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
  annualPolicyFee: number;
  monthlyModalFactor: number;
  /** Age-banded caps, Agent Guide p.4 "Policy Specifications". */
  faceLimits?: Array<{ minAge: number; maxAge: number; minFaceAmount: number; maxFaceAmount: number; stateCode?: string; notes?: string }>;
  notes: string;
}

export const AMAM_PRODUCTS: AmamProductSpec[] = [
  {
    slug: 'senior-choice-immediate',
    name: 'Senior Choice Immediate Death Benefit',
    benefitType: 'level',
    minAge: 50,
    maxAge: 85,
    minFaceAmount: 2500,
    maxFaceAmount: 50000,
    faceIncrement: 1000,
    waitingPeriodMonths: 0,
    simplicityScore: 5,
    annualPolicyFee: 30,
    monthlyModalFactor: 0.088,
    faceLimits: [
      { minAge: 50, maxAge: 75, minFaceAmount: 2500, maxFaceAmount: 50000, notes: 'Agent Guide p.4' },
      { minAge: 76, maxAge: 85, minFaceAmount: 2500, maxFaceAmount: 25000, notes: 'Agent Guide p.4' },
      { minAge: 50, maxAge: 85, minFaceAmount: 5000, maxFaceAmount: 50000, stateCode: 'WA', notes: 'Minimum death benefit is $5,000 in Washington. Agent Guide p.4' },
    ],
    notes:
      'Policy form 9767. Level death benefit, 100% of face paid immediately. Includes Terminal Illness ADB and Confined Care ADB riders at no cost. Face increment is NOT stated in the Agent Guide and has been set to $1,000 pending confirmation.',
  },
  {
    slug: 'senior-choice-graded',
    name: 'Senior Choice Graded Death Benefit',
    benefitType: 'graded',
    minAge: 50,
    maxAge: 85,
    minFaceAmount: 2500,
    maxFaceAmount: 25000,
    faceIncrement: 1000,
    waitingPeriodMonths: 24,
    simplicityScore: 5,
    annualPolicyFee: 30,
    monthlyModalFactor: 0.088,
    faceLimits: [
      { minAge: 50, maxAge: 85, minFaceAmount: 5000, maxFaceAmount: 25000, stateCode: 'WA', notes: 'Minimum death benefit is $5,000 in Washington. Agent Guide p.4' },
    ],
    notes:
      'Policy form 9644. Pays 30% of face in year 1, 70% in year 2, 100% in year 3 and after. 100% for accidental death in all years. Agent Guide p.5.',
  },
  {
    slug: 'senior-choice-rop',
    name: 'Senior Choice Return of Premium Death Benefit',
    benefitType: 'modified',
    minAge: 50,
    maxAge: 85,
    minFaceAmount: 2500,
    maxFaceAmount: 25000,
    faceIncrement: 1000,
    /** 3 years under age 65, 2 years age 65+. Stored as the longer period. */
    waitingPeriodMonths: 36,
    simplicityScore: 5,
    annualPolicyFee: 30,
    monthlyModalFactor: 0.088,
    faceLimits: [
      { minAge: 50, maxAge: 85, minFaceAmount: 5000, maxFaceAmount: 25000, stateCode: 'WA', notes: 'Minimum death benefit is $5,000 in Washington. Agent Guide p.4' },
    ],
    notes:
      'Policy form 9645. Returns premium plus 10% interest for 3 years if under age 65, 2 years if age 65 or older; 100% after that period. 100% for accidental death in all years. Agent Guide p.5. The waiting period is stored as 36 months (the longer of the two) — the engine does not yet vary it by age.',
  },
];

export interface AmamRule {
  /** Question on the Senior Choice application this rule comes from. */
  question: string;
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

/** Application health questions live on Agent Guide p.9. */
const P9 = 'p.9';

export const AMAM_RULES: AmamRule[] = [
  /* ---------------- Questions 1-3: not eligible for any plan --------------- */
  {
    question: 'Q1',
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 1 asks whether the client is currently hospitalized, confined to a nursing facility, bed or wheelchair, receiving hospice or home health care. A "Yes" to question 1 means the client is not eligible for any Senior Choice plan.',
    underwritingConcern: 'Confinement must end before an application can be taken.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q1',
    conditionCode: 'adl',
    ruleCategory: 'activities_of_daily_living',
    criteria: { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 1 includes requiring assistance from anyone with activities of daily living such as bathing, dressing, eating or toileting. A "Yes" to question 1 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q1',
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    treatment: 'oxygen',
    criteria: { all: [{ fact: 'respiratory.oxygenUse', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 1 includes currently using oxygen equipment to assist in breathing. A "Yes" to question 1 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q1',
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    treatment: 'current',
    criteria: {
      all: [
        { fact: 'cancer.present', op: 'eq', value: true },
        { fact: 'cancer.treatmentStatus', op: 'in', value: ['in_treatment', 'treatment_planned', 'palliative', 'refused_treatment'] },
        { fact: 'cancer.type', op: 'ne', value: 'basal_squamous_skin' },
      ],
    },
    result: 'decline',
    explanation:
      'Senior Choice question 1 asks whether the client currently has any form of cancer, excluding basal cell skin cancer. A "Yes" to question 1 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q2',
    conditionCode: 'transplant',
    ruleCategory: 'transplant',
    criteria: { all: [{ fact: 'transplant.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 2 asks whether the client has had, or been medically advised to have, an organ transplant. A "Yes" to question 2 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q2',
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    treatment: 'dialysis',
    criteria: { all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 2 asks whether the client has had, or been medically advised to have, kidney dialysis. A "Yes" to question 2 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q2',
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    treatment: 'congestive_heart_failure',
    criteria: { all: [{ fact: 'cardiac.events', op: 'contains_any', value: ['chf'] }] },
    result: 'decline',
    explanation:
      'Senior Choice question 2 asks whether the client has been medically diagnosed with congestive heart failure. A "Yes" to question 2 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q2',
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
    criteria: {
      all: [
        { fact: 'neurological.conditions', op: 'contains_any', value: ['alzheimers', 'dementia', 'als', 'memory_loss'] },
      ],
    },
    result: 'decline',
    explanation:
      'Senior Choice question 2 asks whether the client has been medically diagnosed with Alzheimer’s, dementia, mental incapacity or Lou Gehrig’s disease (ALS). A "Yes" to question 2 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q2',
    conditionCode: 'liver',
    ruleCategory: 'liver',
    treatment: 'liver_failure',
    criteria: { all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['liver_failure'] }] },
    result: 'decline',
    explanation:
      'Senior Choice question 2 asks whether the client has been medically diagnosed with liver failure. A "Yes" to question 2 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },
  {
    question: 'Q3',
    conditionCode: 'hiv',
    ruleCategory: 'hiv',
    criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
    result: 'decline',
    explanation:
      'Senior Choice question 3 asks about AIDS, ARC, any immune deficiency related disorder, or a positive HIV test. A "Yes" to question 3 means the client is not eligible for any Senior Choice plan.',
    priority: 900,
    sourcePage: P9,
  },

  /* ------------- Questions 4-7: Return of Premium plan (modified) ---------- */
  {
    question: 'Q4',
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    treatment: 'complications',
    criteria: {
      all: [
        {
          fact: 'diabetes.complications',
          op: 'contains_any',
          value: ['insulin_shock', 'diabetic_coma', 'retinopathy', 'nephropathy', 'neuropathy', 'amputation'],
        },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 4 asks about complications of diabetes including insulin shock, diabetic coma, retinopathy, nephropathy or neuropathy. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    underwritingConcern: 'The Return of Premium plan returns premium plus 10% during the waiting period — it does not pay the face amount.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q4',
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    treatment: 'insulin_before_50',
    criteria: { all: [{ fact: 'diabetes.insulinStartAge', op: 'lt', value: 50 }] },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 4 asks whether the client used insulin prior to age 50. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q5',
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    criteria: {
      all: [
        { fact: 'kidney.present', op: 'eq', value: true },
        { fact: 'kidney.dialysis', op: 'ne', value: true },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 5 asks about renal insufficiency, kidney failure or chronic kidney disease. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q5',
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    treatment: 'recurrence',
    criteria: { all: [{ fact: 'cancer.recurrence', op: 'eq', value: true }] },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 5 asks about more than one occurrence of cancer in the client’s lifetime, excluding basal cell skin cancer. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q6',
    conditionCode: 'pending_tests',
    ruleCategory: 'pending_tests',
    lookbackMonths: 24,
    criteria: { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 6 asks whether, within the past 2 years, any advised diagnostic testing, surgery or hospitalization has not been completed or has results outstanding. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    underwritingConcern: 'Completing the test or procedure first may qualify the client for a better plan. Consider re-quoting afterwards.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q7a/Q7b',
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 7 asks whether, within the past 2 years, the client was diagnosed or treated for angina, stroke or TIA, or had a heart attack, aneurysm, or any heart, brain or circulatory surgery including a pacemaker or defibrillator. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q7a',
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'respiratory.present', op: 'eq', value: true },
        { fact: 'respiratory.oxygenUse', op: 'ne', value: true },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 7 asks whether, within the past 2 years, the client was diagnosed or treated for COPD, emphysema or chronic bronchitis. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q7a',
    conditionCode: 'liver',
    ruleCategory: 'liver',
    lookbackMonths: 24,
    criteria: {
      all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['cirrhosis', 'hepatitis_c'] }],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 7 asks whether, within the past 2 years, the client was diagnosed or treated for cirrhosis, Hepatitis C or chronic hepatitis. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q7c',
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
        { fact: 'cancer.type', op: 'ne', value: 'basal_squamous_skin' },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 7 asks whether, within the past 2 years, the client was diagnosed, treated or took medication for any form of cancer, excluding basal cell skin cancer. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },
  {
    question: 'Q7d',
    conditionCode: 'substance_abuse',
    ruleCategory: 'substance_abuse',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'modified',
    benefitClassification: 'modified',
    explanation:
      'Senior Choice question 7 asks whether, within the past 2 years, the client used illegal drugs, abused alcohol or drugs, or had or was recommended treatment or counselling for alcohol or drug use. A "Yes" routes the client to the Return of Premium Death Benefit plan.',
    priority: 300,
    sourcePage: P9,
  },

  /* ------------------- Question 8: Graded Death Benefit ------------------- */
  {
    question: 'Q8a',
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    lookbackMonths: 36,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 24 },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 36 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'Senior Choice question 8 asks whether, within the past 3 years, the client was diagnosed, treated or hospitalized for stroke, angina, heart attack, aneurysm, or heart or circulatory surgery. A "Yes" to question 8 alone routes the client to the Graded Death Benefit plan.',
    priority: 200,
    sourcePage: P9,
  },
  {
    question: 'Q8b',
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    lookbackMonths: 36,
    criteria: {
      all: [
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte', value: 24 },
        { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 36 },
        { fact: 'cancer.type', op: 'ne', value: 'basal_squamous_skin' },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'Senior Choice question 8 asks whether, within the past 3 years, the client was diagnosed, treated or took medication for any form of cancer, excluding basal cell skin cancer. A "Yes" to question 8 alone routes the client to the Graded Death Benefit plan.',
    priority: 200,
    sourcePage: P9,
  },
  {
    question: 'Q8c',
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
    lookbackMonths: 36,
    criteria: {
      all: [
        { fact: 'neurological.conditions', op: 'contains_any', value: ['ms', 'seizures', 'parkinsons'] },
        { fact: 'neurological.conditions', op: 'contains_none', value: ['alzheimers', 'dementia', 'als', 'memory_loss'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    explanation:
      'Senior Choice question 8 asks whether, within the past 3 years, the client was diagnosed, treated or hospitalized for multiple sclerosis, seizures, Parkinson’s disease, muscular dystrophy, cerebral palsy or paralysis of two or more extremities. A "Yes" to question 8 alone routes the client to the Graded Death Benefit plan.',
    priority: 200,
    sourcePage: P9,
  },
];

/**
 * Items the Senior Choice application asks about that this platform's health
 * interview does not yet collect. No rule is written for these, so a client
 * affected by one will be classified on the facts that ARE known — which may be
 * more favourable than the carrier's actual decision. Add interview questions
 * for these before relying on the result unsupervised.
 */
export const UNMAPPED_QUESTION_ITEMS = [
  'Q1: amputation caused by disease',
  'Q2: mental incapacity; respiratory failure; terminal condition expected to result in death within 12 months',
  'Q7a: cardiomyopathy; systemic lupus (SLE); chronic pancreatitis',
  'Q8b: ulcerative colitis',
  'Q8c: muscular dystrophy; cerebral palsy; paralysis of two or more extremities',
  'Build chart (Agent Guide p.16) — height/weight limits per plan are not yet loaded as rules',
];
