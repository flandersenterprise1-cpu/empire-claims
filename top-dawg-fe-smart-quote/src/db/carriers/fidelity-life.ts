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
 * The other document supplied under the "InstaBrain" name — the InstaBrain Term
 * Producer Guide — is TERM life insurance (10/15/20 year terms, issue ages
 * 18-60, minimum face $50,000). It is not a final expense product and is
 * deliberately NOT loaded into this platform. See INSTABRAIN_TERM_OUT_OF_SCOPE.
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
 * Why the second InstaBrain document is not loaded. Kept in code so the decision
 * is visible to whoever picks this up next.
 */
export const INSTABRAIN_TERM_OUT_OF_SCOPE = {
  document: 'InstaBrain Term Producer Guide (FLA_InstaBrainTerm_ProducerGuide_070726)',
  reasons: [
    'It is term life insurance (10, 15 and 20 year level terms), not whole life.',
    'Minimum face amount is $50,000; this platform quotes $3,000 to $25,000.',
    'Issue ages are 18-60; final expense clients are typically 50-85.',
    'The recommendation engine models level, graded, modified and guaranteed-issue whole life benefit types. It has no concept of a term period, so a term product cannot be ranked correctly against the others.',
  ],
  ifNeeded:
    'Quoting term would be a separate product line: a term_years attribute on products, term-aware ranking, and a wider coverage range on the intake form.',
};
