/**
 * Carrier placeholders.
 *
 * Every real carrier ships INACTIVE with no products, no rates and no
 * underwriting rules. Nothing about their products, pricing, state footprint
 * or underwriting has been invented — those rows are created only from the
 * verified documents an administrator loads.
 */
export interface SeedCarrier {
  slug: string;
  name: string;
  notes: string;
}

const AWAITING =
  'Inactive placeholder. Awaiting verified carrier documentation: product list, issue-age and face-amount limits, state availability, underwriting guide (knockouts and level/graded/modified classification), rate tables with effective dates, and the agent application link.';

export const SEED_CARRIERS: SeedCarrier[] = [
  { slug: 'mutual-of-omaha', name: 'Mutual of Omaha', notes: AWAITING },
  { slug: 'aflac', name: 'Aflac', notes: AWAITING },
  { slug: 'cica-life', name: 'CICA Life', notes: AWAITING },
  { slug: 'aig-corebridge', name: 'AIG / Corebridge', notes: AWAITING },
  { slug: 'instabrain', name: 'InstaBrain', notes: AWAITING },
  { slug: 'combined-insurance', name: 'Combined Insurance', notes: AWAITING },
  { slug: 'american-amicable', name: 'American Amicable', notes: AWAITING },
  { slug: 'royal-neighbors', name: 'Royal Neighbors of America', notes: AWAITING },
];
