/**
 * Royal Neighbors of America -- Ensured Legacy Final Expense.
 *
 * Sources, all supplied by the agency:
 *   Rate Sheet            2996-1-R   Rev. 2-2025
 *   Risk Assessment Chart 2996-1-BRC Rev. 1-2024
 *   Preferred Build Chart 2996-1-BBC Rev. 1-2024
 *
 * The risk chart is a four-column grid: for each condition it marks whether
 * Preferred, Standard, GDB and GI are available ("A") or not ("N/A"). The
 * columns are strictly nested -- anything Preferred allows, Standard allows,
 * and so on down -- so each row reduces to the best class still open, and that
 * is what the rules below encode:
 *
 *   all four A          -> allow, no restriction
 *   Preferred N/A       -> Standard is the best available class
 *   Standard N/A too    -> the Graded Death Benefit product
 *   GDB N/A as well     -> Guaranteed Issue only
 *
 * Nothing here is inferred beyond that reduction. A condition the chart does
 * not list produces no rule, and the engine reports it as unverified rather
 * than assuming the client is clean.
 */
import type { BenefitType, RuleResult } from '@/modules/engine/types';

export const RNA_CARRIER = {
  slug: 'royal-neighbors',
  name: 'Royal Neighbors of America',
  rateSheet: 'Ensured Legacy Final Expense Rate Sheet',
  rateSheetRef: '2996-1-R Rev. 2-2025',
  riskChart: 'Ensured Legacy Final Expense Risk Assessment Guide',
  riskChartRef: '2996-1-BRC Rev. 1-2024',
  buildChart: 'Ensured Legacy Final Expense Preferred Class Height/Weight Build Chart',
  buildChartRef: '2996-1-BBC Rev. 1-2024',
  effectiveDate: '2025-02-12',
  salesSupport: 'salessupport@royalneighbors.org',
};

/**
 * Face amounts are NOT printed on the rate sheet, the risk chart or the build
 * chart. The range below is this platform's own, not the carrier's, and must
 * be corrected from a Royal Neighbors product sheet before anyone relies on
 * the minimum or the maximum.
 */
export const RNA_FACE_UNKNOWN =
  'FACE AMOUNTS NOT STATED in the supplied rate sheet, risk chart or build chart. The minimum and maximum here are platform placeholders and must be confirmed with Royal Neighbors (salessupport@royalneighbors.org).';

export interface RnaProductSpec {
  slug: string;
  name: string;
  benefitType: BenefitType;
  minAge: number;
  maxAge: number;
  tobaccoClasses: Array<'non_tobacco' | 'tobacco' | 'unismoke'>;
  waitingPeriodMonths: number;
  simplicityScore: number;
  /** States the rate sheet names as unavailable for this product. */
  unavailableStates: string[];
  notes: string;
}

const WA_NOTE = 'Rate sheet: "Product not available in Washington State."';

export const RNA_PRODUCTS: RnaProductSpec[] = [
  {
    slug: 'ensured-legacy-siwl-preferred',
    name: 'Ensured Legacy — Simplified Issue Whole Life (Preferred)',
    benefitType: 'level',
    minAge: 50,
    maxAge: 75,
    tobaccoClasses: ['non_tobacco', 'tobacco'],
    waitingPeriodMonths: 0,
    simplicityScore: 5,
    unavailableStates: [],
    notes: `Simplified Issue Whole Life, form series 211311, written at the Preferred rate class. Full face value from day one. The rate sheet prints Preferred rates for issue ages 50-75 only and marks 76-85 "N/A". Preferred additionally requires the client to fall inside the height and weight build chart, which the chart itself describes as "a general guide, it is only one of the factors and is not a guarantee of qualifying". ${RNA_FACE_UNKNOWN}`,
  },
  {
    slug: 'ensured-legacy-siwl-standard',
    name: 'Ensured Legacy — Simplified Issue Whole Life (Standard)',
    benefitType: 'level',
    minAge: 50,
    maxAge: 85,
    tobaccoClasses: ['non_tobacco', 'tobacco'],
    waitingPeriodMonths: 0,
    simplicityScore: 5,
    unavailableStates: [],
    notes: `Simplified Issue Whole Life, form series 211311, written at the Standard rate class. Full face value from day one. Issue ages 50-85. ${RNA_FACE_UNKNOWN}`,
  },
  {
    slug: 'ensured-legacy-gdb',
    name: 'Ensured Legacy — Graded Death Benefit',
    benefitType: 'graded',
    minAge: 50,
    maxAge: 85,
    tobaccoClasses: ['non_tobacco', 'tobacco'],
    // The graded schedule itself is NOT in the supplied documents. 24 months is
    // this platform's conservative default and must be confirmed.
    waitingPeriodMonths: 24,
    simplicityScore: 4,
    unavailableStates: ['WA'],
    notes: `Graded Death Benefit, form series 211312. Issue ages 50-85. ${WA_NOTE} THE GRADED BENEFIT SCHEDULE IS NOT STATED in the supplied documents -- what the certificate pays in years one and two must be confirmed with Royal Neighbors before an agent quotes it to a client. The waiting period is recorded as 24 months pending that confirmation. ${RNA_FACE_UNKNOWN}`,
  },
  {
    slug: 'ensured-legacy-gi',
    name: 'Ensured Legacy — Guaranteed Issue',
    benefitType: 'guaranteed_issue',
    minAge: 50,
    maxAge: 80,
    // The GI rate table has no tobacco split.
    tobaccoClasses: ['unismoke'],
    waitingPeriodMonths: 24,
    simplicityScore: 5,
    unavailableStates: ['WA'],
    notes: `Guaranteed Issue, form series 221309. Issue ages 50-80; the rate sheet marks 81-85 "N/A". Rates do not vary by tobacco use. ${WA_NOTE} THE GRADED BENEFIT SCHEDULE IS NOT STATED in the supplied documents. The waiting period is recorded as 24 months pending confirmation. ${RNA_FACE_UNKNOWN}`,
  },
];

export interface RnaRule {
  conditionCode: string;
  ruleCategory: string;
  criteria: unknown;
  result: RuleResult;
  benefitClassification?: BenefitType;
  /** The condition exactly as the risk chart names it. */
  condition: string;
  /** The chart's four marks, in order: Preferred, Standard, GDB, GI. */
  marks: [string, string, string, string];
  priority: number;
}

function rule(
  conditionCode: string,
  ruleCategory: string,
  condition: string,
  marks: [string, string, string, string],
  criteria: unknown,
  priority = 200,
): RnaRule {
  const [pref, std, gdb] = marks;
  const result: RuleResult =
    pref === 'A' ? 'allow' : std === 'A' ? 'level' : gdb === 'A' ? 'graded' : 'guaranteed_issue';
  return {
    conditionCode,
    ruleCategory,
    criteria,
    result,
    benefitClassification:
      result === 'graded' ? 'graded' : result === 'guaranteed_issue' ? 'guaranteed_issue' : undefined,
    condition,
    marks,
    priority,
  };
}

/** Renders a rule's explanation from the chart's own marks. */
export function rnaExplanation(r: RnaRule): string {
  const [pref, std, gdb, gi] = r.marks;
  const grid = `Preferred ${pref}, Standard ${std}, GDB ${gdb}, GI ${gi}`;
  const outcome =
    r.result === 'allow'
      ? 'every rate class remains available'
      : r.result === 'level'
        ? 'Preferred is closed; Standard is the best class still available'
        : r.result === 'graded'
          ? 'both level classes are closed; the Graded Death Benefit product is the best still available'
          : 'only Guaranteed Issue remains available';
  return `${RNA_CARRIER.riskChart} (${RNA_CARRIER.riskChartRef}) marks "${r.condition}" as ${grid}, so ${outcome}. The chart states "A indicates Rate Class may be available" — it is not an approval, and the carrier makes the final underwriting decision.`;
}

/**
 * The risk chart, row by row. Marks are transcribed verbatim in Preferred,
 * Standard, GDB, GI order; the rule result is derived from them, never typed
 * in, so a transcription error cannot quietly become a wrong recommendation.
 *
 * Conditions whose wording depends on a time frame the health interview does
 * not ask about are recorded with the criteria the interview can answer, and
 * the chart's own wording is kept in `condition` for the reviewer.
 */
export const RNA_RULES: RnaRule[] = [
  rule('adl', 'activities_of_daily_living', "ADL's (activities of daily living) – Needs assistance with ADL's",
    ['N/A', 'N/A', 'N/A', 'A'], { all: [{ fact: 'adl.present', op: 'eq', value: true }] }, 400),
  rule('hiv', 'hiv', 'AIDS',
    ['N/A', 'N/A', 'N/A', 'A'], { all: [{ fact: 'hiv.present', op: 'eq', value: true }] }, 400),
  rule('substance_abuse_recent', 'substance_abuse', 'Alcohol Drug Treatment within last 3 years, no current use',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'substance_abuse.present', op: 'eq', value: true },
      { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'lt', value: 36 },
    ] }, 300),
  rule('substance_abuse_old', 'substance_abuse', 'Alcohol Drug Treatment >3 years ago, no current use',
    ['N/A', 'A', 'A', 'A'],
    { all: [
      { fact: 'substance_abuse.present', op: 'eq', value: true },
      { fact: 'substance_abuse.lastTreatmentMonthsAgo', op: 'gte', value: 36 },
    ] }),
  rule('als', 'neurological', "ALS – Lou Gehrig's Disease",
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'neurological.conditions', op: 'contains_any', value: ['als'] }] }, 400),
  rule('dementia', 'neurological', "Alzheimer's, Dementia or Memory Loss",
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'neurological.conditions', op: 'contains_any', value: ['dementia'] }] }, 400),
  rule('anxiety', 'mental_health', 'Anxiety', ['A', 'A', 'A', 'A'],
    { all: [{ fact: 'mental_health.present', op: 'eq', value: true }] }),
  rule('cancer_recurrent', 'cancer', 'Cancer more than one occurrence',
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'cancer.recurrence', op: 'eq', value: true }] }, 400),
  rule('cancer_recent', 'cancer', 'Cancer treatment completed in last 2 years',
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [
      { fact: 'cancer.present', op: 'eq', value: true },
      { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 24 },
    ] }, 400),
  rule('cancer_2_5', 'cancer', 'Cancer treatment completed 2–5 years ago',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'cancer.present', op: 'eq', value: true },
      { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte', value: 24 },
      { fact: 'cancer.lastTreatmentMonthsAgo', op: 'lt', value: 60 },
    ] }, 300),
  rule('cancer_over_5', 'cancer', 'Cancer treatment completed more than 5 years ago',
    ['N/A', 'A', 'A', 'A'],
    { all: [
      { fact: 'cancer.present', op: 'eq', value: true },
      { fact: 'cancer.lastTreatmentMonthsAgo', op: 'gte', value: 60 },
    ] }),
  rule('ckd_dialysis', 'kidney', 'Chronic Kidney Disease (CKD) on dialysis',
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'kidney.dialysis', op: 'eq', value: true }] }, 400),
  rule('cirrhosis', 'liver', 'Cirrhosis', ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'liver.conditions', op: 'contains_any', value: ['cirrhosis'] }] }, 400),
  rule('chf', 'cardiac', 'Congestive Heart Failure', ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'cardiac.events', op: 'contains_any', value: ['congestive_heart_failure'] }] }, 400),
  rule('copd', 'respiratory', 'COPD', ['N/A', 'A', 'A', 'A'],
    { all: [{ fact: 'respiratory.present', op: 'eq', value: true }] }),
  rule('hospitalized_now', 'confinement', 'Currently Hospitalized',
    ['N/A', 'N/A', 'N/A', 'A'], { all: [{ fact: 'confinement.present', op: 'eq', value: true }] }, 400),
  rule('pending_tests', 'pending_tests',
    'Currently undergoing (or been recommended to have) testing or further evaluation for a condition that has not been diagnosed',
    ['N/A', 'N/A', 'N/A', 'A'], { all: [{ fact: 'pending_tests.present', op: 'eq', value: true }] }, 400),
  rule('depression', 'mental_health', 'Depression', ['A', 'A', 'A', 'A'],
    { all: [{ fact: 'mental_health.present', op: 'eq', value: true }] }),
  rule('diabetes_no_insulin', 'diabetes', 'Diabetes no insulin', ['A', 'A', 'A', 'A'],
    { all: [
      { fact: 'diabetes.present', op: 'eq', value: true },
      { fact: 'diabetes.treatment', op: 'ne', value: 'insulin' },
    ] }),
  rule('diabetes_insulin', 'diabetes', 'Diabetes with Insulin – no complications',
    ['N/A', 'A', 'A', 'A'],
    { all: [
      { fact: 'diabetes.present', op: 'eq', value: true },
      { fact: 'diabetes.treatment', op: 'eq', value: 'insulin' },
      { fact: 'diabetes.complications', op: 'eq', value: false },
    ] }),
  rule('diabetes_complications', 'diabetes',
    'Diabetes with insulin along with kidney disease, neuropathy or other complication',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'diabetes.present', op: 'eq', value: true },
      { fact: 'diabetes.treatment', op: 'eq', value: 'insulin' },
      { fact: 'diabetes.complications', op: 'eq', value: true },
    ] }, 300),
  rule('heart_attack_recent', 'cardiac', 'Heart Attack in last 2 years',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'cardiac.events', op: 'contains_any', value: ['heart_attack'] },
      { fact: 'cardiac.lastEventMonthsAgo', op: 'lt', value: 24 },
    ] }, 300),
  rule('heart_attack_old', 'cardiac', 'Heart Attack more than 2 years ago',
    ['N/A', 'A', 'A', 'A'],
    { all: [
      { fact: 'cardiac.events', op: 'contains_any', value: ['heart_attack'] },
      { fact: 'cardiac.lastEventMonthsAgo', op: 'gte', value: 24 },
    ] }),
  rule('hypertension', 'cardiac', 'Hypertension', ['A', 'A', 'A', 'A'],
    { all: [{ fact: 'cardiac.events', op: 'contains_any', value: ['hypertension'] }] }),
  rule('hospice', 'confinement', 'In hospice, nursing home, long term or memory care',
    ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'confinement.present', op: 'eq', value: true }] }, 400),
  rule('transplant', 'transplant', 'Organ Transplant', ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'transplant.present', op: 'eq', value: true }] }, 400),
  rule('oxygen', 'respiratory', 'Oxygen – any use of oxygen', ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'respiratory.oxygenUse', op: 'eq', value: true }] }, 400),
  rule('stroke_old', 'neurological', 'Stroke or TIA >1 year ago', ['N/A', 'A', 'A', 'A'],
    { all: [
      { fact: 'neurological.conditions', op: 'contains_any', value: ['stroke'] },
      { fact: 'neurological.diagnosedMonthsAgo', op: 'gte', value: 12 },
    ] }),
  rule('stroke_recent', 'neurological', 'Stroke or TIA within last year',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'neurological.conditions', op: 'contains_any', value: ['stroke'] },
      { fact: 'neurological.diagnosedMonthsAgo', op: 'lt', value: 12 },
    ] }, 300),
  rule('terminal', 'confinement', 'Terminal Illness', ['N/A', 'N/A', 'N/A', 'A'],
    { all: [{ fact: 'confinement.type', op: 'eq', value: 'hospice' }] }, 400),
  rule('parkinsons', 'neurological', "Parkinson's", ['N/A', 'A', 'A', 'A'],
    { all: [{ fact: 'neurological.conditions', op: 'contains_any', value: ['parkinsons'] }] }),
  rule('ms', 'neurological', 'Multiple Sclerosis', ['N/A', 'A', 'A', 'A'],
    { all: [{ fact: 'neurological.conditions', op: 'contains_any', value: ['multiple_sclerosis'] }] }),
  rule('kidney_failure_old', 'kidney', 'Kidney failure diagnosed > 1 year ago',
    ['N/A', 'N/A', 'A', 'A'],
    { all: [
      { fact: 'kidney.present', op: 'eq', value: true },
      { fact: 'kidney.dialysis', op: 'eq', value: false },
    ] }, 300),
];

/**
 * Conditions the risk chart lists that this platform's health interview has no
 * question for, so no rule could be written. Recorded rather than dropped: an
 * administrator can see exactly what the chart covers that the engine does not,
 * and every one of these reaches the agent as "requires underwriting
 * verification" rather than as a clean pass.
 */
export const RNA_UNMAPPED = [
  'Aneurysm > 1 year ago',
  'Aneurysm within last year',
  'Amputation due to disease',
  'Arthritis',
  'Asthma',
  'Basal Cell Skin Cancer',
  'Bipolar diagnosed < 1 year ago',
  'Bipolar diagnosed >1 year ago',
  'Cardiomyopathy diagnosed >2 years ago',
  'Cardiomyopathy diagnosed in last 2 years',
  'Cholesterol Treatment',
  'Chronic Bronchitis',
  'Chronic Kidney Disease diagnosed <1 year',
  'Chronic Kidney Disease diagnosed >1 year ago',
  'Coronary Artery Disease diagnosed >2 years ago',
  'Coronary Artery Disease diagnosed in last 2 years',
  'Defibrillator',
  'Emphysema',
  'Heart Surgery diagnosed >2 years ago',
  'Heart Surgery diagnosed in last 2 years',
  'Hepatitis B and C',
  'HIV/AIDS virus only',
  'Hospitalized more than 2 weeks in last year',
  'Kidney failure diagnosed <1 year',
  'Pacemaker placed in last year',
  'Pacemaker placed more than 1 year ago',
  'Regular use of wheelchair or electric scooter',
  'Schizophrenia diagnosed <1 year ago',
  'Schizophrenia diagnosed >1 year ago',
  'Sickle Cell Anemia',
  'Systemic Lupus',
  'Wheelchair use temporary due to injury',
];

/**
 * Preferred Class Height/Weight Build Chart, 2996-1-BBC Rev. 1-2024.
 * [heightInches, maximumWeightPounds]. The chart's own caveat: "Qualification
 * for Preferred class considers overall mortality. The build chart is intended
 * as a general guide, it is only one of the factors and is not a guarantee of
 * qualifying."
 */
export const RNA_PREFERRED_BUILD_CHART: Array<[number, number]> = [
  [56, 175], [57, 181], [58, 194], [59, 194],
  [60, 200], [61, 207], [62, 214], [63, 221], [64, 228], [65, 235],
  [66, 243], [67, 250], [68, 258], [69, 265], [70, 273], [71, 281],
  [72, 289], [73, 297], [74, 305], [75, 314], [76, 322], [77, 330],
  [78, 339], [79, 348], [80, 357], [81, 366], [82, 375], [83, 384],
];
