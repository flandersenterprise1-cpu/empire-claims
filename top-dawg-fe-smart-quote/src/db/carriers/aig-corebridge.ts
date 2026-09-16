/**
 * AIG / Corebridge — American General Life Insurance Company (AGL).
 *
 * Sources:
 *   SimpliNow Legacy Simplified Issue Whole Life Underwriting Guide — AGLC201453 REV0424
 *   Guaranteed Issue Whole Life — AGLC200472 REV1224
 *
 * The SimpliNow underwriting guide is a condition / sub-condition / time frame /
 * decision table, which maps almost one-for-one onto this engine's rules. Where
 * the guide distinguishes a cancer STAGE and the interview does not ask for one,
 * the conservative decision is used and the gap is recorded in AIG_UNMAPPED.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const AIG_CARRIER = {
  slug: 'aig-corebridge',
  name: 'AIG / Corebridge',
  siwlGuide: 'SimpliNow Legacy Simplified Issue Whole Life — Underwriting Guide',
  siwlRef: 'AGLC201453 REV0424',
  giwlGuide: 'Guaranteed Issue Whole Life',
  giwlRef: 'AGLC200472 REV1224',
  effectiveDate: '2024-04-01',
};

export interface AigProductSpec {
  slug: string;
  name: string;
  benefitType: BenefitType;
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
  annualPolicyFee: number;
  waitingPeriodMonths: number;
  /** Whether the SimpliNow underwriting rules apply to this product. */
  underwritten: boolean;
  notes: string;
}

const FACE_UNKNOWN =
  'FACE AMOUNTS NOT STATED in the supplied SimpliNow Legacy underwriting guide. The range below is a placeholder and must be corrected from the SimpliNow product guide or the SimpliNow Quoter before activation.';

export const AIG_PRODUCTS: AigProductSpec[] = [
  {
    slug: 'simplinow-legacy-max',
    name: 'SimpliNow Legacy Max (Level)',
    benefitType: 'level',
    minAge: 50,
    maxAge: 80,
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    annualPolicyFee: 36,
    waitingPeriodMonths: 0,
    underwritten: true,
    notes: `Level death benefit — the policy pays the full amount in all years. Annual policy fee $36 (guide p.9). ${FACE_UNKNOWN}`,
  },
  {
    slug: 'simplinow-legacy',
    name: 'SimpliNow Legacy (Graded)',
    benefitType: 'graded',
    minAge: 50,
    maxAge: 80,
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    annualPolicyFee: 12,
    waitingPeriodMonths: 24,
    underwritten: true,
    notes: `Graded death benefit — if the insured dies within the first two years the paid death benefit equals 110% of premiums paid; after two years it equals the policy face amount. Annual policy fee $12 (guide p.9). ${FACE_UNKNOWN}`,
  },
  {
    slug: 'giwl',
    name: 'Guaranteed Issue Whole Life',
    benefitType: 'guaranteed_issue',
    minAge: 50,
    maxAge: 80,
    minFaceAmount: 5000,
    maxFaceAmount: 25000,
    annualPolicyFee: 24,
    waitingPeriodMonths: 24,
    underwritten: false,
    notes:
      'Guaranteed acceptance ages 50-80 (age last birthday), face amounts $5,000-$25,000, annual $24 policy fee. No medical exam, labs or health questions; the client cannot be turned down for health reasons. WAITING PERIOD NOT STATED in the supplied guide — set to 24 months as the conservative assumption and must be confirmed before activation.',
  },
];

export interface AigRule {
  conditionCode: string;
  ruleCategory: string;
  subCondition: string;
  timeFrame: string;
  treatment?: string;
  lookbackMonths?: number;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  priority: number;
  concern?: string;
}

const CANCER_DECLINE_24 = [
  'brain',
  'lung',
  'liver',
  'pancreatic',
  'leukemia_lymphoma',
];

export const AIG_RULES: AigRule[] = [
  /* ------------------------------ Neurological ---------------------------- */
  {
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
    subCondition: 'Alzheimer’s or Dementia; Huntington’s Disease; Lou Gehrig’s Disease (ALS)',
    timeFrame: 'Ever',
    criteria: {
      all: [
        {
          fact: 'neurological.conditions',
          op: 'contains_any',
          value: ['alzheimers', 'dementia', 'huntingtons', 'als', 'memory_loss'],
        },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'neurological',
    ruleCategory: 'neurological',
    subCondition: 'Multiple Sclerosis; Parkinson’s Disease',
    timeFrame: 'Ever',
    criteria: {
      all: [
        { fact: 'neurological.conditions', op: 'contains_any', value: ['ms', 'parkinsons'] },
        {
          fact: 'neurological.conditions',
          op: 'contains_none',
          value: ['alzheimers', 'dementia', 'huntingtons', 'als', 'memory_loss'],
        },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
  },

  /* --------------------------------- Cancer ------------------------------- */
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    subCondition:
      'Brain, Esophageal, Head or Neck, Leukemia, Liver, Lung, Lymphoma, Ovarian, Pancreas, Sarcoma, Small Intestine, Stomach, Multiple Myeloma, Carcinoid / Neuroendocrine',
    timeFrame: 'Last 24 Months',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cancer.type', op: 'in', value: CANCER_DECLINE_24 },
        { fact: 'cancer.diagnosedMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    subCondition: 'Metastatic or Recurrent Cancer of the same type (Stage III or Stage IV cancer)',
    timeFrame: 'Ever',
    criteria: { all: [{ fact: 'cancer.recurrence', op: 'eq', value: true }] },
    result: 'decline',
    treatment: 'recurrence',
    priority: 900,
  },
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    subCondition: 'Other Cancer Not Listed, and all listed cancers at Stage II',
    timeFrame: 'Last 48 Months',
    lookbackMonths: 48,
    criteria: {
      all: [
        { fact: 'cancer.present', op: 'eq', value: true },
        { fact: 'cancer.type', op: 'nin', value: [...CANCER_DECLINE_24, 'basal_squamous_skin'] },
        { fact: 'cancer.diagnosedMonthsAgo', op: 'lt', value: 48 },
        { fact: 'cancer.recurrence', op: 'eq', value: false },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
    concern:
      'The AIG guide classifies Stage I of several cancers as Level and Stage II as Graded. The health interview does not ask for a cancer stage, so the conservative Graded classification is applied. Confirm the stage with the client — a Stage I diagnosis may qualify for SimpliNow Legacy Max.',
  },

  /* -------------------------------- Diabetes ------------------------------ */
  {
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    subCondition: 'Amputation due to diabetic complications',
    timeFrame: 'Ever',
    treatment: 'amputation',
    criteria: { all: [{ fact: 'diabetes.complications', op: 'contains_any', value: ['amputation'] }] },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    subCondition: 'Diabetes, if also had Stroke or also had Coronary Disease',
    timeFrame: 'Ever',
    criteria: {
      all: [
        { fact: 'diabetes.present', op: 'eq', value: true },
        {
          fact: 'cardiac.events',
          op: 'contains_any',
          value: ['stroke', 'tia', 'heart_attack', 'bypass', 'stent', 'angioplasty'],
        },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    subCondition: 'Diabetes with A1C 8.6 or less — Graded if on Insulin, Level if not on Insulin',
    timeFrame: 'Current',
    treatment: 'insulin',
    criteria: {
      all: [
        { fact: 'diabetes.treatment', op: 'in', value: ['insulin', 'pills_and_insulin'] },
        { fact: 'diabetes.complications', op: 'contains_none', value: ['amputation'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
    concern:
      'The AIG decision also depends on the client’s A1C: 8.7-9.9 is Graded and 10 or above is a Decline. The health interview does not capture an A1C value.',
  },

  /* ---------------------------- Heart, TIA, stroke ------------------------ */
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    subCondition:
      'Angina, Coronary Artery Disease with Angioplasty/Stenting or Bypass Grafting, Myocardial Infarction',
    timeFrame: 'Last 6 months',
    lookbackMonths: 6,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 6 },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    subCondition: 'Stroke',
    timeFrame: 'Last 12 months',
    lookbackMonths: 12,
    criteria: {
      all: [
        { fact: 'cardiac.events', op: 'contains_any', value: ['stroke'] },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 12 },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    subCondition: 'Angina, CAD with stent or bypass, Myocardial Infarction — tobacco user',
    timeFrame: 'Last 24 months & Tobacco',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'cardiac.present', op: 'eq', value: true },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 6 },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
    concern:
      'AIG classifies a cardiac event in the last 24 months as Level for a non-tobacco client and Graded for a tobacco user. The conservative Graded classification is applied here; a non-tobacco client may qualify for SimpliNow Legacy Max.',
  },
  {
    conditionCode: 'cardiac',
    ruleCategory: 'cardiac',
    subCondition: 'Recurrent Episodes of TIA',
    timeFrame: 'Ever',
    criteria: {
      all: [
        { fact: 'cardiac.events', op: 'contains_any', value: ['tia'] },
        { fact: 'cardiac.multipleEvents', op: 'eq', value: true },
      ],
    },
    result: 'decline',
    priority: 900,
  },

  /* ------------------------------ HIV, kidney, liver ---------------------- */
  {
    conditionCode: 'hiv',
    ruleCategory: 'hiv',
    subCondition: 'HIV, AIDS, ARC',
    timeFrame: 'Ever',
    criteria: { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    subCondition: 'Advanced or End Stage Renal Disease or in need of dialysis',
    timeFrame: 'Ever',
    treatment: 'dialysis',
    criteria: {
      any: [
        { fact: 'kidney.dialysis', op: 'eq', value: true },
        { fact: 'kidney.stage', op: 'in', value: ['stage_5'] },
      ],
    },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'kidney',
    ruleCategory: 'kidney',
    subCondition: 'Chronic Kidney Disease (including chronic renal insufficiency)',
    timeFrame: 'Last 48 Months',
    lookbackMonths: 48,
    criteria: {
      all: [
        { fact: 'kidney.present', op: 'eq', value: true },
        { fact: 'kidney.dialysis', op: 'ne', value: true },
        { fact: 'kidney.stage', op: 'nin', value: ['stage_5'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
  },
  {
    conditionCode: 'liver',
    ruleCategory: 'liver',
    subCondition: 'Liver Cirrhosis',
    timeFrame: 'Ever',
    criteria: { all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['cirrhosis', 'liver_failure'] }] },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'liver',
    ruleCategory: 'liver',
    subCondition: 'Hepatitis B',
    timeFrame: 'Ever',
    criteria: {
      all: [
        { fact: 'liver.conditions', op: 'contains_any', value: ['hepatitis_b', 'hepatitis_c', 'fatty_liver', 'other'] },
        { fact: 'liver.conditions', op: 'contains_none', value: ['cirrhosis', 'liver_failure'] },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
  },

  /* --------------------------------- Lung --------------------------------- */
  {
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    subCondition: 'Chronic Obstructive Pulmonary Disease (COPD) — tobacco user',
    timeFrame: 'Tobacco User',
    criteria: { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
    concern:
      'AIG declines COPD outright for a tobacco user, and declines any client hospitalised for COPD, chronic bronchitis or emphysema more than once in the past 24 months. Confirm tobacco use and hospitalisation history before submitting.',
  },
  {
    conditionCode: 'respiratory',
    ruleCategory: 'respiratory',
    subCondition: 'COPD, Chronic Bronchitis or Emphysema — hospitalised more than once',
    timeFrame: 'Last 24 months',
    lookbackMonths: 24,
    treatment: 'hospitalised',
    criteria: {
      all: [
        { fact: 'respiratory.present', op: 'eq', value: true },
        { fact: 'respiratory.lastHospitalizationMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'decline',
    priority: 900,
  },

  /* ----------------------- Mental health, substance use ------------------- */
  {
    conditionCode: 'mental_health',
    ruleCategory: 'mental_health',
    subCondition: 'Suicide Attempt; Mental Incapacity',
    timeFrame: 'Ever',
    criteria: { all: [{ fact: 'mental_health.present', op: 'eq', value: true }] },
    result: 'decline',
    priority: 900,
    concern:
      'AIG declines a suicide attempt ever, and declines a psychotic event or schizophrenia hospitalisation in the last 36 months. Schizophrenia without a recent hospitalisation is Graded, and Bipolar Disorder in the last 48 months is Graded.',
  },
  {
    conditionCode: 'substance_abuse',
    ruleCategory: 'substance_abuse',
    subCondition: 'Substance Abuse (Alcohol or Drugs)',
    timeFrame: 'Last 24 months',
    lookbackMonths: 24,
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    result: 'graded',
    benefitClassification: 'graded',
    priority: 200,
    concern:
      'AIG declines use of narcotics without a prescription in the last 24 months, which the interview does not ask about separately.',
  },

  /* ----------------------- Transplant, confinement, ADLs ------------------ */
  {
    conditionCode: 'transplant',
    ruleCategory: 'transplant',
    subCondition: 'Organ Transplant; Bone Marrow Transplant',
    timeFrame: 'Ever',
    criteria: { all: [{ fact: 'transplant.present', op: 'eq', value: true }] },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'confinement',
    ruleCategory: 'confinement',
    subCondition:
      'Bedridden; confined to any Skilled Nursing Facility or Hospital Facility; requires an electric scooter; home health care',
    timeFrame: 'Currently',
    criteria: { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    result: 'decline',
    priority: 900,
  },
  {
    conditionCode: 'adl',
    ruleCategory: 'activities_of_daily_living',
    subCondition: 'Assistance with ADLs due to a chronic or debilitating condition',
    timeFrame: 'Currently',
    criteria: { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    result: 'decline',
    priority: 900,
  },
];

export function aigExplanation(rule: AigRule): string {
  const decision =
    rule.result === 'decline'
      ? 'Decline'
      : rule.result === 'graded'
        ? 'Graded death benefit'
        : 'Level death benefit';
  return `SimpliNow Legacy underwriting guide — ${rule.subCondition}. Time frame: ${rule.timeFrame}. Decision: ${decision}.`;
}

/** Guide rows the interview does not yet establish. */
export const AIG_UNMAPPED = [
  'Cancer STAGE (Stage I is Level, Stage II is Graded for bladder, bone, breast, cervical, colon, endometrial, kidney, melanoma, prostate, testicular and thyroid) — the interview does not ask for a stage',
  'A1C value for diabetes (8.6 or less / 8.7-9.9 / 10+)',
  'Myelodysplastic Syndrome (MDS) — Decline ever',
  'Brain aneurysm with or without repair surgery',
  'Rheumatoid or Psoriatic Arthritis — Level, last 48 months',
  'Scleroderma / Systemic Sclerosis, Dermatomyositis — Graded, last 48 months',
  'Lupus — Graded, last 48 months',
  'Declined for life insurance within the last 12 months — Decline',
  'Felony, DUI, arrest or incarceration in the last 24 months — Decline',
  'Unexplained weight loss in the last 12 months — Graded',
  'Bipolar Disorder last 48 months (Graded); Schizophrenia ever (Graded)',
  'Build chart (guide p.8) — separate min/max weight bands for SimpliNow Legacy and SimpliNow Legacy Max',
  'Prescription decline list (guide p.10) — brand/generic medications that force a Decline',
];
