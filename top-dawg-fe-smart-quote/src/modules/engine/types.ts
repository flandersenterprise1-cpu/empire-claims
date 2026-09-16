/**
 * Domain types shared by the questionnaire, rules engine, rate engine and
 * recommendation ranker. These are pure data structures: the engine never
 * touches the database or the network, which is what makes it deterministic
 * and cheap to test.
 */

export type BenefitType = 'level' | 'graded' | 'modified' | 'guaranteed_issue';
export type Sex = 'male' | 'female' | 'unisex';
export type ApplicantSex = 'male' | 'female';
export type TobaccoClass = 'tobacco' | 'non_tobacco' | 'unismoke';
export type RuleResult =
  | 'decline'
  | 'level'
  | 'graded'
  | 'modified'
  | 'guaranteed_issue'
  | 'refer'
  | 'allow';
export type RuleLifecycle = 'draft' | 'verified' | 'expired' | 'archived';
export type PublishStatus = 'draft' | 'published' | 'archived' | 'failed';
export type ActivationStatus = 'active' | 'inactive';

/** Tri-state logic value. `unknown` means the interview did not establish it. */
export type Tri = 'true' | 'false' | 'unknown';

/* -------------------------------------------------------------------------- */
/* Intake                                                                      */
/* -------------------------------------------------------------------------- */

export interface ClientIntake {
  stateCode: string;
  /** Age last birthday. */
  age: number;
  /**
   * Age nearest birthday, when it can be worked out from a date of birth.
   * Null when only an age was entered — products that rate on nearest age then
   * return "Rate unavailable" rather than quoting the wrong age.
   */
  ageNearestBirthday?: number | null;
  sex: ApplicantSex;
  tobaccoUse: boolean;
  faceAmount: number;
  monthlyBudget?: number | null;
}

/* -------------------------------------------------------------------------- */
/* Facts                                                                       */
/* -------------------------------------------------------------------------- */

export type FactPrimitive = string | number | boolean | null;
export type FactValue = FactPrimitive | FactPrimitive[];

/**
 * Canonical health facts extracted from interview answers.
 *
 * `values` is keyed by dotted path (e.g. `diabetes.treatment`).
 * `unknownPaths` lists paths that are relevant but unanswered — the engine
 * treats those as "insufficient information" rather than guessing.
 */
export interface FactSet {
  values: Record<string, FactValue>;
  unknownPaths: string[];
  /**
   * Paths the interview positively ruled out — the follow-ups behind a gate the
   * client answered "no". They are *known absent*, not unknown, so a rule that
   * asserts them is definitively false rather than indeterminate.
   */
  absentPaths: string[];
  /**
   * Condition codes the client actually reported (e.g. `diabetes`, `cancer`).
   * A carrier with no verified rule for a reported condition cannot classify
   * the client, so the engine returns "requires verification" instead of
   * assuming the condition is acceptable.
   */
  reportedConditions: string[];
}

/* -------------------------------------------------------------------------- */
/* Criteria DSL                                                                */
/* -------------------------------------------------------------------------- */

export type CriterionOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'nin'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'exists'
  | 'not_exists'
  | 'contains_any'
  | 'contains_none';

export interface Criterion {
  /** Dotted fact path, e.g. `cancer.treatmentStatus`. */
  fact: string;
  op: CriterionOperator;
  value?: FactValue;
}

export interface CriteriaGroup {
  all?: Array<Criterion | CriteriaGroup>;
  any?: Array<Criterion | CriteriaGroup>;
  none?: Array<Criterion | CriteriaGroup>;
}

export type Criteria = CriteriaGroup | null | undefined;

/* -------------------------------------------------------------------------- */
/* Catalog (what the engine is given to reason about)                          */
/* -------------------------------------------------------------------------- */

export interface CarrierRecord {
  id: number;
  slug: string;
  name: string;
  status: ActivationStatus;
  isVerified: boolean;
  isFictionalSample: boolean;
  agentPortalUrl?: string | null;
}

export interface ProductRecord {
  id: number;
  carrierId: number;
  slug: string;
  name: string;
  benefitType: BenefitType;
  status: ActivationStatus;
  minFaceAmount: number;
  maxFaceAmount: number;
  faceIncrement: number;
  /** 'last_birthday' | 'nearest_birthday' */
  ageBasis: string;
  minAge: number;
  maxAge: number;
  tobaccoClasses: TobaccoClass[];
  sexClasses: Sex[];
  waitingPeriodMonths: number;
  simplicityScore: number;
  rateMethodology: 'exact_only' | 'per_thousand';
  allowInterpolation: boolean;
  applicationUrl?: string | null;
  eApplicationUrl?: string | null;
}

export interface ProductStateRecord {
  productId: number;
  stateCode: string;
  isAvailable: boolean;
  effectiveDate?: string | null;
  endDate?: string | null;
}

export interface ProductFaceLimitRecord {
  productId: number;
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
  stateCode?: string | null;
}

export interface UnderwritingRuleRecord {
  id: number;
  carrierId: number;
  productId?: number | null;
  stateCode?: string | null;
  ruleCategory: string;
  conditionCode: string;
  treatment?: string | null;
  lookbackMonths?: number | null;
  criteria: Criteria;
  result: RuleResult;
  benefitClassification?: BenefitType | null;
  explanation: string;
  underwritingConcern?: string | null;
  priority: number;
  sourceDocumentTitle?: string | null;
  sourcePage?: string | null;
  effectiveDate: string;
  expirationDate?: string | null;
  lastReviewedAt?: string | null;
  ruleVersion: number;
  verificationStatus: RuleLifecycle;
  isFictionalSample: boolean;
}

export interface MedicationRuleRecord {
  id: number;
  carrierId: number;
  productId?: number | null;
  medicationName: string;
  impliesConditionCode?: string | null;
  result: RuleResult;
  benefitClassification?: BenefitType | null;
  explanation: string;
  sourcePage?: string | null;
  sourceDocumentTitle?: string | null;
  effectiveDate: string;
  expirationDate?: string | null;
  ruleVersion: number;
  verificationStatus: RuleLifecycle;
  isFictionalSample: boolean;
}

export interface RateEntryRecord {
  age: number;
  sex: Sex;
  tobaccoClass: TobaccoClass;
  faceAmount: number;
  monthlyPremium: number;
  ratePerThousand?: number | null;
}

export interface RateTableRecord {
  id: number;
  productId: number;
  stateCode?: string | null;
  benefitType: BenefitType;
  effectiveDate: string;
  endDate?: string | null;
  status: PublishStatus;
  version: number;
  monthlyPolicyFee: number;
  /** 'monthly_exact' | 'annual_per_thousand' */
  rateBasis: string;
  annualPolicyFee: number;
  monthlyModalFactor: number | null;
  policyFeeThreshold: number | null;
  monthlyPolicyFeeBelowThreshold: number | null;
  isFictionalSample: boolean;
  entries: RateEntryRecord[];
}

/** Everything the engine needs about one product, assembled by the repository. */
export interface ProductBundle {
  carrier: CarrierRecord;
  product: ProductRecord;
  states: ProductStateRecord[];
  faceLimits: ProductFaceLimitRecord[];
  rules: UnderwritingRuleRecord[];
  medicationRules: MedicationRuleRecord[];
  rateTables: RateTableRecord[];
}

/* -------------------------------------------------------------------------- */
/* Engine output                                                               */
/* -------------------------------------------------------------------------- */

export type ResultCategory =
  | 'strong_level'
  | 'possible_level'
  | 'likely_graded'
  | 'guaranteed_issue_only'
  | 'do_not_submit'
  | 'requires_verification';

export type ApprovalConfidence = 'high' | 'moderate' | 'low' | 'unknown';

export interface RuleTrace {
  ruleId: number;
  conditionCode: string;
  ruleCategory: string;
  result: RuleResult;
  explanation: string;
  underwritingConcern?: string | null;
  sourceDocumentTitle?: string | null;
  sourcePage?: string | null;
  effectiveDate: string;
  lastReviewedAt?: string | null;
  ruleVersion: number;
  verificationStatus: RuleLifecycle;
}

export interface ExclusionReason {
  code:
    | 'carrier_inactive'
    | 'product_inactive'
    | 'state_unavailable'
    | 'age_out_of_range'
    | 'face_below_minimum'
    | 'face_above_maximum'
    | 'face_increment_mismatch'
    | 'tobacco_class_unsupported'
    | 'sex_class_unsupported'
    | 'benefit_type_unavailable';
  message: string;
}

export interface RateOutcome {
  status: 'found' | 'unavailable';
  monthlyPremium?: number;
  rateTableId?: number;
  rateTableVersion?: number;
  effectiveDate?: string;
  monthlyPolicyFee?: number;
  isFictionalSample?: boolean;
  reason?: string;
}

export interface QuoteOption {
  carrierId: number;
  carrierName: string;
  carrierSlug: string;
  productId: number;
  productName: string;
  productSlug: string;
  benefitType: BenefitType;
  waitingPeriodMonths: number;
  faceAmount: number;
  category: ResultCategory;
  categoryLabel: string;
  confidence: ApprovalConfidence;
  monthlyPremium: number | null;
  rate: RateOutcome;
  /** Agent-facing sentences, each traceable to a verified rule or a limit. */
  recommendation: string;
  underwritingConcerns: string[];
  applicationUrl?: string | null;
  isFictionalSample: boolean;
  /** Every rule that influenced this result. */
  trace: RuleTrace[];
  /** Why the option was filtered out, when it was. */
  exclusions: ExclusionReason[];
  /** Internal ordering key, exposed for tests and debugging. */
  rankScore: number[];
}

export interface SuperQuote {
  engineVersion: string;
  generatedAt: string;
  intake: ClientIntake;
  /** Ranked, agent-visible options. */
  options: QuoteOption[];
  /** Products filtered out before underwriting (state/age/face/etc.). */
  unavailable: QuoteOption[];
  best: QuoteOption | null;
  backup: QuoteOption | null;
  /** Global notes, e.g. "no verified carriers are active yet". */
  notices: string[];
  containsFictionalSampleData: boolean;
  disclaimer: string;
}
