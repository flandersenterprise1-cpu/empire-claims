export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'IA', name: 'Iowa' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MD', name: 'Maryland' }, { code: 'ME', name: 'Maine' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MO', name: 'Missouri' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MT', name: 'Montana' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NV', name: 'Nevada' },
  { code: 'NY', name: 'New York' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VA', name: 'Virginia' },
  { code: 'VT', name: 'Vermont' }, { code: 'WA', name: 'Washington' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WY', name: 'Wyoming' },
] as const;

export const STATE_CODES = US_STATES.map((s) => s.code);

/** Product-agnostic guard rails. Individual products narrow these further. */
export const MIN_COVERAGE = 3000;
export const MAX_COVERAGE = 25000;
export const COVERAGE_STEP = 1000;

export const MIN_AGE = 18;
export const MAX_AGE = 99;

export const HEALTH_CATEGORIES = [
  'confinement',
  'activities_of_daily_living',
  'pending_tests',
  'cardiac',
  'cancer',
  'diabetes',
  'respiratory',
  'kidney',
  'liver',
  'neurological',
  'hiv',
  'transplant',
  'mental_health',
  'substance_abuse',
  'build',
  'medications',
] as const;

export const HEALTH_CATEGORY_LABELS: Record<string, string> = {
  confinement: 'Hospitalization, hospice & facility confinement',
  activities_of_daily_living: 'Activities of daily living',
  pending_tests: 'Pending tests, procedures & surgery',
  cardiac: 'Heart & circulatory',
  cancer: 'Cancer',
  diabetes: 'Diabetes',
  respiratory: 'Respiratory (COPD, emphysema, oxygen)',
  kidney: 'Kidney disease & dialysis',
  liver: 'Liver disease & hepatitis',
  neurological: 'Neurological & cognitive',
  hiv: 'HIV / AIDS',
  transplant: 'Organ transplant',
  mental_health: 'Mental health',
  substance_abuse: 'Substance use',
  build: 'Height & weight',
  medications: 'Prescription medications',
};

export const BENEFIT_TYPE_LABELS: Record<string, string> = {
  level: 'Level',
  graded: 'Graded',
  modified: 'Modified',
  guaranteed_issue: 'Guaranteed issue',
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Lower confidence',
  unknown: 'Needs verification',
};
