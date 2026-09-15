/**
 * Stage 3: categorise and rank.
 *
 * Ranking priority, in order, exactly as specified:
 *   1. Underwriting eligibility
 *   2. Level-benefit availability
 *   3. Approval confidence
 *   4. Client value
 *   5. Monthly premium
 *   6. Application simplicity
 *
 * Agent compensation is not an input here and is not stored anywhere in the
 * system, so it cannot influence ordering.
 */
import type {
  ApprovalConfidence,
  BenefitType,
  QuoteOption,
  RateOutcome,
  ResultCategory,
} from './types';
import type { ClassificationOutcome } from './underwriting';

export const CATEGORY_LABELS: Record<ResultCategory, string> = {
  strong_level: 'Strong level-benefit match',
  possible_level: 'Possible level-benefit match',
  likely_graded: 'Likely graded',
  guaranteed_issue_only: 'Guaranteed issue only',
  do_not_submit: 'Do not submit — likely ineligible',
  requires_verification: 'Requires underwriting verification',
};

/** Ordering of result categories. Lower sorts first. */
export const CATEGORY_RANK: Record<ResultCategory, number> = {
  strong_level: 0,
  possible_level: 1,
  likely_graded: 2,
  guaranteed_issue_only: 3,
  requires_verification: 4,
  do_not_submit: 5,
};

const CONFIDENCE_RANK: Record<ApprovalConfidence, number> = {
  high: 0,
  moderate: 1,
  low: 2,
  unknown: 3,
};

export function categorise(
  outcome: ClassificationOutcome,
  rate: RateOutcome,
): { category: ResultCategory; confidence: ApprovalConfidence } {
  if (outcome.status === 'declined') {
    return { category: 'do_not_submit', confidence: 'unknown' };
  }
  if (outcome.status === 'benefit_not_offered') {
    return { category: 'do_not_submit', confidence: 'unknown' };
  }
  if (outcome.status === 'requires_verification') {
    return { category: 'requires_verification', confidence: 'unknown' };
  }

  const benefit = outcome.offered;
  if (benefit === 'guaranteed_issue') {
    return { category: 'guaranteed_issue_only', confidence: 'moderate' };
  }
  if (benefit === 'graded' || benefit === 'modified') {
    return { category: 'likely_graded', confidence: 'moderate' };
  }

  // Level product the client qualifies for. Confidence turns on whether the
  // engine had complete, exactly-priced, rule-backed information.
  const clean = outcome.ceiling === 'level';
  if (clean && rate.status === 'found') {
    return { category: 'strong_level', confidence: 'high' };
  }
  return { category: 'possible_level', confidence: 'moderate' };
}

/**
 * Client value: immediate full death benefit is worth more than a waiting
 * period, and — at equal benefit type — more coverage per dollar is better.
 * Lower is better so it slots straight into the sort tuple.
 */
export function clientValueScore(
  benefitType: BenefitType,
  waitingPeriodMonths: number,
  faceAmount: number,
  monthlyPremium: number | null,
): number {
  const benefitPenalty: Record<BenefitType, number> = {
    level: 0,
    graded: 200,
    modified: 300,
    guaranteed_issue: 400,
  };
  const waitPenalty = Math.min(waitingPeriodMonths, 36) * 2;
  const coveragePerDollar =
    monthlyPremium && monthlyPremium > 0 ? faceAmount / monthlyPremium : 0;
  // Higher coverage-per-dollar reduces the score; capped so it can never
  // outrank eligibility or benefit type.
  const valueCredit = Math.min(coveragePerDollar / 100, 100);
  return benefitPenalty[benefitType] + waitPenalty - valueCredit;
}

export function buildRankScore(option: {
  category: ResultCategory;
  benefitType: BenefitType;
  confidence: ApprovalConfidence;
  waitingPeriodMonths: number;
  faceAmount: number;
  monthlyPremium: number | null;
  simplicityScore: number;
}): number[] {
  return [
    // 1. Underwriting eligibility
    CATEGORY_RANK[option.category],
    // 2. Level-benefit availability
    option.benefitType === 'level' ? 0 : 1,
    // 3. Approval confidence
    CONFIDENCE_RANK[option.confidence],
    // 4. Client value
    Math.round(
      clientValueScore(
        option.benefitType,
        option.waitingPeriodMonths,
        option.faceAmount,
        option.monthlyPremium,
      ) * 100,
    ),
    // 5. Monthly premium (unpriced options sort last within their tier)
    option.monthlyPremium == null ? Number.MAX_SAFE_INTEGER : Math.round(option.monthlyPremium * 100),
    // 6. Application simplicity (5 = easiest)
    5 - option.simplicityScore,
  ];
}

export function compareRankScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function sortOptions(options: QuoteOption[]): QuoteOption[] {
  return [...options].sort(
    (a, b) =>
      compareRankScores(a.rankScore, b.rankScore) ||
      a.carrierName.localeCompare(b.carrierName) ||
      a.productName.localeCompare(b.productName),
  );
}

/** Submittable options only — the two categories below are never "the plan". */
export function isSubmittable(option: QuoteOption): boolean {
  return option.category !== 'do_not_submit';
}

/**
 * The backup is the best remaining submittable option, preferring a different
 * carrier so a declined case has somewhere else to go.
 */
export function pickBackup(sorted: QuoteOption[], best: QuoteOption | null): QuoteOption | null {
  if (!best) return null;
  const rest = sorted.filter((o) => o !== best && isSubmittable(o));
  return rest.find((o) => o.carrierId !== best.carrierId) ?? rest[0] ?? null;
}
