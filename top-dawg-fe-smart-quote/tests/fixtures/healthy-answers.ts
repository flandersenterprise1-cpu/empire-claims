/**
 * A client who answers "no" to every gate question in the health interview.
 * Shared by the integration tests so they exercise the same fact-extraction
 * path the real application uses.
 */
export const HEALTHY_ANSWERS: Record<string, unknown> = {
  confinement_present: false,
  adl_present: false,
  pending_tests_present: false,
  cardiac_present: false,
  cancer_present: false,
  diabetes_present: false,
  respiratory_present: false,
  kidney_present: false,
  liver_present: false,
  neurological_present: false,
  hiv_present: false,
  transplant_present: false,
  mental_health_present: false,
  substance_present: false,
  build_height_weight: { feet: 5, inches: 8, pounds: 170 },
  medications_present: false,
};
