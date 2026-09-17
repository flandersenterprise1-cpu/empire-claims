#!/usr/bin/env node
/**
 * Aflac Final Expense — rate quoter capture helper.
 *
 * There is no Aflac rate book. The rate quoter
 * (aetnaseniorproducts.com/aqe/ratequote?channel=afl) prints all three plans at
 * once, and the sales guide publishes the fee, which is enough to recover the
 * underlying rates exactly:
 *
 *   annual = rate per $1,000 x units + $48 annual administration fee
 *
 * Verified 2026-09-17 against the quoter -- female 65, non-tobacco, TX, in
 * Annual mode. Each plan's rate solved identically from two face amounts, which
 * is what confirms the $48 fee:
 *
 *   Preferred Level   $10,000 -> $637.80    $20,000 -> $1,227.60   $58.98/$1,000
 *   Standard Level    $10,000 -> $866.20    $20,000 -> $1,684.40   $81.82/$1,000
 *   Modified          $10,000 -> $1,108.40  $20,000 -> $2,168.80  $106.04/$1,000
 *
 * The monthly mode is the annual premium times 0.0875, rounded UP to the cent.
 * That rounding is not cosmetic: Standard and Modified both land on a half-cent
 * and the quoter goes up where ordinary rounding would go down (75.7925 -> 75.80,
 * 96.9850 -> 96.99). Only rounding up reproduces all three.
 *
 * Rates vary by BOTH sex and tobacco, and neither is a flat multiplier, so all
 * four combinations are captured. At 65, non-tobacco, a male pays 29.7% more
 * than a female on Preferred but 34.7% more on Standard; the tobacco load is
 * 15.8% on Preferred, 26.8% on Standard and 19.4% on Modified.
 *
 * A warning for whoever runs the capture: this quoter keeps showing the PREVIOUS
 * premiums after the applicant details change, until "Update Products" is
 * clicked. Two quotes taken this way looked identical for male and female and
 * nearly sent a unisex table into the engine. Re-read the plan prices after
 * every change, and if a number does not move when it should have, it did not
 * requote.
 *
 * Capture is in ANNUAL mode. The monthly figure is then derived rather than
 * typed, so no rounding rule has to be trusted at capture time.
 *
 *   template  generate the blank capture sheet
 *   build     turn a filled sheet into an import-ready rate CSV
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ANNUAL_FEE = 48;
const MONTHLY_MODAL_FACTOR = 0.0875;
const LOW_FACE = 10000;
const HIGH_FACE = 20000;

const PLANS = [
  { key: 'preferred', slug: 'aflac-fe-preferred', label: 'Preferred Level Plan', minAge: 45, maxAge: 80 },
  { key: 'standard', slug: 'aflac-fe-standard', label: 'Standard Level Plan', minAge: 45, maxAge: 80 },
  { key: 'modified', slug: 'aflac-fe-modified', label: 'Modified Plan', minAge: 45, maxAge: 75 },
];

const SEXES = ['female', 'male'];
const TOBACCO = ['non_tobacco', 'tobacco'];
const COLUMNS = PLANS.flatMap((p) => [`${p.key}_10k`, `${p.key}_20k`]);

/** Monthly premium as the quoter computes it: annual x factor, rounded up. */
function monthlyFrom(annual) {
  return Math.ceil(annual * MONTHLY_MODAL_FACTOR * 100) / 100;
}

function template(outPath) {
  const rows = [];
  for (let age = 45; age <= 80; age += 1) {
    for (const sex of SEXES) {
      for (const tobacco of TOBACCO) rows.push({ sex, tobacco, age });
    }
  }
  const header = ['sex', 'tobacco_class', 'age', ...COLUMNS].join(',');
  const body = rows.map((r) => [r.sex, r.tobacco, r.age, ...COLUMNS.map(() => '')].join(','));
  writeFileSync(outPath, [header, ...body].join('\n') + '\n');
  console.log(`Wrote ${rows.length} rows to ${outPath}`);
  console.log('Set the quoter to ANNUAL mode. One screen fills one row: read the');
  console.log(`three plan prices at $${LOW_FACE.toLocaleString()} and again at $${HIGH_FACE.toLocaleString()}.`);
  console.log('Modified stops at issue age 75; leave its columns blank above that.');
}

function build(inPath, outPath) {
  const lines = readFileSync(inPath, 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name) => head.indexOf(name);
  const problems = [];
  const bySlug = new Map();
  let blank = 0;

  lines.slice(1).forEach((line, i) => {
    const cells = line.split(',');
    const get = (name) => (idx(name) < 0 ? '' : (cells[idx(name)] ?? '').trim());
    const num = (name) => {
      const raw = get(name).replace(/[$,]/g, '');
      return raw === '' ? null : Number(raw);
    };
    const lineNo = i + 2;
    const sex = get('sex');
    const tobaccoClass = get('tobacco_class');
    const age = Number(get('age'));

    for (const plan of PLANS) {
      const low = num(`${plan.key}_10k`);
      const high = num(`${plan.key}_20k`);
      if (low === null && high === null) { blank += 1; continue; }
      if (age < plan.minAge || age > plan.maxAge) {
        problems.push(`line ${lineNo}: ${plan.label} is not issued at age ${age} (${plan.minAge}-${plan.maxAge})`);
        continue;
      }
      if (low === null || high === null) {
        problems.push(`line ${lineNo}: ${plan.label} has only one of the two face amounts`);
        continue;
      }
      if (!Number.isFinite(low) || !Number.isFinite(high) || low <= ANNUAL_FEE) {
        problems.push(`line ${lineNo}: ${plan.label} premiums are not usable`);
        continue;
      }

      const lowRate = Math.round(((low - ANNUAL_FEE) / (LOW_FACE / 1000)) * 100) / 100;
      const highRate = Math.round(((high - ANNUAL_FEE) / (HIGH_FACE / 1000)) * 100) / 100;
      // Both face amounts must agree. If they do not, either a premium was
      // mistyped or this plan has a rate band, and neither may be averaged away.
      if (Math.abs(lowRate - highRate) > 0.01) {
        problems.push(
          `line ${lineNo}: ${plan.label} is not linear -- $${LOW_FACE.toLocaleString()} implies ` +
          `$${lowRate}/$1,000 but $${HIGH_FACE.toLocaleString()} implies $${highRate}. Re-read both; ` +
          `if they are right, this plan has a rate band and needs modelling.`);
        continue;
      }

      if (!bySlug.has(plan.slug)) bySlug.set(plan.slug, []);
      bySlug.get(plan.slug).push({
        age, sex, tobaccoClass, faceAmount: LOW_FACE,
        monthly: monthlyFrom(low), annual: low, rate: lowRate,
      });
    }
  });

  if (problems.length) {
    console.error(`\n${problems.length} row(s) need attention -- nothing was written:\n`);
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }

  for (const [slug, rows] of bySlug) {
    const path = outPath.replace(/\.csv$/, `-${slug}.csv`);
    const header = 'age,sex,tobacco_class,face_amount,monthly_premium,annual_premium,rate_per_thousand';
    writeFileSync(path, [header, ...rows.map((r) =>
      [r.age, r.sex, r.tobaccoClass, r.faceAmount, r.monthly, r.annual, r.rate].join(','))].join('\n') + '\n');
    console.log(`${slug}: ${rows.length} rates -> ${path}`);
  }
  console.log(`${blank} plan cell(s) still blank.`);
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'template') template(a ?? 'aflac-capture.csv');
else if (mode === 'build') build(a, b ?? 'aflac-rates.csv');
else {
  console.error('usage: aflac-capture.mjs template [out.csv]');
  console.error('       aflac-capture.mjs build <filled.csv> [out.csv]');
  process.exit(1);
}
