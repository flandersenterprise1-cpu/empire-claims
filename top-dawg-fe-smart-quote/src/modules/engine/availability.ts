/**
 * Stage 1 of the pipeline: eliminate products that simply cannot be sold to
 * this client — inactive carrier/product, state, issue age, face amount,
 * increment, tobacco class. No underwriting judgement happens here.
 */
import type {
  ClientIntake,
  ExclusionReason,
  ProductBundle,
  ProductFaceLimitRecord,
  TobaccoClass,
} from './types';

export interface EffectiveLimits {
  minFaceAmount: number;
  maxFaceAmount: number;
  faceIncrement: number;
}

function withinDateWindow(asOf: string, start?: string | null, end?: string | null): boolean {
  if (start && asOf < start) return false;
  if (end && asOf > end) return false;
  return true;
}

/** Face-amount band that applies to this age/state, falling back to the product. */
export function effectiveLimits(
  bundle: ProductBundle,
  age: number,
  stateCode: string,
): EffectiveLimits {
  const { product, faceLimits } = bundle;
  const applicable: ProductFaceLimitRecord[] = faceLimits.filter(
    (limit) =>
      age >= limit.minAge &&
      age <= limit.maxAge &&
      (!limit.stateCode || limit.stateCode === stateCode),
  );

  if (applicable.length === 0) {
    return {
      minFaceAmount: product.minFaceAmount,
      maxFaceAmount: product.maxFaceAmount,
      faceIncrement: product.faceIncrement,
    };
  }

  // State-specific bands beat nationwide bands; otherwise take the tightest cap.
  const stateSpecific = applicable.filter((l) => l.stateCode === stateCode);
  const pool = stateSpecific.length > 0 ? stateSpecific : applicable;
  return {
    minFaceAmount: Math.max(...pool.map((l) => l.minFaceAmount)),
    maxFaceAmount: Math.min(...pool.map((l) => l.maxFaceAmount)),
    faceIncrement: product.faceIncrement,
  };
}

export function requiredTobaccoClass(
  intake: ClientIntake,
  supported: TobaccoClass[],
): TobaccoClass | null {
  if (supported.includes('unismoke')) return 'unismoke';
  const wanted: TobaccoClass = intake.tobaccoUse ? 'tobacco' : 'non_tobacco';
  return supported.includes(wanted) ? wanted : null;
}

export function checkAvailability(
  bundle: ProductBundle,
  intake: ClientIntake,
  asOf: string,
): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  const { carrier, product, states } = bundle;

  if (carrier.status !== 'active') {
    reasons.push({
      code: 'carrier_inactive',
      message: `${carrier.name} is not active in this system yet — verified carrier documentation has not been loaded.`,
    });
  }
  if (product.status !== 'active') {
    reasons.push({
      code: 'product_inactive',
      message: `${product.name} is inactive and cannot be quoted.`,
    });
  }

  const stateRow = states.find((s) => s.stateCode === intake.stateCode);
  if (!stateRow || !stateRow.isAvailable || !withinDateWindow(asOf, stateRow.effectiveDate, stateRow.endDate)) {
    reasons.push({
      code: 'state_unavailable',
      message: `${product.name} is not available in ${intake.stateCode}.`,
    });
  }

  if (intake.age < product.minAge || intake.age > product.maxAge) {
    reasons.push({
      code: 'age_out_of_range',
      message: `Issue ages for ${product.name} are ${product.minAge}–${product.maxAge}; client is ${intake.age}.`,
    });
  }

  const limits = effectiveLimits(bundle, intake.age, intake.stateCode);
  if (intake.faceAmount < limits.minFaceAmount) {
    reasons.push({
      code: 'face_below_minimum',
      message: `Minimum face amount at age ${intake.age} is $${limits.minFaceAmount.toLocaleString()}.`,
    });
  }
  if (intake.faceAmount > limits.maxFaceAmount) {
    reasons.push({
      code: 'face_above_maximum',
      message: `Maximum face amount at age ${intake.age} is $${limits.maxFaceAmount.toLocaleString()}.`,
    });
  }
  if (limits.faceIncrement > 0 && intake.faceAmount % limits.faceIncrement !== 0) {
    reasons.push({
      code: 'face_increment_mismatch',
      message: `${product.name} is issued in $${limits.faceIncrement.toLocaleString()} increments.`,
    });
  }

  if (requiredTobaccoClass(intake, product.tobaccoClasses) === null) {
    reasons.push({
      code: 'tobacco_class_unsupported',
      message: intake.tobaccoUse
        ? `${product.name} does not offer a tobacco rate class.`
        : `${product.name} does not offer a non-tobacco rate class.`,
    });
  }

  if (!product.sexClasses.includes(intake.sex) && !product.sexClasses.includes('unisex')) {
    reasons.push({
      code: 'sex_class_unsupported',
      message: `${product.name} does not publish rates for this rate class.`,
    });
  }

  return reasons;
}
