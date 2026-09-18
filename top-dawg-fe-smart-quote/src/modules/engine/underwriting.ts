/**
 * Stage 2 of the pipeline: classify a client against one product's verified
 * underwriting rules.
 *
 * Hard guarantees:
 *  - Only `verified` rules inside their effective window are ever applied.
 *  - Every outcome is traceable to the stored rule(s) that produced it.
 *  - Missing information, conflicting rules and matched-but-unverified rules
 *    all downgrade the product to "requires underwriting verification" rather
 *    than producing a guess.
 *  - Nothing here calls a language model.
 */
import { collectFactPaths, evaluateCriteria } from './criteria';
import type {
  BenefitType,
  FactSet,
  MedicationRuleRecord,
  ProductBundle,
  RuleLifecycle,
  RuleResult,
  RuleTrace,
  Tri,
  UnderwritingRuleRecord,
} from './types';

/** Lower is better for the client. Used to find the most restrictive outcome. */
export const BENEFIT_RESTRICTIVENESS: Record<BenefitType, number> = {
  level: 1,
  graded: 2,
  modified: 3,
  guaranteed_issue: 4,
};

const RESULT_TO_BENEFIT: Partial<Record<RuleResult, BenefitType>> = {
  level: 'level',
  graded: 'graded',
  modified: 'modified',
  guaranteed_issue: 'guaranteed_issue',
};

export type ClassificationStatus =
  | 'eligible'
  | 'declined'
  | 'requires_verification'
  | 'benefit_not_offered';

export interface VerificationReason {
  code:
    | 'missing_information'
    | 'conflicting_rules'
    | 'rule_requires_carrier_referral'
    | 'unverified_rule_matched'
    | 'expired_rule_matched'
    | 'carrier_not_verified'
    | 'no_verified_rules';
  message: string;
  ruleIds: number[];
}

export interface ClassificationOutcome {
  status: ClassificationStatus;
  /** Best benefit classification the verified rules permit for this client. */
  ceiling: BenefitType;
  /** Benefit the product actually issues. */
  offered: BenefitType;
  trace: RuleTrace[];
  verificationReasons: VerificationReason[];
  concerns: string[];
  /** Rule that drove the final outcome, if any. */
  driver: RuleTrace | null;
  appliedRuleCount: number;
}

function toTrace(rule: UnderwritingRuleRecord): RuleTrace {
  return {
    ruleId: rule.id,
    conditionCode: rule.conditionCode,
    ruleCategory: rule.ruleCategory,
    result: rule.result,
    explanation: rule.explanation,
    underwritingConcern: rule.underwritingConcern ?? null,
    sourceDocumentTitle: rule.sourceDocumentTitle ?? null,
    sourcePage: rule.sourcePage ?? null,
    effectiveDate: rule.effectiveDate,
    lastReviewedAt: rule.lastReviewedAt ?? null,
    ruleVersion: rule.ruleVersion,
    verificationStatus: rule.verificationStatus,
  };
}

function inScope(rule: UnderwritingRuleRecord, productId: number, stateCode: string): boolean {
  if (rule.productId != null && rule.productId !== productId) return false;
  if (rule.stateCode != null && rule.stateCode !== stateCode) return false;
  return true;
}

/** A rule counts as live only when verified AND inside its effective window. */
export function ruleLifecycleAt(rule: UnderwritingRuleRecord, asOf: string): RuleLifecycle {
  if (rule.verificationStatus !== 'verified') return rule.verificationStatus;
  if (rule.effectiveDate > asOf) return 'draft';
  if (rule.expirationDate && rule.expirationDate < asOf) return 'expired';
  return 'verified';
}

/** More specific rules win. Product scope beats state scope beats carrier-wide. */
function specificity(rule: UnderwritingRuleRecord): number {
  return (rule.productId != null ? 4 : 0) + (rule.stateCode != null ? 2 : 0) + (rule.criteria ? 1 : 0);
}

/**
 * Medication rules are normalised into pseudo underwriting rules so a single
 * evaluation path handles both. A medication that only implies a condition
 * (no direct result) contributes a fact instead — see `applyMedicationFacts`.
 */
function medicationAsRule(med: MedicationRuleRecord): UnderwritingRuleRecord {
  return {
    id: -med.id,
    carrierId: med.carrierId,
    productId: med.productId ?? null,
    stateCode: null,
    ruleCategory: 'medication',
    conditionCode: med.impliesConditionCode ?? `medication:${med.medicationName}`,
    treatment: med.medicationName,
    lookbackMonths: null,
    criteria: {
      all: [{ fact: 'medications.list', op: 'contains_any', value: [med.medicationName] }],
    },
    result: med.result,
    benefitClassification: med.benefitClassification ?? null,
    explanation: med.explanation,
    underwritingConcern: null,
    priority: 100,
    sourceDocumentTitle: med.sourceDocumentTitle ?? null,
    sourcePage: med.sourcePage ?? null,
    effectiveDate: med.effectiveDate,
    expirationDate: med.expirationDate ?? null,
    lastReviewedAt: null,
    ruleVersion: med.ruleVersion,
    verificationStatus: med.verificationStatus,
    isFictionalSample: med.isFictionalSample,
  };
}

export function classify(
  bundle: ProductBundle,
  facts: FactSet,
  stateCode: string,
  asOf: string,
): ClassificationOutcome {
  const { product, carrier } = bundle;
  const offered = product.benefitType;

  const candidates: UnderwritingRuleRecord[] = [
    ...bundle.rules,
    ...bundle.medicationRules.map(medicationAsRule),
  ].filter((rule) => inScope(rule, product.id, stateCode));

  const trace: RuleTrace[] = [];
  const verificationReasons: VerificationReason[] = [];
  const concerns: string[] = [];

  const matched: Array<{ rule: UnderwritingRuleRecord; tri: Tri }> = [];
  const indeterminate: UnderwritingRuleRecord[] = [];
  const unverifiedMatches: UnderwritingRuleRecord[] = [];
  const expiredMatches: UnderwritingRuleRecord[] = [];

  for (const rule of candidates) {
    const tri = evaluateCriteria(rule.criteria, facts);
    if (tri === 'false') continue;

    const lifecycle = ruleLifecycleAt(rule, asOf);
    if (lifecycle !== 'verified') {
      // Never apply it — but do not pretend it does not exist either.
      if (tri === 'true' && lifecycle !== 'archived') {
        if (lifecycle === 'expired') expiredMatches.push(rule);
        else unverifiedMatches.push(rule);
      }
      continue;
    }

    if (tri === 'true') matched.push({ rule, tri });
    else indeterminate.push(rule);
  }

  /* ---------------------------------------------------------------------- */
  /* Hard knockouts                                                          */
  /* ---------------------------------------------------------------------- */

  const declines = matched
    .filter((m) => m.rule.result === 'decline')
    .sort((a, b) => specificity(b.rule) - specificity(a.rule) || b.rule.priority - a.rule.priority);

  if (declines.length > 0) {
    const driver = toTrace(declines[0].rule);
    for (const d of declines) trace.push(toTrace(d.rule));
    if (declines[0].rule.underwritingConcern) concerns.push(declines[0].rule.underwritingConcern);
    return {
      status: 'declined',
      ceiling: 'guaranteed_issue',
      offered,
      trace,
      verificationReasons,
      concerns,
      driver,
      appliedRuleCount: matched.length,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Conflicts between equally-specific verified rules                       */
  /* ---------------------------------------------------------------------- */

  const conflictGroups = new Map<string, UnderwritingRuleRecord[]>();
  for (const { rule } of matched) {
    const key = `${rule.conditionCode}|${specificity(rule)}|${rule.priority}`;
    const list = conflictGroups.get(key) ?? [];
    list.push(rule);
    conflictGroups.set(key, list);
  }
  for (const [, group] of conflictGroups) {
    const distinct = new Set(group.map((r) => r.result));
    if (distinct.size > 1) {
      verificationReasons.push({
        code: 'conflicting_rules',
        message: `Rules for "${group[0].conditionCode}" disagree (${[...distinct].join(' vs ')}). The carrier must confirm the classification.`,
        ruleIds: group.map((r) => r.id),
      });
      for (const r of group) trace.push(toTrace(r));
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Benefit ceiling from matched rules                                      */
  /* ---------------------------------------------------------------------- */

  let ceiling: BenefitType = 'level';
  let driver: RuleTrace | null = null;

  for (const { rule } of matched) {
    const t = toTrace(rule);
    if (!trace.some((existing) => existing.ruleId === t.ruleId)) trace.push(t);
    if (rule.underwritingConcern) concerns.push(rule.underwritingConcern);

    if (rule.result === 'refer') {
      verificationReasons.push({
        code: 'rule_requires_carrier_referral',
        message: rule.explanation,
        ruleIds: [rule.id],
      });
      continue;
    }
    if (rule.result === 'allow') continue;

    const benefit = RESULT_TO_BENEFIT[rule.result] ?? rule.benefitClassification;
    if (!benefit) continue;
    if (BENEFIT_RESTRICTIVENESS[benefit] > BENEFIT_RESTRICTIVENESS[ceiling]) {
      ceiling = benefit;
      driver = t;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Insufficient information                                                */
  /* ---------------------------------------------------------------------- */

  for (const rule of indeterminate) {
    const benefit = RESULT_TO_BENEFIT[rule.result] ?? rule.benefitClassification;
    const couldChangeOutcome =
      rule.result === 'decline' ||
      rule.result === 'refer' ||
      (benefit != null && BENEFIT_RESTRICTIVENESS[benefit] > BENEFIT_RESTRICTIVENESS[ceiling]);
    if (!couldChangeOutcome) continue;

    const missing = [...new Set(collectFactPaths(rule.criteria))].filter(
      (path) => facts.unknownPaths.includes(path) || !(path in facts.values),
    );
    verificationReasons.push({
      code: 'missing_information',
      message: `A verified "${rule.conditionCode}" rule could change this result, but the interview did not establish: ${missing.join(', ') || rule.conditionCode}.`,
      ruleIds: [rule.id],
    });
    trace.push(toTrace(rule));
  }

  for (const rule of unverifiedMatches) {
    verificationReasons.push({
      code: 'unverified_rule_matched',
      message: `A ${rule.verificationStatus} rule for "${rule.conditionCode}" matches this client but has not been verified, so it was not applied.`,
      ruleIds: [rule.id],
    });
    trace.push(toTrace(rule));
  }
  for (const rule of expiredMatches) {
    verificationReasons.push({
      code: 'expired_rule_matched',
      message: `The "${rule.conditionCode}" rule expired on ${rule.expirationDate}. Re-verify it against current carrier documentation.`,
      ruleIds: [rule.id],
    });
    trace.push({ ...toTrace(rule), verificationStatus: 'expired' });
  }

  if (!carrier.isVerified) {
    verificationReasons.push({
      code: 'carrier_not_verified',
      message: `${carrier.name} has not been published as a verified carrier module.`,
      ruleIds: [],
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Final status                                                            */
  /* ---------------------------------------------------------------------- */

  // A reported condition with no verified rule anywhere in scope cannot be
  // classified. Silence is not permission.
  //
  // Guaranteed-issue products are the deliberate exception: they ask no health
  // questions, so an unmapped condition does not make them unquotable. Explicit
  // decline rules still apply to them.
  if (offered !== 'guaranteed_issue') {
    const coveredConditions = new Set(
      candidates
        .filter((rule) => ruleLifecycleAt(rule, asOf) === 'verified')
        .map((rule) => rule.conditionCode),
    );
    for (const condition of facts.reportedConditions) {
      if (!coveredConditions.has(condition)) {
        verificationReasons.push({
          code: 'no_verified_rules',
          message: `The client reported "${condition}" and ${carrier.name} has no verified rule covering it. Confirm the classification with the carrier before submitting.`,
          ruleIds: [],
        });
      }
    }
  }

  const hasConflict = verificationReasons.some((r) => r.code === 'conflicting_rules');

  let status: ClassificationStatus = 'eligible';
  if (BENEFIT_RESTRICTIVENESS[ceiling] > BENEFIT_RESTRICTIVENESS[offered] && !hasConflict) {
    // e.g. client classifies graded but this product only issues level benefits.
    // Missing information can only make the ceiling more restrictive, never
    // less, so this verdict is stable and outranks a verification downgrade.
    status = 'benefit_not_offered';
  } else if (verificationReasons.length > 0) {
    status = 'requires_verification';
  }

  return {
    status,
    ceiling,
    offered,
    trace,
    verificationReasons,
    concerns: [...new Set(concerns)],
    driver,
    appliedRuleCount: matched.length,
  };
}
