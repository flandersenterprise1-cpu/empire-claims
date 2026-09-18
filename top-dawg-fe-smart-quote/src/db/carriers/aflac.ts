/**
 * Aflac Final Expense — whole life, underwritten by Tier One Insurance Company.
 *
 * Source: Final Expense & Medicare Supplement Sales Guide (the Aflac senior
 * products agent guide) and the Aflac Drug List CGFLP04363, effective
 * 09/17/2026.
 *
 * The guide describes ONE product with three rating classes rather than three
 * products. Plan eligibility is decided by which section of the application the
 * client answers "yes" in (guide p.20):
 *
 *   Preferred  — all "No" on the application
 *   Standard   — "Yes" in Section C only
 *   Modified   — "Yes" in Section B only
 *   Ineligible — "Yes" in Section A
 *
 * Preferred and Standard are both level plans; Modified pays the full face for
 * accidental death from day one, a limited benefit for natural causes in policy
 * years one and two, and the full benefit from year three.
 *
 * They are modelled as three products so the agent sees the price range, in the
 * same way Combined's rating classes are. The classes themselves cannot be
 * predicted from this platform's interview: the Section A/B/C question lists
 * live on the application, which is NOT among the supplied documents. Until the
 * application is supplied, the only carrier-specific underwriting this platform
 * holds for Aflac is the drug list.
 */
import type { BenefitType } from '@/modules/engine/types';

export const AFLAC_CARRIER = {
  slug: 'aflac',
  name: 'Aflac',
  salesGuide: 'Aflac Final Expense & Medicare Supplement Sales Guide',
  drugList: 'Aflac Drug List',
  drugListRef: 'CGFLP04363',
  drugListEffective: '2026-09-17',
  effectiveDate: '2026-09-17',
  underwriter: 'Tier One Insurance Company',
};

/**
 * Guide p.12: "Final Expense is available in all states except NY", and
 * "Aflac Tier One is not licensed in New York."
 */
export const AFLAC_EXCLUDED_STATES = ['NY'];

export interface AflacFaceBand {
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
}

/** Guide p.20, level benefit amounts. Face amounts step down with issue age. */
export const AFLAC_LEVEL_FACE_BANDS: AflacFaceBand[] = [
  { minAge: 45, maxAge: 55, minFaceAmount: 5000, maxFaceAmount: 50000 },
  { minAge: 56, maxAge: 65, minFaceAmount: 5000, maxFaceAmount: 40000 },
  { minAge: 66, maxAge: 75, minFaceAmount: 5000, maxFaceAmount: 30000 },
  { minAge: 76, maxAge: 80, minFaceAmount: 5000, maxFaceAmount: 25000 },
];

/** Guide p.20, modified benefit amount — a single band. */
export const AFLAC_MODIFIED_FACE_BANDS: AflacFaceBand[] = [
  { minAge: 45, maxAge: 75, minFaceAmount: 2000, maxFaceAmount: 25000 },
];

/** Guide p.20: "Each plan has an annual administration fee of $48". */
export const AFLAC_ANNUAL_ADMIN_FEE = 48;

export interface AflacProductSpec {
  slug: string;
  name: string;
  /** The drug list column this plan corresponds to. */
  drugColumn: 'fe_preferred' | 'fe_standard' | 'fe_modified';
  benefitType: BenefitType;
  minAge: number;
  maxAge: number;
  faceBands: AflacFaceBand[];
  waitingPeriodMonths: number;
  notes: string;
}

const CLASS_NOTE =
  'Aflac assigns the rating class from the health questions in Sections A, B and C of the application. Those question lists are not in the supplied sales guide, so this platform cannot predict which class a client will be offered — quote the range across the classes rather than a single class.';

export const AFLAC_PRODUCTS: AflacProductSpec[] = [
  {
    slug: 'aflac-fe-preferred',
    name: 'Aflac Final Expense — Preferred',
    drugColumn: 'fe_preferred',
    benefitType: 'level',
    minAge: 45,
    maxAge: 80,
    faceBands: AFLAC_LEVEL_FACE_BANDS,
    waitingPeriodMonths: 0,
    notes: `Level plan: the full face value is paid from the date of policy issue whether death is accidental or from natural causes. Offered when every application health question is answered "No" (guide p.20). ${CLASS_NOTE}`,
  },
  {
    slug: 'aflac-fe-standard',
    name: 'Aflac Final Expense — Standard',
    drugColumn: 'fe_standard',
    benefitType: 'level',
    minAge: 45,
    maxAge: 80,
    faceBands: AFLAC_LEVEL_FACE_BANDS,
    waitingPeriodMonths: 0,
    notes: `Level plan: the full face value is paid from the date of policy issue whether death is accidental or from natural causes. Offered when the client answers "Yes" in Section C only (guide p.20). ${CLASS_NOTE}`,
  },
  {
    slug: 'aflac-fe-modified',
    name: 'Aflac Final Expense — Modified',
    drugColumn: 'fe_modified',
    benefitType: 'modified',
    minAge: 45,
    maxAge: 75,
    faceBands: AFLAC_MODIFIED_FACE_BANDS,
    waitingPeriodMonths: 24,
    notes: `Modified plan: the full face value is paid from day one for accidental death. For non-accidental death a limited benefit is paid in policy years one and two, with the full benefit payable from the third policy year. Offered when the client answers "Yes" in Section B only (guide p.20). ${CLASS_NOTE}`,
  },
];

/**
 * A row of the drug list: the medication, the conditions it is unacceptable
 * for, and which plans it rules out.
 *
 * "Any Condition" means the medication is unacceptable for that plan whatever
 * it was prescribed for. Anything else names the conditions that make it
 * unacceptable, and the guide is explicit that a medication is only a problem
 * for those conditions.
 *
 * The Medicare supplement column is carried through for completeness but is not
 * loaded: this platform quotes final expense only.
 */
export interface AflacDrugRow {
  drug: string;
  condition: string;
  products: string[];
  page: number;
}
