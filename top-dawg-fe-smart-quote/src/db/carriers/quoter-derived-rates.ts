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
 * Age 65, Texas, quoted at $10,000 and again at $20,000; each plan's rate
 * solved identically from both, which is what confirms the $48 fee.
 *
 * Male tobacco is deliberately absent. It was never read off a requoted
 * screen, and this quoter keeps showing the previous premiums until "Update
 * Products" is clicked -- two quotes taken that way once looked identical for
 * male and female and nearly sent a unisex table into the engine.
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
