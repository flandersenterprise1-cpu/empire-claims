/**
 * Super Quote orchestrator.
 *
 * Pipeline: availability filter → hard knockouts → classification → rate
 * lookup → categorisation → ranking. Pure and deterministic: the same inputs
 * always produce the same output, and no language model is consulted.
 */
import { checkAvailability, effectiveLimits } from './availability';
import { findRate } from './rates';
import {
  CATEGORY_LABELS,
  buildRankScore,
  categorise,
  isSubmittable,
  pickBackup,
  sortOptions,
} from './ranking';
import { classify } from './underwriting';
import type {
  ClientIntake,
  ExclusionReason,
  FactSet,
  ProductBundle,
  QuoteOption,
  SuperQuote,
} from './types';

export const ENGINE_VERSION = '1.0.0';

export const DISCLAIMER =
  'These results are a pre-qualification guide, not an offer of insurance. ' +
  'Approval, benefit classification and final premium are determined solely by the carrier ' +
  'after it reviews the full application, prescription history and any other underwriting data. ' +
  'Nothing here guarantees approval.';

export interface EngineInput {
  intake: ClientIntake;
  facts: FactSet;
  bundles: ProductBundle[];
  /** ISO date (YYYY-MM-DD) the quote is evaluated against. */
  asOf: string;
}

function buildRecommendation(
  option: Pick<QuoteOption, 'category' | 'carrierName' | 'productName' | 'benefitType' | 'waitingPeriodMonths'>,
  driverExplanation: string | null,
  verificationMessages: string[],
): string {
  switch (option.category) {
    case 'do_not_submit':
      return (
        driverExplanation ??
        `${option.productName} cannot issue the benefit classification this client falls into.`
      );
    case 'requires_verification':
      return (
        verificationMessages[0] ??
        'The stored rules do not fully resolve this client. Confirm the classification with the carrier before submitting.'
      );
    case 'guaranteed_issue_only':
      return (
        driverExplanation ??
        `${option.productName} is a guaranteed-issue plan with a ${option.waitingPeriodMonths}-month waiting period and no health questions.`
      );
    case 'likely_graded':
      return (
        driverExplanation ??
        `${option.productName} issues ${option.benefitType} benefits with a ${option.waitingPeriodMonths}-month waiting period.`
      );
    case 'possible_level':
      return (
        driverExplanation ??
        `No verified knockout applies, but at least one factor keeps this short of a clean level placement. Verify before promising a level benefit.`
      );
    case 'strong_level':
    default:
      return (
        driverExplanation ??
        `Nothing the client reported matched a verified underwriting restriction for ${option.productName}, and the case is inside every issue limit.`
      );
  }
}

export function runSuperQuote(input: EngineInput): SuperQuote {
  const { intake, facts, bundles, asOf } = input;
  const available: QuoteOption[] = [];
  const unavailable: QuoteOption[] = [];
  const notices: string[] = [];

  for (const bundle of bundles) {
    const exclusions: ExclusionReason[] = checkAvailability(bundle, intake, asOf);
    const limits = effectiveLimits(bundle, intake.age, intake.stateCode);

    const base = {
      carrierId: bundle.carrier.id,
      carrierName: bundle.carrier.name,
      carrierSlug: bundle.carrier.slug,
      productId: bundle.product.id,
      productName: bundle.product.name,
      productSlug: bundle.product.slug,
      benefitType: bundle.product.benefitType,
      waitingPeriodMonths: bundle.product.waitingPeriodMonths,
      faceAmount: intake.faceAmount,
      applicationUrl: bundle.product.eApplicationUrl ?? bundle.product.applicationUrl ?? null,
      isFictionalSample: bundle.carrier.isFictionalSample,
    };

    if (exclusions.length > 0) {
      unavailable.push({
        ...base,
        category: 'do_not_submit',
        categoryLabel: 'Not available for this client',
        confidence: 'unknown',
        monthlyPremium: null,
        rate: { status: 'unavailable', reason: 'Product filtered out before underwriting.' },
        recommendation: exclusions[0].message,
        underwritingConcerns: exclusions.map((e) => e.message),
        trace: [],
        exclusions,
        rankScore: [99],
      });
      continue;
    }

    const outcome = classify(bundle, facts, intake.stateCode, asOf);
    const rate = findRate(bundle, intake, asOf);
    const { category, confidence } = categorise(outcome, rate);

    const monthlyPremium =
      rate.status === 'found' && rate.monthlyPremium != null ? rate.monthlyPremium : null;

    const concerns = [...outcome.concerns];
    if (rate.status === 'unavailable' && rate.reason) {
      concerns.push(`Rate unavailable — ${rate.reason}`);
    }
    for (const reason of outcome.verificationReasons) concerns.push(reason.message);
    if (
      intake.monthlyBudget != null &&
      monthlyPremium != null &&
      monthlyPremium > intake.monthlyBudget
    ) {
      concerns.push(
        `Premium is $${monthlyPremium.toFixed(2)}/mo, above the client’s stated budget of $${Number(intake.monthlyBudget).toFixed(2)}/mo. A lower face amount may fit.`,
      );
    }
    if (limits.maxFaceAmount < bundle.product.maxFaceAmount) {
      concerns.push(
        `At age ${intake.age} this product caps at $${limits.maxFaceAmount.toLocaleString()}.`,
      );
    }

    const option: QuoteOption = {
      ...base,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      confidence,
      monthlyPremium,
      rate,
      recommendation: buildRecommendation(
        { ...base, category },
        outcome.driver?.explanation ?? null,
        outcome.verificationReasons.map((r) => r.message),
      ),
      underwritingConcerns: [...new Set(concerns)],
      trace: outcome.trace,
      exclusions: [],
      rankScore: buildRankScore({
        category,
        benefitType: bundle.product.benefitType,
        confidence,
        waitingPeriodMonths: bundle.product.waitingPeriodMonths,
        faceAmount: intake.faceAmount,
        monthlyPremium,
        simplicityScore: bundle.product.simplicityScore,
      }),
    };

    available.push(option);
  }

  const sorted = sortOptions(available);
  const best = sorted.find(isSubmittable) ?? null;
  const backup = pickBackup(sorted, best);

  if (sorted.length === 0) {
    notices.push(
      'No active product matched this client. Carriers stay inactive until verified documentation and rate tables are loaded in the admin area.',
    );
  }
  if (best && best.category === 'requires_verification') {
    notices.push(
      'Every available product needs underwriting verification. Call the carrier before setting the client’s expectations.',
    );
  }
  if (sorted.some((o) => o.rate.status === 'unavailable')) {
    notices.push(
      'Some products show “Rate unavailable”. A premium is only shown when it comes from an exact verified rate-table row.',
    );
  }

  const containsFictionalSampleData = [...sorted, ...unavailable].some((o) => o.isFictionalSample);
  if (containsFictionalSampleData) {
    notices.unshift(
      'This quote includes FICTIONAL sample carrier data used for demonstration and testing. It is not a real rate or a real underwriting decision.',
    );
  }

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    intake,
    options: sorted,
    unavailable: sortOptions(unavailable),
    best,
    backup,
    notices,
    containsFictionalSampleData,
    disclaimer: DISCLAIMER,
  };
}

export * from './types';
export { checkAvailability, effectiveLimits } from './availability';
export { evaluateCriteria, evaluateCriterion, collectFactPaths } from './criteria';
export { findRate, selectRateTable } from './rates';
export { classify, ruleLifecycleAt, BENEFIT_RESTRICTIVENESS } from './underwriting';
export {
  CATEGORY_LABELS,
  CATEGORY_RANK,
  buildRankScore,
  categorise,
  compareRankScores,
  pickBackup,
  sortOptions,
} from './ranking';
