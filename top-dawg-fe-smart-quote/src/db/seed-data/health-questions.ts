/**
 * The universal health interview.
 *
 * Every entry is seed data for the `health_questions` table — administrators
 * can edit, reorder, deactivate or extend all of it from the admin area. Gate
 * questions are always shown; follow-ups appear only when `showWhen` is
 * satisfied, so a healthy client answers roughly sixteen questions and stops.
 */
export interface SeedQuestion {
  code: string;
  category: string;
  prompt: string;
  helpText?: string;
  answerType:
    | 'boolean'
    | 'single_select'
    | 'multi_select'
    | 'integer'
    | 'decimal'
    | 'months_ago'
    | 'text'
    | 'height_weight'
    | 'medication_list';
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  sortOrder: number;
  parentCode?: string;
  showWhen?: unknown;
  factPath: string;
}

const yesGate = (code: string) => ({ all: [{ fact: code, op: 'eq', value: true }] });

export const SEED_QUESTIONS: SeedQuestion[] = [
  /* --------------------------- Confinement ------------------------------ */
  {
    code: 'confinement_present',
    category: 'confinement',
    prompt:
      'Is the client currently hospitalized, in a nursing home or assisted-living facility, receiving hospice care, or confined to a bed or wheelchair?',
    answerType: 'boolean',
    sortOrder: 10,
    factPath: 'confinement.present',
  },
  {
    code: 'confinement_type',
    category: 'confinement',
    prompt: 'Which best describes the current setting?',
    answerType: 'single_select',
    options: [
      { value: 'hospital', label: 'Hospital' },
      { value: 'nursing_home', label: 'Nursing home / skilled nursing' },
      { value: 'assisted_living', label: 'Assisted living' },
      { value: 'hospice', label: 'Hospice or terminal care' },
      { value: 'home_confined', label: 'Confined at home (bed or wheelchair)' },
    ],
    sortOrder: 11,
    parentCode: 'confinement_present',
    showWhen: yesGate('confinement_present'),
    factPath: 'confinement.type',
  },

  /* ------------------------------- ADLs --------------------------------- */
  {
    code: 'adl_present',
    category: 'activities_of_daily_living',
    prompt:
      'Does the client need help from another person with bathing, dressing, eating, toileting, moving between bed and chair, or continence?',
    answerType: 'boolean',
    sortOrder: 20,
    factPath: 'adl.present',
  },
  {
    code: 'adl_activities',
    category: 'activities_of_daily_living',
    prompt: 'Which activities need assistance?',
    answerType: 'multi_select',
    options: [
      { value: 'bathing', label: 'Bathing' },
      { value: 'dressing', label: 'Dressing' },
      { value: 'eating', label: 'Eating' },
      { value: 'toileting', label: 'Toileting' },
      { value: 'transferring', label: 'Transferring' },
      { value: 'continence', label: 'Continence' },
    ],
    sortOrder: 21,
    parentCode: 'adl_present',
    showWhen: yesGate('adl_present'),
    factPath: 'adl.activities',
  },

  /* -------------------------- Pending tests ----------------------------- */
  {
    code: 'pending_tests_present',
    category: 'pending_tests',
    prompt:
      'Has a doctor recommended any test, biopsy, procedure or surgery that has not yet been completed, or is the client waiting on results?',
    answerType: 'boolean',
    sortOrder: 30,
    factPath: 'pending_tests.present',
  },
  {
    code: 'pending_tests_detail',
    category: 'pending_tests',
    prompt: 'What is pending?',
    helpText: 'Describe the test or procedure only — no names or identifying details.',
    answerType: 'text',
    sortOrder: 31,
    parentCode: 'pending_tests_present',
    showWhen: yesGate('pending_tests_present'),
    factPath: 'pending_tests.description',
  },

  /* ------------------------------ Cardiac ------------------------------- */
  {
    code: 'cardiac_present',
    category: 'cardiac',
    prompt:
      'Has the client ever had a heart attack, stroke, TIA, congestive heart failure, bypass surgery, a stent, angioplasty, a pacemaker or a defibrillator?',
    answerType: 'boolean',
    sortOrder: 40,
    factPath: 'cardiac.present',
  },
  {
    code: 'cardiac_events',
    category: 'cardiac',
    prompt: 'Which apply?',
    answerType: 'multi_select',
    options: [
      { value: 'heart_attack', label: 'Heart attack' },
      { value: 'stroke', label: 'Stroke' },
      { value: 'tia', label: 'TIA / mini-stroke' },
      { value: 'chf', label: 'Congestive heart failure' },
      { value: 'bypass', label: 'Bypass surgery' },
      { value: 'stent', label: 'Stent' },
      { value: 'angioplasty', label: 'Angioplasty' },
      { value: 'pacemaker', label: 'Pacemaker' },
      { value: 'defibrillator', label: 'Implanted defibrillator' },
      { value: 'aneurysm', label: 'Aneurysm' },
      { value: 'atrial_fibrillation', label: 'Atrial fibrillation' },
    ],
    sortOrder: 41,
    parentCode: 'cardiac_present',
    showWhen: yesGate('cardiac_present'),
    factPath: 'cardiac.events',
  },
  {
    code: 'cardiac_last_event_months',
    category: 'cardiac',
    prompt: 'How many months ago was the most recent event or procedure?',
    answerType: 'months_ago',
    sortOrder: 42,
    parentCode: 'cardiac_present',
    showWhen: yesGate('cardiac_present'),
    factPath: 'cardiac.lastEventMonthsAgo',
  },
  {
    code: 'cardiac_multiple_events',
    category: 'cardiac',
    prompt: 'Has the client had more than one of these events?',
    answerType: 'boolean',
    sortOrder: 43,
    parentCode: 'cardiac_present',
    showWhen: yesGate('cardiac_present'),
    factPath: 'cardiac.multipleEvents',
  },

  /* ------------------------------- Cancer -------------------------------- */
  {
    code: 'cancer_present',
    category: 'cancer',
    prompt: 'Has the client ever been diagnosed with cancer?',
    helpText: 'Include basal cell and squamous cell skin cancer.',
    answerType: 'boolean',
    sortOrder: 50,
    factPath: 'cancer.present',
  },
  {
    code: 'cancer_type',
    category: 'cancer',
    prompt: 'What type of cancer?',
    answerType: 'single_select',
    options: [
      { value: 'basal_squamous_skin', label: 'Basal cell / squamous cell skin cancer' },
      { value: 'breast', label: 'Breast' },
      { value: 'prostate', label: 'Prostate' },
      { value: 'colon', label: 'Colon / colorectal' },
      { value: 'lung', label: 'Lung' },
      { value: 'melanoma', label: 'Melanoma' },
      { value: 'leukemia_lymphoma', label: 'Leukemia / lymphoma' },
      { value: 'pancreatic', label: 'Pancreatic' },
      { value: 'liver', label: 'Liver' },
      { value: 'brain', label: 'Brain' },
      { value: 'other', label: 'Other' },
    ],
    sortOrder: 51,
    parentCode: 'cancer_present',
    showWhen: yesGate('cancer_present'),
    factPath: 'cancer.type',
  },
  {
    code: 'cancer_treatment_status',
    category: 'cancer',
    prompt: 'What is the current treatment status?',
    answerType: 'single_select',
    options: [
      { value: 'in_treatment', label: 'Currently in treatment' },
      { value: 'treatment_planned', label: 'Treatment recommended but not started' },
      { value: 'completed', label: 'Treatment completed' },
      { value: 'refused_treatment', label: 'Treatment was declined or refused' },
      { value: 'palliative', label: 'Palliative / comfort care only' },
    ],
    sortOrder: 52,
    parentCode: 'cancer_present',
    showWhen: yesGate('cancer_present'),
    factPath: 'cancer.treatmentStatus',
  },
  {
    code: 'cancer_diagnosed_months',
    category: 'cancer',
    prompt: 'How many months ago was the diagnosis?',
    answerType: 'months_ago',
    sortOrder: 53,
    parentCode: 'cancer_present',
    showWhen: yesGate('cancer_present'),
    factPath: 'cancer.diagnosedMonthsAgo',
  },
  {
    code: 'cancer_last_treatment_months',
    category: 'cancer',
    prompt: 'How many months ago did treatment end?',
    answerType: 'months_ago',
    sortOrder: 54,
    parentCode: 'cancer_present',
    showWhen: {
      all: [
        { fact: 'cancer_present', op: 'eq', value: true },
        { fact: 'cancer_treatment_status', op: 'eq', value: 'completed' },
      ],
    },
    factPath: 'cancer.lastTreatmentMonthsAgo',
  },
  {
    code: 'cancer_recurrence',
    category: 'cancer',
    prompt: 'Has the cancer ever recurred or spread?',
    answerType: 'boolean',
    sortOrder: 55,
    parentCode: 'cancer_present',
    showWhen: yesGate('cancer_present'),
    factPath: 'cancer.recurrence',
  },

  /* ------------------------------ Diabetes ------------------------------- */
  {
    code: 'diabetes_present',
    category: 'diabetes',
    prompt: 'Has the client been diagnosed with diabetes?',
    answerType: 'boolean',
    sortOrder: 60,
    factPath: 'diabetes.present',
  },
  {
    code: 'diabetes_treatment',
    category: 'diabetes',
    prompt: 'How is the diabetes treated?',
    answerType: 'single_select',
    options: [
      { value: 'diet', label: 'Diet and exercise only' },
      { value: 'pills', label: 'Oral medication' },
      { value: 'insulin', label: 'Insulin' },
      { value: 'pills_and_insulin', label: 'Oral medication and insulin' },
    ],
    sortOrder: 61,
    parentCode: 'diabetes_present',
    showWhen: yesGate('diabetes_present'),
    factPath: 'diabetes.treatment',
  },
  {
    code: 'diabetes_diagnosis_age',
    category: 'diabetes',
    prompt: 'At what age was the client diagnosed?',
    answerType: 'integer',
    sortOrder: 62,
    parentCode: 'diabetes_present',
    showWhen: yesGate('diabetes_present'),
    factPath: 'diabetes.diagnosisAge',
  },
  {
    code: 'diabetes_insulin_start_months',
    category: 'diabetes',
    prompt: 'How many months ago did insulin start?',
    answerType: 'months_ago',
    sortOrder: 63,
    parentCode: 'diabetes_treatment',
    showWhen: {
      all: [{ fact: 'diabetes_treatment', op: 'in', value: ['insulin', 'pills_and_insulin'] }],
    },
    factPath: 'diabetes.insulinStartMonthsAgo',
  },
  {
    code: 'diabetes_insulin_start_age',
    category: 'diabetes',
    prompt: 'At what age did insulin start?',
    answerType: 'integer',
    sortOrder: 64,
    parentCode: 'diabetes_treatment',
    showWhen: {
      all: [{ fact: 'diabetes_treatment', op: 'in', value: ['insulin', 'pills_and_insulin'] }],
    },
    factPath: 'diabetes.insulinStartAge',
  },
  {
    code: 'diabetes_complications',
    category: 'diabetes',
    prompt: 'Any diabetic complications?',
    answerType: 'multi_select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'neuropathy', label: 'Neuropathy' },
      { value: 'retinopathy', label: 'Eye disease / retinopathy' },
      { value: 'nephropathy', label: 'Kidney disease / nephropathy' },
      { value: 'amputation', label: 'Amputation' },
      { value: 'diabetic_coma', label: 'Diabetic coma' },
      { value: 'insulin_shock', label: 'Insulin shock' },
    ],
    sortOrder: 65,
    parentCode: 'diabetes_present',
    showWhen: yesGate('diabetes_present'),
    factPath: 'diabetes.complications',
  },

  /* ----------------------------- Respiratory ----------------------------- */
  {
    code: 'respiratory_present',
    category: 'respiratory',
    prompt:
      'Has the client been diagnosed with COPD, emphysema, chronic bronchitis or pulmonary fibrosis?',
    answerType: 'boolean',
    sortOrder: 70,
    factPath: 'respiratory.present',
  },
  {
    code: 'respiratory_oxygen',
    category: 'respiratory',
    prompt: 'Does the client use oxygen for this condition?',
    answerType: 'boolean',
    sortOrder: 71,
    parentCode: 'respiratory_present',
    showWhen: yesGate('respiratory_present'),
    factPath: 'respiratory.oxygenUse',
  },
  {
    code: 'respiratory_hospitalized_months',
    category: 'respiratory',
    prompt: 'How many months ago was the last hospitalization for breathing problems?',
    helpText: 'Enter 999 if the client has never been hospitalized for this.',
    answerType: 'months_ago',
    sortOrder: 72,
    parentCode: 'respiratory_present',
    showWhen: yesGate('respiratory_present'),
    factPath: 'respiratory.lastHospitalizationMonthsAgo',
  },

  /* ------------------------------- Kidney -------------------------------- */
  {
    code: 'kidney_present',
    category: 'kidney',
    prompt: 'Has the client been diagnosed with kidney disease or kidney failure?',
    answerType: 'boolean',
    sortOrder: 80,
    factPath: 'kidney.present',
  },
  {
    code: 'kidney_dialysis',
    category: 'kidney',
    prompt: 'Is the client on dialysis, or has dialysis been recommended?',
    answerType: 'boolean',
    sortOrder: 81,
    parentCode: 'kidney_present',
    showWhen: yesGate('kidney_present'),
    factPath: 'kidney.dialysis',
  },
  {
    code: 'kidney_stage',
    category: 'kidney',
    prompt: 'What stage is the kidney disease?',
    answerType: 'single_select',
    options: [
      { value: 'stage_1_2', label: 'Stage 1 or 2' },
      { value: 'stage_3', label: 'Stage 3' },
      { value: 'stage_4', label: 'Stage 4' },
      { value: 'stage_5', label: 'Stage 5 / end stage' },
      { value: 'unknown', label: 'Not known' },
    ],
    sortOrder: 82,
    parentCode: 'kidney_present',
    showWhen: yesGate('kidney_present'),
    factPath: 'kidney.stage',
  },

  /* -------------------------------- Liver -------------------------------- */
  {
    code: 'liver_present',
    category: 'liver',
    prompt:
      'Has the client been diagnosed with cirrhosis, hepatitis, fatty liver disease or any other liver disorder?',
    answerType: 'boolean',
    sortOrder: 90,
    factPath: 'liver.present',
  },
  {
    code: 'liver_conditions',
    category: 'liver',
    prompt: 'Which apply?',
    answerType: 'multi_select',
    options: [
      { value: 'cirrhosis', label: 'Cirrhosis' },
      { value: 'hepatitis_a', label: 'Hepatitis A' },
      { value: 'hepatitis_b', label: 'Hepatitis B' },
      { value: 'hepatitis_c', label: 'Hepatitis C' },
      { value: 'fatty_liver', label: 'Fatty liver disease' },
      { value: 'liver_failure', label: 'Liver failure' },
      { value: 'other', label: 'Other liver disorder' },
    ],
    sortOrder: 91,
    parentCode: 'liver_present',
    showWhen: yesGate('liver_present'),
    factPath: 'liver.conditions',
  },

  /* ---------------------------- Neurological ----------------------------- */
  {
    code: 'neurological_present',
    category: 'neurological',
    prompt:
      'Has the client been diagnosed with dementia, Alzheimer’s, Parkinson’s, ALS, MS, Huntington’s, seizures or significant memory loss?',
    answerType: 'boolean',
    sortOrder: 100,
    factPath: 'neurological.present',
  },
  {
    code: 'neurological_conditions',
    category: 'neurological',
    prompt: 'Which apply?',
    answerType: 'multi_select',
    options: [
      { value: 'alzheimers', label: 'Alzheimer’s' },
      { value: 'dementia', label: 'Dementia' },
      { value: 'parkinsons', label: 'Parkinson’s' },
      { value: 'als', label: 'ALS' },
      { value: 'ms', label: 'Multiple sclerosis' },
      { value: 'huntingtons', label: 'Huntington’s' },
      { value: 'seizures', label: 'Seizure disorder / epilepsy' },
      { value: 'memory_loss', label: 'Memory loss or cognitive impairment' },
    ],
    sortOrder: 101,
    parentCode: 'neurological_present',
    showWhen: yesGate('neurological_present'),
    factPath: 'neurological.conditions',
  },
  {
    code: 'neurological_diagnosed_months',
    category: 'neurological',
    prompt: 'How many months ago was the diagnosis?',
    answerType: 'months_ago',
    sortOrder: 102,
    parentCode: 'neurological_present',
    showWhen: yesGate('neurological_present'),
    factPath: 'neurological.diagnosedMonthsAgo',
  },

  /* --------------------------------- HIV --------------------------------- */
  {
    code: 'hiv_present',
    category: 'hiv',
    prompt: 'Has the client been diagnosed with HIV or AIDS?',
    answerType: 'boolean',
    sortOrder: 110,
    factPath: 'hiv.present',
  },

  /* ------------------------------ Transplant ----------------------------- */
  {
    code: 'transplant_present',
    category: 'transplant',
    prompt: 'Has the client had an organ or bone-marrow transplant, or been placed on a transplant list?',
    answerType: 'boolean',
    sortOrder: 120,
    factPath: 'transplant.present',
  },
  {
    code: 'transplant_status',
    category: 'transplant',
    prompt: 'What is the current status?',
    answerType: 'single_select',
    options: [
      { value: 'completed', label: 'Transplant completed' },
      { value: 'pending', label: 'Transplant scheduled' },
      { value: 'on_list', label: 'On a transplant waiting list' },
    ],
    sortOrder: 121,
    parentCode: 'transplant_present',
    showWhen: yesGate('transplant_present'),
    factPath: 'transplant.status',
  },
  {
    code: 'transplant_months',
    category: 'transplant',
    prompt: 'How many months ago was the transplant?',
    answerType: 'months_ago',
    isRequired: false,
    sortOrder: 122,
    parentCode: 'transplant_status',
    showWhen: { all: [{ fact: 'transplant_status', op: 'eq', value: 'completed' }] },
    factPath: 'transplant.monthsAgo',
  },

  /* ---------------------------- Mental health ---------------------------- */
  {
    code: 'mental_health_present',
    category: 'mental_health',
    prompt:
      'Has the client been hospitalized for a mental-health condition, or attempted suicide, in the last ten years?',
    answerType: 'boolean',
    sortOrder: 130,
    factPath: 'mental_health.present',
  },
  {
    code: 'mental_health_months',
    category: 'mental_health',
    prompt: 'How many months ago was the most recent hospitalization or attempt?',
    answerType: 'months_ago',
    sortOrder: 131,
    parentCode: 'mental_health_present',
    showWhen: yesGate('mental_health_present'),
    factPath: 'mental_health.lastEventMonthsAgo',
  },

  /* --------------------------- Substance use ----------------------------- */
  {
    code: 'substance_present',
    category: 'substance_abuse',
    prompt:
      'Has the client received treatment or counselling for alcohol or drug use in the last ten years?',
    answerType: 'boolean',
    sortOrder: 140,
    factPath: 'substance_abuse.present',
  },
  {
    code: 'substance_last_treatment_months',
    category: 'substance_abuse',
    prompt: 'How many months ago was the most recent treatment?',
    answerType: 'months_ago',
    sortOrder: 141,
    parentCode: 'substance_present',
    showWhen: yesGate('substance_present'),
    factPath: 'substance_abuse.lastTreatmentMonthsAgo',
  },

  /* ------------------------------- Build --------------------------------- */
  {
    code: 'build_height_weight',
    category: 'build',
    prompt: 'Height and weight',
    answerType: 'height_weight',
    sortOrder: 150,
    factPath: 'build.value',
  },

  /* ---------------------------- Medications ------------------------------ */
  {
    code: 'medications_present',
    category: 'medications',
    prompt: 'Does the client take any prescription medications?',
    answerType: 'boolean',
    sortOrder: 160,
    factPath: 'medications.present',
  },
  {
    code: 'medications_list',
    category: 'medications',
    prompt: 'List the current prescription medications.',
    helpText: 'One per line. Medication names only — no pharmacy or personal details.',
    answerType: 'medication_list',
    sortOrder: 161,
    parentCode: 'medications_present',
    showWhen: yesGate('medications_present'),
    factPath: 'medications.list',
  },
];
