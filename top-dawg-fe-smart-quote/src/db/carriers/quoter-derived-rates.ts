/**
 * Rates recovered from carrier quoters, for carriers that publish no rate book.
 *
 * Aflac and Mutual of Omaha print no final-expense rate tables. Both publish
 * the two pieces that turn a quoted premium back into a rate -- the policy fee
 * and the modal factors -- and both were confirmed against live quoter output
 * at two different face amounts, which is what pins the fee and proves the
 * premium is linear in the face amount:
 *
 *   annual  = rate per $1,000 x units + annual fee
 *   monthly = annual x modal factor
 *
 * Solving the carrier's own published formula against the carrier's own quoted
 * price is arithmetic, not estimation. What it is NOT is a way to reach a cell
 * nobody quoted: each capture below covers exactly one age, sex and tobacco
 * class, and every other cell stays "Rate unavailable" until it is captured.
 * Nothing here interpolates between ages or extrapolates a tobacco load.
 *
 * Captured 2026-09-17 from the carrier quoters. See scripts/aflac-capture.mjs
 * and scripts/moo-capture.mjs for the capture sheets that extend them.
 */

/** A cell somebody actually quoted: one age, sex and tobacco class. */
export interface QuoterCapture {
  productSlug: string;
  age: number;
  sex: 'male' | 'female';
  tobaccoClass: 'non_tobacco' | 'tobacco' | 'unismoke';
  /** Annual premium per $1,000 of face, net of the policy fee. */
  ratePerThousand: number;
}

/* -------------------------------------------------------------------------- */
/* Aflac                                                                      */
/* -------------------------------------------------------------------------- */

/** Sales guide p.20: "Each plan has an annual administration fee of $48". */
export const AFLAC_ANNUAL_FEE = 48;

/**
 * Sales guide modal table. The monthly figure rounds UP to the cent, which is
 * not cosmetic: at male 65 the Standard plan lands on 75.7925 and the quoter
 * prints 75.80 where ordinary rounding would print 75.79.
 */
export const AFLAC_MONTHLY_FACTOR = 0.0875;

/**
 * Age 65, Texas. Most cells were quoted at $10,000 and again at $20,000, and
 * each plan's rate solved identically from both, which is what confirms the
 * $48 fee.
 *
 * Male tobacco came from the $20,000 quote alone, so it has no second face
 * amount to cross-check against. Two other checks stand in for it, and both
 * land exactly:
 *
 *   - all three rates resolve to whole cents, which a wrong fee or a wrong
 *     face amount would not;
 *   - on the Standard plan the tobacco load is 1.7077 for a female and 1.7075
 *     for a male, and the male/female ratio is 1.3473 non-tobacco against
 *     1.3471 tobacco.
 *
 * A warning for whoever extends this: the quoter keeps showing the PREVIOUS
 * premiums until "Update Products" is clicked. Two quotes taken that way once
 * looked identical for male and female and nearly sent a unisex table into the
 * engine. Re-read the prices after every change, and if a number has not moved
 * when it should have, it did not requote.
 */
export const AFLAC_CAPTURES: QuoterCapture[] = [
  { productSlug: 'aflac-fe-preferred', age: 65, sex: 'female', tobaccoClass: 'non_tobacco', ratePerThousand: 45.47 },
  { productSlug: 'aflac-fe-standard', age: 65, sex: 'female', tobaccoClass: 'non_tobacco', ratePerThousand: 60.73 },
  { productSlug: 'aflac-fe-modified', age: 65, sex: 'female', tobaccoClass: 'non_tobacco', ratePerThousand: 80.9 },
  { productSlug: 'aflac-fe-preferred', age: 65, sex: 'female', tobaccoClass: 'tobacco', ratePerThousand: 68.29 },
  { productSlug: 'aflac-fe-standard', age: 65, sex: 'female', tobaccoClass: 'tobacco', ratePerThousand: 103.71 },
  { productSlug: 'aflac-fe-modified', age: 65, sex: 'female', tobaccoClass: 'tobacco', ratePerThousand: 126.57 },
  { productSlug: 'aflac-fe-preferred', age: 65, sex: 'male', tobaccoClass: 'non_tobacco', ratePerThousand: 58.98 },
  { productSlug: 'aflac-fe-standard', age: 65, sex: 'male', tobaccoClass: 'non_tobacco', ratePerThousand: 81.82 },
  { productSlug: 'aflac-fe-modified', age: 65, sex: 'male', tobaccoClass: 'non_tobacco', ratePerThousand: 106.04 },
  // From the $20,000 quote: $1,950.80, $2,842.20 and $3,265.20 annual.
  { productSlug: 'aflac-fe-preferred', age: 65, sex: 'male', tobaccoClass: 'tobacco', ratePerThousand: 95.14 },
  { productSlug: 'aflac-fe-standard', age: 65, sex: 'male', tobaccoClass: 'tobacco', ratePerThousand: 139.71 },
  { productSlug: 'aflac-fe-modified', age: 65, sex: 'male', tobaccoClass: 'tobacco', ratePerThousand: 160.86 },
];

/* -------------------------------------------------------------------------- */
/* Mutual of Omaha                                                            */
/* -------------------------------------------------------------------------- */

/** Product Guide p.12. Level carries a $36 annual fee, Graded $12. */
export const MOO_ANNUAL_FEE: Record<string, number> = {
  'living-promise-level': 36,
  'living-promise-graded': 12,
};

/** Product Guide p.12, bank service plan (the monthly draft mode). */
export const MOO_MONTHLY_FACTOR = 0.089;

/**
 * Age 65, quoted at $10,000 and again at $20,000. The $20,000 quotes came back
 * at exactly the $885.60 and $1,110.00 the fee predicted, which is what pins
 * the $36 and $12.
 *
 * The Graded plan has no tobacco distinction (Product Guide p.12: "Standard"),
 * so it is captured once as unismoke and applies to either answer.
 */
export const MOO_CAPTURES: QuoterCapture[] = [
  { productSlug: 'living-promise-level', age: 65, sex: 'female', tobaccoClass: 'tobacco', ratePerThousand: 60.06 },
  { productSlug: 'living-promise-graded', age: 65, sex: 'female', tobaccoClass: 'unismoke', ratePerThousand: 54.9 },
];

/* -------------------------------------------------------------------------- */
/* AIG / Corebridge                                                           */
/* -------------------------------------------------------------------------- */

/** SimpliNow product guide p.9. Legacy Max carries $36, Graded $12. */
export const AIG_ANNUAL_FEE: Record<string, number> = {
  'simplinow-legacy-max': 36,
  'simplinow-legacy': 12,
};

/**
 * Corebridge publishes no modal factor, but the same quote was screenshotted
 * twice -- once in the quoter's Monthly mode and once in Annual -- and the
 * factor is the ratio between them. It is not estimated; it is division, and
 * three products agree to five decimal places:
 *
 *   Legacy Max Non-Tobacco   65.85 annual -> 5.8604 monthly   = 0.08900
 *   Legacy Max Tobacco       94.71 annual -> 8.4292 monthly   = 0.08900
 *   Legacy Graded            79.45 annual -> 7.0710 monthly   = 0.08900
 *
 * The published policy fees confirm it independently: $36 x 0.089 = $3.204
 * and $12 x 0.089 = $1.068, against the $3.21 and $1.06 the monthly screen
 * implied.
 */
export const AIG_MONTHLY_FACTOR = 0.089;

/**
 * Male 65, from the Annual-mode screen. Rates do not vary by state: Alabama,
 * Texas and Mississippi returned identical premiums for the same client.
 *
 * GIWL is deliberately absent even though its annual rates are known
 * ($116.10 per $1,000 through $15,000, $129.05 from $16,000, plus a $24 fee).
 * Unlike the three products here, its Monthly and Annual screens do not
 * reconcile: the monthly screen shows $217.26 at $20,000 where the annual
 * rates and this factor predict $231.85. One of the two readings is wrong, and
 * until that is settled GIWL reports "Rate unavailable" rather than a premium
 * derived from a figure that failed its own cross-check.
 */
export const AIG_CAPTURES: QuoterCapture[] = [
  { productSlug: 'simplinow-legacy-max', age: 65, sex: 'male', tobaccoClass: 'non_tobacco', ratePerThousand: 65.85 },
  { productSlug: 'simplinow-legacy-max', age: 65, sex: 'male', tobaccoClass: 'tobacco', ratePerThousand: 94.71 },
  { productSlug: 'simplinow-legacy', age: 65, sex: 'male', tobaccoClass: 'unismoke', ratePerThousand: 79.45 },
];

/* -------------------------------------------------------------------------- */

/** Face amounts the quote form offers: $3,000 to $25,000 in $1,000 steps. */
export const CAPTURED_FACE_AMOUNTS = Array.from({ length: 23 }, (_, i) => 3000 + i * 1000);

export interface ExpandedRate {
  age: number;
  sex: 'male' | 'female';
  tobaccoClass: 'non_tobacco' | 'tobacco' | 'unismoke';
  faceAmount: number;
  monthlyPremium: string;
  annualPremium: string;
}

/**
 * Turns one capture into a monthly premium at each face amount the form offers.
 *
 * These are stored as exact monthly figures rather than as a rate and a factor
 * because each carrier rounds its own way -- Aflac rounds the modal result up
 * to the cent -- and a shared rounding rule in the engine would be wrong for
 * one of them by a cent. Applying the carrier's own rule here keeps every
 * stored figure identical to what its quoter prints.
 */
export function expandCapture(
  capture: QuoterCapture,
  annualFee: number,
  monthlyFactor: number,
  roundMonthly: 'nearest' | 'up',
): ExpandedRate[] {
  return CAPTURED_FACE_AMOUNTS.map((faceAmount) => {
    const annual = capture.ratePerThousand * (faceAmount / 1000) + annualFee;
    const raw = annual * monthlyFactor;
    const cents = roundMonthly === 'up' ? Math.ceil(raw * 100 - 1e-9) : Math.round(raw * 100);
    return {
      age: capture.age,
      sex: capture.sex,
      tobaccoClass: capture.tobaccoClass,
      faceAmount,
      monthlyPremium: (cents / 100).toFixed(2),
      annualPremium: annual.toFixed(2),
    };
  });
}
