#!/usr/bin/env node
/**
 * AIG / Corebridge SimpliNow + GIWL -- quoter capture helper.
 *
 * Corebridge publishes no final-expense rate book, but the Final Expense
 * Quoter (rapid-rater.live.web.corebridgefinancial.com) prints annual premiums
 * for all four products at once, and the product guides publish the policy
 * fees. That is enough to recover the underlying rates exactly:
 *
 *   annual = rate per $1,000 x units + annual policy fee
 *
 * Verified 2026-09-17 against the quoter, male 65, Annual mode:
 *   Legacy Max Level Non-Tobacco  $65.85/$1,000 + $36
 *   Legacy Max Level Tobacco      $94.71/$1,000 + $36
 *   Legacy Graded                 $79.45/$1,000 + $12
 *   GIWL  $5,000-$15,000         $116.10/$1,000 + $24
 *   GIWL $16,000-$25,000         $129.05/$1,000 + $24
 *
 * Each intercept landed on the fee the guides publish, and all five reproduce
 * every printed premium to the cent.
 *
 * Two findings the capture depends on:
 *
 * 1. GIWL is NOT one straight line. It runs at $116.10 through $15,000 and
 *    $129.05 from $16,000 up. Fitting a single line would have quoted a
 *    $20,000 case at $2,346 against a true $2,605. So GIWL is captured at two
 *    face amounts, one in each band, and never interpolated across the break.
 * 2. Rates do not vary by state. Alabama, Texas and Mississippi returned
 *    identical premiums for the same client, so one national table is correct.
 *
 * The three riders shown in the quoter (Terminal Illness, Nursing Home
 * Confinement, Chronic Illness) cannot be unchecked -- they are included in
 * the policy at no charge, so these are base rates. Accidental Death Benefit
 * is the one optional paid rider and is left off.
 *
 *   template  generate the blank capture sheet
 *   build     turn a filled sheet into import-ready rate CSVs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MIN_AGE = 50;
const MAX_AGE = 80;

/** Face amounts captured per row: one below the GIWL break, one above it. */
const LOW_FACE = 10000;
const HIGH_FACE = 20000;
const GIWL_BAND_BREAK = 15000;

const PRODUCTS = [
  { key: 'max_nt', slug: 'simplinow-legacy-max', label: 'Legacy Max Level Non Tobacco',
    fee: 36, tobaccoClass: 'non_tobacco', banded: false },
  { key: 'max_t', slug: 'simplinow-legacy-max', label: 'Legacy Max Level Tobacco',
    fee: 36, tobaccoClass: 'tobacco', banded: false },
  { key: 'graded', slug: 'simplinow-legacy', label: 'Legacy Graded',
    fee: 12, tobaccoClass: 'unismoke', banded: false },
  { key: 'giwl', slug: 'giwl', label: 'GIWL',
    fee: 24, tobaccoClass: 'unismoke', banded: true },
];

const COLUMNS = PRODUCTS.flatMap((p) => [`${p.key}_10k`, `${p.key}_20k`]);

function template(outPath) {
  const rows = [];
  for (let age = MIN_AGE; age <= MAX_AGE; age += 1) {
    for (const sex of ['male', 'female']) rows.push({ sex, age });
  }
  const header = ['sex', 'age', ...COLUMNS].join(',');
  const body = rows.map((r) => [r.sex, r.age, ...COLUMNS.map(() => '')].join(','));
  writeFileSync(outPath, [header, ...body].join('\n') + '\n');
  console.log(`Wrote ${rows.length} rows to ${outPath}`);
  console.log(`Each row needs ${COLUMNS.length} annual premiums, read off one "All Rates" screen`);
  console.log(`at $${LOW_FACE.toLocaleString()} and $${HIGH_FACE.toLocaleString()}, Mode = Annual.`);
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
    const age = Number(get('age'));

    for (const p of PRODUCTS) {
      const low = num(`${p.key}_10k`);
      const high = num(`${p.key}_20k`);
      if (low === null && high === null) { blank += 1; continue; }
      if (low === null || high === null) {
        problems.push(`line ${lineNo}: ${p.label} has only one of the two face amounts`);
        continue;
      }
      if (!Number.isFinite(low) || !Number.isFinite(high) || low <= p.fee) {
        problems.push(`line ${lineNo}: ${p.label} premiums "${get(`${p.key}_10k`)}" / "${get(`${p.key}_20k`)}" are not usable`);
        continue;
      }

      const lowRate = Math.round(((low - p.fee) / (LOW_FACE / 1000)) * 100) / 100;
      const highRate = Math.round(((high - p.fee) / (HIGH_FACE / 1000)) * 100) / 100;

      if (!p.banded) {
        // A straight-line product must give the same rate from both points.
        // Any disagreement is a typo or an unexpected band, and either way it
        // must not be averaged away.
        if (Math.abs(lowRate - highRate) > 0.01) {
          problems.push(
            `line ${lineNo}: ${p.label} is not linear -- $${LOW_FACE.toLocaleString()} implies ` +
            `$${lowRate}/$1,000 but $${HIGH_FACE.toLocaleString()} implies $${highRate}. ` +
            `Re-read both, and if they are right this product has a rate band and needs modelling.`);
          continue;
        }
      }

      const push = (row) => {
        if (!bySlug.has(p.slug)) bySlug.set(p.slug, []);
        bySlug.get(p.slug).push(row);
      };
      if (p.banded) {
        push({ age, sex, tobaccoClass: p.tobaccoClass, faceAmount: LOW_FACE,
               annual: low, rate: lowRate, band: `face_le_${GIWL_BAND_BREAK}` });
        push({ age, sex, tobaccoClass: p.tobaccoClass, faceAmount: HIGH_FACE,
               annual: high, rate: highRate, band: `face_gt_${GIWL_BAND_BREAK}` });
      } else {
        push({ age, sex, tobaccoClass: p.tobaccoClass, faceAmount: LOW_FACE,
               annual: low, rate: lowRate, band: '' });
      }
    }
  });

  if (problems.length) {
    console.error(`\n${problems.length} row(s) need attention -- nothing was written:\n`);
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }

  for (const [slug, rows] of bySlug) {
    const path = outPath.replace(/\.csv$/, `-${slug}.csv`);
    const header = 'age,sex,tobacco_class,face_amount,annual_premium,rate_per_thousand,band';
    writeFileSync(path, [header, ...rows.map((r) =>
      [r.age, r.sex, r.tobaccoClass, r.faceAmount, r.annual, r.rate, r.band].join(','))].join('\n') + '\n');
    console.log(`${slug}: ${rows.length} rates -> ${path}`);
  }
  console.log(`${blank} product cell(s) still blank.`);
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'template') template(a ?? 'aig-capture.csv');
else if (mode === 'build') build(a, b ?? 'aig-rates.csv');
else {
  console.error('usage: aig-capture.mjs template [out.csv]');
  console.error('       aig-capture.mjs build <filled.csv> [out.csv]');
  process.exit(1);
}
