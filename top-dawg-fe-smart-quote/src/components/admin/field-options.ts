import { US_STATES } from '@/lib/constants';

export const STATE_OPTIONS = US_STATES.map((state) => ({
  value: state.code,
  label: `${state.code} — ${state.name}`,
}));

export const BENEFIT_TYPE_OPTIONS = [
  { value: 'level', label: 'Level' },
  { value: 'graded', label: 'Graded' },
  { value: 'modified', label: 'Modified' },
  { value: 'guaranteed_issue', label: 'Guaranteed issue' },
];

export const RESULT_OPTIONS = [
  { value: 'decline', label: 'Decline (hard knockout)' },
  { value: 'level', label: 'Classify level' },
  { value: 'graded', label: 'Classify graded' },
  { value: 'modified', label: 'Classify modified' },
  { value: 'guaranteed_issue', label: 'Classify guaranteed issue' },
  { value: 'refer', label: 'Refer to carrier (requires verification)' },
  { value: 'allow', label: 'Explicitly acceptable' },
];

export const LIFECYCLE_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'verified', label: 'Verified' },
  { value: 'expired', label: 'Expired' },
  { value: 'archived', label: 'Archived' },
];

export const CRITERIA_HELP =
  'Tri-state criteria tree. Operators: eq, ne, in, nin, lt, lte, gt, gte, exists, not_exists, contains_any, contains_none. ' +
  'Facts use the question fact paths, e.g. diabetes.treatment. Leave blank to match whenever the rule is in scope. ' +
  'A fact the interview never established makes the rule indeterminate, which returns "Requires underwriting verification".';
