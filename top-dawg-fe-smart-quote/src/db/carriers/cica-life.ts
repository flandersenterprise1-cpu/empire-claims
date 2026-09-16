/**
 * CICA Life Insurance Company of America — Superior Choice final expense.
 *
 * Sources:
 *   Risk Assessment Guide  AG-CLA-JULY-2025-130
 *   Benefits At A Glance   AR-CLA-C-3114-202609
 *   Corporate Brochure     (Superior Choice)
 *
 * The Risk Assessment Guide is a two-column table: for each condition it marks
 * whether Standard Issue (SI) and Guaranteed Issue (GI) are available. A
 * condition marked "N/A" for SI means the client can only be written on the
 * Guaranteed Issue product, so those become `guaranteed_issue` rules. Conditions
 * marked available for both become `allow` rules.
 *
 * Every explanation quotes the guide's own criteria wording verbatim, because
 * several rows use "...for which the applicant has not been treated... or has
 * not taken medication", which the reviewing administrator should read against
 * the original page before verifying.
 *
 * NOT SUPPLIED in any of the three documents: face amounts, premium rates, and
 * state availability. The products below therefore carry placeholder face
 * limits, are inactive, and have no rate table.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const CICA_CARRIER = {
  slug: 'cica-life',
  name: 'CICA Life',
  riskGuide: 'Superior Choice Risk Assessment Guide',
  riskGuideRef: 'AG-CLA-JULY-2025-130',
  brochure: 'Superior Choice Corporate Brochure / Benefits At A Glance',
  brochureRef: 'AR-CLA-C-3114-202609',
  effectiveDate: '2025-07-01',
};

export interface CicaProductSpec {
  slug: string;
  name: string;
  benefitType: BenefitType;
  waitingPeriodMonths: number;
  simplicityScore: number;
  notes: string;
}

const FACE_UNKNOWN =
  'FACE AMOUNTS NOT FOUND in the Risk Assessment Guide, the Benefits At A Glance sheet or the Corporate Brochure. The minimum and maximum below are platform placeholders and MUST be corrected from a CICA product or rate sheet before this product is activated.';

export const CICA_PRODUCTS: CicaProductSpec[] = [
  {
    slug: 'superior-choice-standard-issue',
    name: 'Superior Choice — Standard Issue',
    benefitType: 'level',
    waitingPeriodMonths: 0,
    simplicityScore: 5,
    notes: `A simplified underwritten whole life product with a level guaranteed premium, guaranteed cash values and guaranteed death benefits. The Benefits At A Glance sheet states there is no waiting period and no height or weight restriction. ${FACE_UNKNOWN}`,
  },
  {
    slug: 'superior-choice-guaranteed-issue',
    name: 'Superior Choice — Guaranteed Issue',
    benefitType: 'guaranteed_issue',
    waitingPeriodMonths: 24,
    simplicityScore: 5,
    notes: `Whole life with a level guaranteed premium and guaranteed cash values. The death benefit is 110% of premiums paid during the first two years (the contestability period) unless the death is accidental. ${FACE_UNKNOWN}`,
  },
];

export interface CicaRule {
  conditionCode: string;
  ruleCategory: string;
  treatment?: string;
  lookbackMonths?: number;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  /** The guide's own criteria wording, quoted in the explanation. */
  guideCriteria: string;
  condition: string;
  priority: number;
}

const GI_ONLY =
  'The Superior Choice Risk Assessment Guide marks Standard Issue as not available for this condition, so the client can only be written on the Guaranteed Issue product.';
const BOTH =
  'The Superior Choice Risk Assessment Guide marks this condition as available on both Standard Issue and Guaranteed Issue.';

function gi(
  conditionCode: string,
  ruleCategory: string,
  condition: string,
  guideCriteria: string,
  criteria: unknown,
  extra: Partial<CicaRule> = {},
): CicaRule {
  return {
    conditionCode,
    ruleCategory,
    criteria,
    result: 'guaranteed_issue',
    benefitClassification: 'guaranteed_issue',
    condition,
    guideCriteria,
    priority: 200,
    ...extra,
  };
}

export const CICA_RULES: CicaRule[] = [
  /* ------------------ Conditions that force Guaranteed Issue -------------- */
  gi(
    'adl',
    'activities_of_daily_living',
    'ADLs (Activities of Daily Living) — Needs assistance with ADLs',
    'Currently hospitalized, confined to a bed or nursing facility, residing in an assisted living facility, receiving hospice care, have any physical or mental impairment in which assistance or supervision is needed for bathing, dressing, eating or toileting, or unable to care for oneself or terminally ill',
    { all: [{ fact: 'adl.present', op: 'eq', value: true }] },
    { priority: 400 },
  ),
  gi(
    'confinement',
    'confinement',
    'ADLs (Activities of Daily Living) — confinement',
    'Currently hospitalized, confined to a bed or nursing facility, residing in an assisted living facility, receiving hospice care, ... or unable to care for oneself or terminally ill',
    { all: [{ fact: 'confinement.present', op: 'eq', value: true }] },
    { priority: 400 },
  ),
  gi(
    'hiv',
    'hiv',
    'AIDS, ARC, HIV',
    'Tested positive for exposure to HIV, diagnosed with ARC or AIDS caused by HIV virus, or any other sickness or condition derived from such infection',
    { all: [{ fact: 'hiv.present', op: 'eq', value: true }] },
  ),
  gi(
    'substance_abuse',
    'substance_abuse',
    'Alcohol, Drug, Opioid, Controlled Substance within the last two years',
    'Received treatment for or been advised by a licensed medical professional to have treatment',
    {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    { lookbackMonths: 24 },
  ),
  gi(
    'neurological',
    'neurological',
    'ALS, Alzheimer’s Disease, Dementia, Parkinson’s, Brain Disease / Disorder of the Brain',
    'Medically diagnosed, treated by a licensed member of the medical profession, or taken medication',
    {
      all: [
        {
          fact: 'neurological.conditions',
          op: 'contains_any',
          value: ['als', 'alzheimers', 'dementia', 'parkinsons', 'memory_loss', 'huntingtons', 'ms'],
        },
      ],
    },
  ),
  gi(
    'cardiac',
    'cardiac',
    'Aneurysm; Congestive Heart Failure, Coronary Artery Disease, Pacemaker, Stroke/TIA in the past 10 years',
    'Medically diagnosed, for which the applicant has not been treated by a licensed member of the medical profession, or has not taken medication',
    {
      all: [
        {
          fact: 'cardiac.events',
          op: 'contains_any',
          value: ['aneurysm', 'chf', 'pacemaker', 'stroke', 'tia', 'heart_attack', 'bypass', 'stent', 'defibrillator'],
        },
        { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 120 },
      ],
    },
    { lookbackMonths: 120 },
  ),
  gi(
    'kidney',
    'kidney',
    'Chronic / End-Stage Kidney Disease in the past 10 years',
    'Medically diagnosed, for which the applicant has not been treated by a licensed member of the medical profession, or has not taken medication',
    { all: [{ fact: 'kidney.present', op: 'eq', value: true }] },
    { lookbackMonths: 120 },
  ),
  gi(
    'respiratory',
    'respiratory',
    'COPD in the past 10 years; Pulmonary Fibrosis',
    'Medically diagnosed, for which the applicant has not been treated by a licensed member of the medical profession, or has not taken medication',
    { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] },
    { lookbackMonths: 120 },
  ),
  gi(
    'cancer',
    'cancer',
    'Current Cancer',
    'Currently being treated for cancer',
    {
      all: [
        { fact: 'cancer.treatmentStatus', op: 'in', value: ['in_treatment', 'treatment_planned', 'palliative'] },
      ],
    },
    { priority: 400 },
  ),
  gi(
    'cancer',
    'cancer',
    'Recurrence of any cancer',
    'Medically diagnosed, treated by a licensed member of the medical profession, or taken medication',
    { all: [{ fact: 'cancer.recurrence', op: 'eq', value: true }] },
    { treatment: 'recurrence' },
  ),
  gi(
    'diabetes',
    'diabetes',
    'Diabetic Coma; Amputation due to disease',
    'Medically diagnosed, treated by a licensed member of the medical profession, or taken medication',
    {
      all: [
        { fact: 'diabetes.complications', op: 'contains_any', value: ['diabetic_coma', 'amputation', 'insulin_shock'] },
      ],
    },
    { treatment: 'complications' },
  ),
  gi(
    'pending_tests',
    'pending_tests',
    'Diagnostic testing, treatment, surgery, or hospitalization in the past 2 years',
    'Been hospitalized two or more times and/or been advised or recommended to have any tests, treatment, surgery, or hospitalization which has not been received or completed',
    { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] },
    { lookbackMonths: 24 },
  ),
  gi(
    'mental_health',
    'mental_health',
    'Suicide attempt within the last 2 years',
    'Whether treated by a licensed member of the medical profession or not',
    {
      all: [
        { fact: 'mental_health.present', op: 'eq', value: true },
        { fact: 'mental_health.lastEventMonthsAgo', op: 'lt', value: 24 },
      ],
    },
    { lookbackMonths: 24 },
  ),
  gi(
    'transplant',
    'transplant',
    'Wheelchair / Electric Scooter; organ transplant risk factors',
    'Regular use of an electric scooter, wheelchair, or wheelchair confinement',
    { all: [{ fact: 'confinement.type', op: 'eq', value: 'home_confined' }] },
  ),

  /* ----------------- Conditions acceptable on Standard Issue -------------- */
  {
    conditionCode: 'cancer',
    ruleCategory: 'cancer',
    treatment: 'resolved',
    criteria: {
      any: [
        { fact: 'cancer.type', op: 'in', value: ['basal_squamous_skin'] },
        {
          all: [
            { fact: 'cancer.treatmentStatus', op: 'eq', value: 'completed' },
            { fact: 'cancer.recurrence', op: 'eq', value: false },
          ],
        },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    condition: 'Basal cell skin cancer; Squamous cell skin cancer; Past Cancer; Single cancer occurrence',
    guideCriteria:
      'Past Cancer: No recurrence, No metastasis, No multiple occurrences. Single cancer occurrence: No metastasis, not currently being treated, no more than one occurrence of any cancer.',
    priority: 100,
  },
  {
    conditionCode: 'diabetes',
    ruleCategory: 'diabetes',
    treatment: 'controlled_insulin',
    criteria: {
      all: [
        { fact: 'diabetes.present', op: 'eq', value: true },
        {
          fact: 'diabetes.complications',
          op: 'contains_none',
          value: ['diabetic_coma', 'amputation', 'insulin_shock'],
        },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    condition: 'Diabetes with use of insulin (ONLY if Diabetes is under control); Cholesterol Treatment',
    guideCriteria: 'Medically diagnosed, treated by a licensed member of the medical profession, or taken medication',
    priority: 100,
  },
  {
    conditionCode: 'substance_abuse',
    ruleCategory: 'substance_abuse',
    criteria: {
      all: [
        { fact: 'substance_abuse.present', op: 'eq', value: true },
        { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'gte', value: 24 },
      ],
    },
    result: 'allow',
    benefitClassification: 'level',
    condition: 'Alcohol, Drug, Opioid, Controlled Substance more than 2 years ago',
    guideCriteria: 'Received treatment for or been advised by a licensed medical professional to have treatment',
    priority: 100,
  },
];

export function cicaExplanation(rule: CicaRule): string {
  const verdict = rule.result === 'allow' ? BOTH : GI_ONLY;
  return `${rule.condition}. The guide's criteria: "${rule.guideCriteria}". ${verdict}`;
}

/** Risk Assessment Guide rows the interview does not yet establish. */
export const CICA_UNMAPPED = [
  'Bipolar Disorder; Schizophrenia (GI only)',
  'Cardiomyopathy in the past 10 years (GI only)',
  'Chronic Pancreatitis (GI only)',
  'Cystic Fibrosis (GI only)',
  'Diabetes (uncontrolled) in the past 10 years (GI only)',
  'Paralysis in the past 10 years (GI only)',
  'SLE — Systemic Lupus (GI only)',
  'Terminal Illness (GI only)',
  'Sickle Cell Anemia (available on both)',
  'Tobacco/Nicotine use with no additional co-morbidities (available on both)',
];
