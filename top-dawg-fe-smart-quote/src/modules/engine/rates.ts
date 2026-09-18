/**
 * Rate engine.
 *
 * Premiums come from an exact, published rate-table row keyed by
 * carrier → product → state → age → sex → tobacco class → benefit type →
 * face amount → effective date.
 *
 * Interpolation and estimation are OFF unless the product is explicitly
 * flagged as using a verified per-$1,000 methodology. When no verified premium
 * exists the answer is "Rate unavailable" — never an invented price.
 */
import { requiredTobaccoClass } from './availability';
import type {
  ClientIntake,
  ProductBundle,
  RateEntryRecord,
  RateOutcome,
  RateTableRecord,
} from './types';

function withinWindow(asOf: string, start: string, end?: string | null): boolean {
  if (asOf < start) return false;
  if (end && asOf > end) return false;
  return true;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Published table for this product/state/benefit, most recently effective first. */
export function selectRateTable(
  bundle: ProductBundle,
  stateCode: string,
  asOf: string,
): RateTableRecord | null {
  const eligible = bundle.rateTables.filter(
    (table) =>
      table.status === 'published' &&
      table.benefitType === bundle.product.benefitType &&
      (table.stateCode == null || table.stateCode === stateCode) &&
      withinWindow(asOf, table.effectiveDate, table.endDate),
  );
  if (eligible.length === 0) return null;

  const stateSpecific = eligible.filter((t) => t.stateCode === stateCode);
  const pool = stateSpecific.length > 0 ? stateSpecific : eligible;
  return [...pool].sort(
    (a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.version - a.version,
  )[0];
}

/**
 * The age this product actually rates on. Returns null when the product needs
 * age nearest birthday and the intake only established age last birthday.
 */
export function ratedAge(ageBasis: string, intake: ClientIntake): number | null {
  if (ageBasis !== 'nearest_birthday') return intake.age;
  return intake.ageNearestBirthday ?? null;
}

function matchEntry(
  entries: RateEntryRecord[],
  age: number,
  sex: 'male' | 'female',
  tobacco: 'tobacco' | 'non_tobacco' | 'unismoke',
  faceAmount: number,
): RateEntryRecord | undefined {
  return entries.find(
    (entry) =>
      entry.age === age &&
      (entry.sex === sex || entry.sex === 'unisex') &&
      (entry.tobaccoClass === tobacco || entry.tobaccoClass === 'unismoke') &&
      entry.faceAmount === faceAmount,
  );
}

export function findRate(
  bundle: ProductBundle,
  intake: ClientIntake,
  asOf: string,
): RateOutcome {
  const table = selectRateTable(bundle, intake.stateCode, asOf);
  if (!table) {
    return {
      status: 'unavailable',
      reason: `No published rate table for ${bundle.product.name} in ${intake.stateCode} effective ${asOf}.`,
    };
  }

  const tobacco = requiredTobaccoClass(intake, bundle.product.tobaccoClasses);
  if (!tobacco) {
    return { status: 'unavailable', reason: 'No rate class matches this client.' };
  }

  // Rating on the wrong age basis silently mis-prices the case, so refuse.
  const ratingAge = ratedAge(bundle.product.ageBasis, intake);
  if (ratingAge == null) {
    return {
      status: 'unavailable',
      reason: `${bundle.product.name} rates on age nearest birthday. Enter the client's date of birth so the correct rating age can be worked out.`,
    };
  }

  // Transamerica's Solution series rounds the modal factor into the per-unit
  // rate BEFORE multiplying by units, then adds a flat monthly policy fee that
  // steps at a face-amount threshold. Reproduced exactly as the guide states it.
  if (table.rateBasis === 'annual_per_thousand_modal_first') {
    const row = table.entries.find(
      (entry) =>
        entry.age === ratingAge &&
        (entry.sex === intake.sex || entry.sex === 'unisex') &&
        (entry.tobaccoClass === tobacco || entry.tobaccoClass === 'unismoke') &&
        entry.ratePerThousand != null,
    );
    if (!row || table.monthlyModalFactor == null) {
      return {
        status: 'unavailable',
        reason: `No verified annual rate per $1,000 for age ${ratingAge}, ${intake.sex}, ${tobacco.replace('_', '-')} in rate table v${table.version}.`,
      };
    }
    const perUnitMonthly = round2(Number(row.ratePerThousand) * Number(table.monthlyModalFactor));
    const fee =
      table.policyFeeThreshold != null &&
      table.monthlyPolicyFeeBelowThreshold != null &&
      intake.faceAmount < table.policyFeeThreshold
        ? Number(table.monthlyPolicyFeeBelowThreshold)
        : Number(table.monthlyPolicyFee);
    return {
      status: 'found',
      monthlyPremium: round2(perUnitMonthly * (intake.faceAmount / 1000) + fee),
      rateTableId: table.id,
      rateTableVersion: table.version,
      effectiveDate: table.effectiveDate,
      monthlyPolicyFee: fee,
      isFictionalSample: table.isFictionalSample,
    };
  }

  // Carrier-published annual rate per $1,000. This is the carrier's own stated
  // formula, reproduced exactly — not an interpolation or an estimate:
  //   (annual rate per $1,000 × units + annual policy fee) × monthly modal factor
  if (table.rateBasis === 'annual_per_thousand') {
    const row = table.entries.find(
      (entry) =>
        entry.age === ratingAge &&
        (entry.sex === intake.sex || entry.sex === 'unisex') &&
        (entry.tobaccoClass === tobacco || entry.tobaccoClass === 'unismoke') &&
        entry.ratePerThousand != null,
    );
    if (!row || table.monthlyModalFactor == null) {
      return {
        status: 'unavailable',
        reason: `No verified annual rate per $1,000 for age ${ratingAge}, ${intake.sex}, ${tobacco.replace('_', '-')} in rate table v${table.version}.`,
      };
    }
    const units = intake.faceAmount / 1000;
    const annual = Number(row.ratePerThousand) * units + Number(table.annualPolicyFee);
    return {
      status: 'found',
      monthlyPremium: round2(annual * Number(table.monthlyModalFactor)),
      rateTableId: table.id,
      rateTableVersion: table.version,
      effectiveDate: table.effectiveDate,
      monthlyPolicyFee: round2(Number(table.annualPolicyFee) * Number(table.monthlyModalFactor)),
      isFictionalSample: table.isFictionalSample,
    };
  }

  const exact = matchEntry(table.entries, ratingAge, intake.sex, tobacco, intake.faceAmount);
  if (exact) {
    return {
      status: 'found',
      monthlyPremium: round2(Number(exact.monthlyPremium) + Number(table.monthlyPolicyFee)),
      rateTableId: table.id,
      rateTableVersion: table.version,
      effectiveDate: table.effectiveDate,
      monthlyPolicyFee: Number(table.monthlyPolicyFee),
      isFictionalSample: table.isFictionalSample,
    };
  }

  // Only a carrier-verified per-$1,000 methodology may be computed.
  if (bundle.product.rateMethodology === 'per_thousand' && bundle.product.allowInterpolation) {
    const perThousand = table.entries.find(
      (entry) =>
        entry.age === ratingAge &&
        (entry.sex === intake.sex || entry.sex === 'unisex') &&
        (entry.tobaccoClass === tobacco || entry.tobaccoClass === 'unismoke') &&
        entry.ratePerThousand != null,
    );
    if (perThousand?.ratePerThousand != null) {
      return {
        status: 'found',
        monthlyPremium: round2(
          (Number(perThousand.ratePerThousand) * intake.faceAmount) / 1000 +
            Number(table.monthlyPolicyFee),
        ),
        rateTableId: table.id,
        rateTableVersion: table.version,
        effectiveDate: table.effectiveDate,
        monthlyPolicyFee: Number(table.monthlyPolicyFee),
        isFictionalSample: table.isFictionalSample,
      };
    }
  }

  return {
    status: 'unavailable',
    reason: `No verified rate for age ${ratingAge}, ${intake.sex}, ${tobacco.replace('_', '-')}, $${intake.faceAmount.toLocaleString()} in rate table v${table.version}.`,
  };
}
