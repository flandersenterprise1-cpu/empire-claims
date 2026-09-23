/**
 * Fidelity Life Association (FLA) — RAPIDecision® Guaranteed Issue.
 *
 * Source: "RAPIDecision Guaranteed Issue — Product Availability as of
 * 07/10/2019".
 *
 * The only document supplied for this carrier's final-expense-relevant product
 * is a state availability grid, so that is all that is loaded: the product
 * exists with verified state availability and nothing else. Issue ages, face
 * amounts, the benefit schedule and rates are all still required.
 *
 * NOTE ON AGE OF SOURCE: the grid is dated 07/10/2019. State filings change.
 * Re-confirm it against a current availability sheet before activating.
 *
 * The carrier's other product, InstaBrain Term, is recorded further down as
 * INSTABRAIN_TERM. It is term life and carries no published premium, so it is
 * not priced here -- but a client inside its issue ages is told it exists.
 */

export const FIDELITY_LIFE_CARRIER = {
  /** The seeded placeholder was created under the product name "InstaBrain". */
  placeholderSlug: 'instabrain',
  slug: 'fidelity-life',
  name: 'Fidelity Life Association',
  availabilityDoc: 'RAPIDecision Guaranteed Issue — Product Availability',
  availabilityRef: 'Product Availability as of 07/10/2019',
  availabilityAsOf: '2019-07-10',
};

/**
 * Every state in the grid is marked "Yes" except Montana. New York and Wyoming
 * do not appear at all — the footnote states "Fidelity Life Association does not
 * do business in New York or Wyoming."
 */
export const FIDELITY_LIFE_UNAVAILABLE_STATES = ['MT', 'NY', 'WY'];

export const FIDELITY_LIFE_PRODUCT = {
  slug: 'rapidecision-guaranteed-issue',
  name: 'RAPIDecision Guaranteed Issue',
  notes:
    'Guaranteed issue whole life. ONLY the state availability grid was supplied for this product. STILL REQUIRED before activation: issue ages, minimum and maximum face amounts, the graded/return-of-premium benefit schedule, the policy fee and the rate tables. The issue ages and face amounts stored here are platform placeholders, not carrier values. The availability grid is dated 07/10/2019 and should be re-confirmed.',
};

/**
 * InstaBrain Term, from the Producer Guide (FLA_InstaBrainTerm_ProducerGuide
 * 07/07/26) and the Consumer Guide.
 *
 * This is recorded, not quoted, and the reason is arithmetic rather than
 * policy: neither guide contains a premium rate anywhere -- zero rate rows in
 * twelve pages and four -- and the product's MINIMUM face amount is $50,000,
 * which is twice this quoter's maximum. Even with rates in hand it could never
 * appear in a final expense comparison, because no client asking for $3,000 to
 * $25,000 of whole life is shopping a $50,000 term policy.
 *
 * What the guides DO give is a complete eligibility profile, and that is worth
 * keeping: an agent sitting with a 55-year-old who turns out to want real
 * coverage rather than burial cover should be told this exists. The quote
 * results name it when the client falls inside the profile below.
 */
export const INSTABRAIN_TERM = {
  name: 'InstaBrain Term',
  producerGuide: 'InstaBrain Term Producer Guide',
  producerGuideRef: 'FLA_InstaBrainTerm_ProducerGuide 07/07/26',
  consumerGuide: 'InstaBrain Term Consumer Guide',
  /** Producer guide: "Issue Ages: 18-60, age last birthday". */
  minAge: 18,
  maxAge: 60,
  /** Producer guide, Face Amounts & Term Periods: "Min: $50K". */
  minFaceAmount: 50_000,
  maxFaceAmount: 1_000_000,
  termYears: [10, 15, 20, 30],
  /** Producer guide: "Policy Fee: $95 Commissionable". */
  annualPolicyFee: 95,
  premiumModes: ['monthly', 'annual'],
  riskClasses: {
    nonTobacco: ['Preferred Plus', 'Preferred', 'Standard', 'Standard Extra'],
    tobacco: ['Preferred', 'Standard Extra'],
  },
  /**
   * Face maximums step down with issue age, and the 30-year term is not open
   * to every age. Producer guide, Face Amounts & Term Periods table.
   */
  faceLimits: [
    { termYears: [10, 15, 20], minAge: 18, maxAge: 55, maxFace: 1_000_000, tobacco: 'all' },
    {
      termYears: [10, 15, 20],
      minAge: 56,
      maxAge: 60,
      maxFace: 900_000,
      tobacco: 'all',
      note: '$900K at 56, grading down $100K per issue age to $500K at 60.',
    },
    { termYears: [30], minAge: 18, maxAge: 50, maxFace: 1_000_000, tobacco: 'non_tobacco' },
    { termYears: [30], minAge: 18, maxAge: 45, maxFace: 1_000_000, tobacco: 'tobacco' },
  ],
  notLoaded: {
    rates:
      'NEITHER GUIDE CONTAINS A PREMIUM. Both were searched end to end; there are no rate tables and no modal factors, only the $95 policy fee and the two payment modes.',
    ranking:
      'The engine models level, graded, modified and guaranteed-issue whole life. It has no concept of a term period, so a term policy cannot be ranked against them even with rates.',
    range:
      "The minimum face amount of $50,000 is above this platform's $25,000 maximum, so the two products do not overlap at any coverage amount an agent would quote here.",
  },
  /** What it would take to quote it properly, if the agency decides to. */
  ifNeeded:
    'Quoting term is a separate product line: a term_years attribute on products, term-aware ranking, a coverage range that reaches $1,000,000, and the rate tables from Fidelity Life.',
};

/**
 * Whether a client is inside InstaBrain Term's issue ages. Face amount is
 * deliberately not part of this: the point of the notice is to tell an agent
 * the product exists for a client whose needs have outgrown final expense.
 */
export function instabrainFitsClient(age: number): boolean {
  return age >= INSTABRAIN_TERM.minAge && age <= INSTABRAIN_TERM.maxAge;
}

/** The sentence an agent sees on the results screen when the client fits. */
export function instabrainNotice(): string {
  const t = INSTABRAIN_TERM;
  return (
    `This client is inside the issue ages for Fidelity Life ${t.name} ` +
    `(${t.minAge}-${t.maxAge}, ${t.termYears.join('/')}-year level term, ` +
    `$${(t.minFaceAmount / 1000).toFixed(0)}K-$${(t.maxFaceAmount / 1_000_000).toFixed(0)}M). ` +
    'It is term life, not final expense, so it is not priced or ranked here and no premium is shown. ' +
    'Quote it directly with Fidelity Life if the client wants more coverage than a final expense policy provides.'
  );
}
