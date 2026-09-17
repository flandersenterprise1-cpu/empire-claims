/**
 * CICA Life of America — Superior Choice rate tables and availability.
 *
 * Source: CICA Life of America Agent Guide and Resources (May 2026), the
 * "2025 Product Rate Card" on pp.46-48 and the "Products approved by state"
 * grid on pp.14-15.
 *
 * The rate card prints an ANNUAL PREMIUM RATE PER $1,000 for every issue age
 * 0-85, by sex, for both plans. These are transcribed here exactly as printed;
 * nothing is interpolated.
 *
 * STILL MISSING, and the reason CICA cannot yet quote a monthly premium:
 * the guide prints no policy fee and no modal factors. The policy specimen
 * shows Annual / Semi-Annual / Quarterly / Monthly /
 * Special Monthly columns but leaves the values as specimen blanks. Until both
 * are supplied by CICA, the rate tables load with an annual basis only and the
 * engine will show "Rate unavailable" rather than invent a monthly figure.
 */

/** Issue-age band face limits, Agent Guide p.36 ("Our Products"). */
export interface CicaFaceBand {
  minAge: number;
  maxAge: number;
  minFaceAmount: number;
  maxFaceAmount: number;
}

export const CICA_STANDARD_FACE_BANDS: CicaFaceBand[] = [
  { minAge: 0, maxAge: 50, minFaceAmount: 1000, maxFaceAmount: 30000 },
  { minAge: 51, maxAge: 70, minFaceAmount: 1000, maxFaceAmount: 20000 },
  { minAge: 71, maxAge: 85, minFaceAmount: 1000, maxFaceAmount: 10000 },
];

export const CICA_GUARANTEED_FACE_BANDS: CicaFaceBand[] = [
  { minAge: 0, maxAge: 50, minFaceAmount: 1000, maxFaceAmount: 30000 },
  { minAge: 51, maxAge: 70, minFaceAmount: 1000, maxFaceAmount: 30000 },
  { minAge: 71, maxAge: 85, minFaceAmount: 1000, maxFaceAmount: 10000 },
];

/**
 * States where the grid marks all four columns (Standard and Guaranteed Issue,
 * English and Spanish applications). Current as of May 2025 per the guide.
 */
export const CICA_APPROVED_STATES = ['AK', 'AL', 'AR', 'AZ', 'CO', 'CT', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MD', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NM', 'NV', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'VT', 'WA', 'WV', 'WY'];

/**
 * Not licensed — these states carry no marks at all in the grid. The District
 * of Columbia does not appear in the grid, so it is treated the same way.
 */
export const CICA_UNLICENSED_STATES = ['CA', 'DE', 'ME', 'MA', 'NJ', 'NY', 'VA', 'DC'];

/**
 * Utah shows three of four marks and Wisconsin two, and the flattened grid does
 * not say which columns they are. Rather than guess which plan is approved,
 * both are held unavailable with this note until CICA confirms.
 */
export const CICA_PARTIAL_STATES: Array<{ code: string; marks: number }> = [
  { code: 'UT', marks: 3 },
  { code: 'WI', marks: 2 },
];

/** [issue age, male rate per $1,000, female rate per $1,000] */
export type CicaRateRow = [number, number, number];

/** Standard Issue, Agent Guide pp.46-48. */
export const CICA_STANDARD_RATES: CicaRateRow[] = [
  [0, 10.42, 10.42],
  [1, 10.42, 10.42],
  [2, 10.6, 10.42],
  [3, 10.87, 10.42],
  [4, 11.03, 10.6],
  [5, 11.32, 10.87],
  [6, 11.5, 11.03],
  [7, 11.67, 11.32],
  [8, 11.95, 11.5],
  [9, 12.12, 11.68],
  [10, 12.31, 11.95],
  [11, 12.58, 12.12],
  [12, 12.85, 12.31],
  [13, 13.22, 12.58],
  [14, 13.58, 12.85],
  [15, 13.85, 13.22],
  [16, 14.22, 13.58],
  [17, 14.58, 13.85],
  [18, 14.83, 14.22],
  [19, 15.18, 14.58],
  [20, 15.48, 14.84],
  [21, 15.83, 15.19],
  [22, 16.18, 15.48],
  [23, 16.46, 15.83],
  [24, 16.83, 16.19],
  [25, 17.18, 16.46],
  [26, 17.63, 16.83],
  [27, 18.12, 17.19],
  [28, 18.71, 17.63],
  [29, 19.3, 18.13],
  [30, 19.9, 18.72],
  [31, 20.58, 19.31],
  [32, 21.26, 19.91],
  [33, 21.93, 20.58],
  [34, 22.69, 21.26],
  [35, 23.46, 21.94],
  [36, 24.22, 22.7],
  [37, 25.1, 23.46],
  [38, 25.94, 24.23],
  [39, 26.89, 25.1],
  [40, 27.93, 25.95],
  [41, 28.97, 26.9],
  [42, 30.1, 27.94],
  [43, 31.22, 28.97],
  [44, 32.45, 30.11],
  [45, 33.68, 31.23],
  [46, 34.98, 32.46],
  [47, 36.29, 33.69],
  [48, 37.69, 34.99],
  [49, 39.18, 36.3],
  [50, 40.67, 37.7],
  [51, 42.35, 39.19],
  [52, 44.45, 40.68],
  [53, 46.72, 42.26],
  [54, 49.1, 44.24],
  [55, 51.62, 46.39],
  [56, 54.49, 48.64],
  [57, 57.23, 51.01],
  [58, 60.09, 53.73],
  [59, 63.11, 56.3],
  [60, 66.26, 58.97],
  [61, 69.58, 61.79],
  [62, 73.06, 64.71],
  [63, 76.71, 67.79],
  [64, 80.56, 71.01],
  [65, 86.44, 74.92],
  [66, 92.77, 79.41],
  [67, 99.55, 84.18],
  [68, 106.83, 89.23],
  [69, 114.63, 94.58],
  [70, 123.01, 100.26],
  [71, 132.01, 106.27],
  [72, 141.66, 112.64],
  [73, 152.02, 119.4],
  [74, 163.12, 126.57],
  [75, 175.05, 134.16],
  [76, 187.84, 142.21],
  [77, 201.58, 150.75],
  [78, 216.32, 159.8],
  [79, 232.0, 170.98],
  [80, 248.82, 182.95],
  [81, 266.86, 195.75],
  [82, 286.21, 209.46],
  [83, 306.96, 224.12],
  [84, 329.21, 239.8],
  [85, 353.08, 256.59],
];

/** Guaranteed Issue, Agent Guide pp.46-48. */
export const CICA_GUARANTEED_RATES: CicaRateRow[] = [
  [0, 41.59, 40.79],
  [1, 42.0, 39.37],
  [2, 42.82, 40.14],
  [3, 43.53, 40.8],
  [4, 44.55, 41.76],
  [5, 45.26, 42.43],
  [6, 46.18, 43.29],
  [7, 46.9, 43.96],
  [8, 47.71, 44.73],
  [9, 48.63, 45.59],
  [10, 49.44, 46.35],
  [11, 50.46, 47.31],
  [12, 51.18, 47.98],
  [13, 51.89, 48.64],
  [14, 52.6, 49.31],
  [15, 53.22, 49.88],
  [16, 53.83, 50.46],
  [17, 54.13, 50.75],
  [18, 54.44, 51.03],
  [19, 54.85, 51.42],
  [20, 55.15, 51.7],
  [21, 55.26, 51.8],
  [22, 55.66, 52.18],
  [23, 56.27, 52.75],
  [24, 56.89, 53.33],
  [25, 57.6, 54.0],
  [26, 57.94, 54.36],
  [27, 58.28, 54.72],
  [28, 58.62, 55.08],
  [29, 58.96, 55.44],
  [30, 59.3, 55.8],
  [31, 59.64, 56.16],
  [32, 59.98, 56.52],
  [33, 60.32, 56.88],
  [34, 60.66, 57.24],
  [35, 61.0, 57.6],
  [36, 61.34, 57.96],
  [37, 61.68, 58.32],
  [38, 62.02, 58.68],
  [39, 62.36, 59.04],
  [40, 62.7, 59.4],
  [41, 63.04, 59.76],
  [42, 63.38, 60.12],
  [43, 63.72, 60.48],
  [44, 64.06, 60.84],
  [45, 64.4, 61.2],
  [46, 64.74, 61.56],
  [47, 65.08, 61.92],
  [48, 65.42, 62.28],
  [49, 65.76, 62.64],
  [50, 66.09, 63.0],
  [51, 66.43, 63.36],
  [52, 66.77, 63.72],
  [53, 67.11, 64.08],
  [54, 67.45, 64.44],
  [55, 67.79, 64.8],
  [56, 72.84, 69.41],
  [57, 78.25, 74.35],
  [58, 84.07, 79.64],
  [59, 90.32, 85.3],
  [60, 97.04, 91.37],
  [61, 104.26, 97.87],
  [62, 112.01, 104.84],
  [63, 120.34, 112.3],
  [64, 129.29, 120.29],
  [65, 138.91, 128.85],
  [66, 149.24, 138.01],
  [67, 160.33, 147.83],
  [68, 172.26, 158.35],
  [69, 185.07, 169.62],
  [70, 198.83, 181.68],
  [71, 204.62, 190.86],
  [72, 210.42, 200.04],
  [73, 216.21, 209.22],
  [74, 222.0, 218.4],
  [75, 232.83, 229.05],
  [76, 244.58, 240.61],
  [77, 257.27, 253.1],
  [78, 270.89, 266.5],
  [79, 284.86, 280.23],
  [80, 299.07, 294.21],
  [81, 318.97, 318.97],
  [82, 338.76, 338.76],
  [83, 358.55, 358.55],
  [84, 378.34, 378.34],
  [85, 397.67, 397.67],
];
