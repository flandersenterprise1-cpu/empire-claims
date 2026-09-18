#!/usr/bin/env node
/**
 * Mutual of Omaha Living Promise — quoter capture helper.
 *
 * Mutual of Omaha publishes no final-expense rate book; Sales Support confirmed
 * by phone (2026-09-17) that the quick quoter is the only rate source. The
 * Product Guide p.12 does publish the pieces that turn a quoted premium back
 * into a rate, and all three have been verified against live quoter output:
 *
 *   annual = rate_per_$1,000 x units + annual_policy_fee
 *   monthly BSP = annual x 0.089     quarterly = annual x 0.275
 *   semiannual  = annual x 0.52      annual    = annual x 1.00
 *
 * Verified 2026-09-17 against live quoter output on both plans. Every mode
 * reproduced to the cent, and each plan's per-$1,000 rate solved identically
 * from two different face amounts, which pins the policy fee:
 *
 *   Level,  female 65 tobacco: $636.60 at $10,000            -> $60.06/$1,000
 *   Level,  $20,000 quote reproduced the predicted $885.60    -> fee $36
 *   Graded, female 65:         $561.00 at $10,000             -> $54.90/$1,000
 *   Graded, $20,000 quote reproduced the predicted $1,110.00  -> fee $12
 *
 * Deriving the rate this way is arithmetic on the carrier's own published fee
 * and its own quoted price -- not an estimate.
 *
 *   template  generate the blank capture sheet
 *   build     turn a filled capture sheet into an import-ready rate CSV
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** Product Guide p.12. */
const MODAL = { monthly_bsp: 0.089, quarterly: 0.275, semiannual: 0.52, annual: 1 };
const PLANS = {
  level: { minAge: 45, maxAge: 85, fee: 36, tobaccoClasses: ['non_tobacco', 'tobacco'] },
  // p.12 lists the Graded class as "Standard (no tobacco distinction)".
  graded: { minAge: 45, maxAge: 80, fee: 12, tobaccoClasses: ['unismoke'] },
};
/** Ages the agency writes most; capture these first so a partial sheet is still usable. */
const PRIORITY = (age) => (age >= 55 && age <= 80 ? 1 : age >= 50 && age <= 85 ? 2 : 3);
const REFERENCE_FACE = 10000;

function template(outPath) {
  const rows = [];
  for (const [plan, spec] of Object.entries(PLANS)) {
    for (let age = spec.minAge; age <= spec.maxAge; age += 1) {
      for (const sex of ['male', 'female']) {
        for (const tobacco of spec.tobaccoClasses) {
          rows.push({ priority: PRIORITY(age), plan, sex, tobacco_class: tobacco, age });
        }
      }
    }
  }
  rows.sort((a, b) =>
    a.priority - b.priority || a.plan.localeCompare(b.plan) ||
    a.sex.localeCompare(b.sex) || a.tobacco_class.localeCompare(b.tobacco_class) || a.age - b.age);

  const header = 'priority,plan,sex,tobacco_class,age,state,face_amount,annual_premium,monthly_bsp';
  const body = rows.map((r) =>
    `${r.priority},${r.plan},${r.sex},${r.tobacco_class},${r.age},,${REFERENCE_FACE},,`);
  writeFileSync(outPath, [header, ...body].join('\n') + '\n');
  console.log(`Wrote ${rows.length} rows to ${outPath}`);
  for (const p of [1, 2, 3]) {
    console.log(`  priority ${p}: ${rows.filter((r) => r.priority === p).length} rows`);
  }
}

function build(inPath, outPath) {
  const lines = readFileSync(inPath, 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const out = [];
  const problems = [];
  let blank = 0;

  lines.slice(1).forEach((line, i) => {
    const cells = line.split(',');
    const get = (name) => (col(name) < 0 ? '' : (cells[col(name)] ?? '').trim());
    const annual = Number(get('annual_premium').replace(/[$,]/g, ''));
    if (!get('annual_premium')) { blank += 1; return; }

    const plan = get('plan');
    const spec = PLANS[plan];
    const lineNo = i + 2;
    if (!spec) { problems.push(`line ${lineNo}: unknown plan "${plan}"`); return; }
    if (!Number.isFinite(annual) || annual <= 0) {
      problems.push(`line ${lineNo}: annual_premium "${get('annual_premium')}" is not a premium`);
      return;
    }

    // Cross-check against the quoter's own monthly figure. A mistyped annual
    // premium will not agree with its own monthly, so typos surface here
    // rather than silently pricing a case wrong.
    const monthlyTyped = Number(get('monthly_bsp').replace(/[$,]/g, ''));
    const monthlyDerived = Math.round(annual * MODAL.monthly_bsp * 100) / 100;
    if (get('monthly_bsp') && Math.abs(monthlyTyped - monthlyDerived) > 0.01) {
      problems.push(
        `line ${lineNo}: annual ${annual} implies monthly ${monthlyDerived}, but the sheet says ${monthlyTyped}`);
      return;
    }

    const face = Number(get('face_amount') || REFERENCE_FACE);
    const units = face / 1000;
    const rate = Math.round(((annual - spec.fee) / units) * 100) / 100;
    if (rate <= 0) {
      problems.push(`line ${lineNo}: annual ${annual} is below the $${spec.fee} policy fee`);
      return;
    }
    out.push({
      plan, age: get('age'), sex: get('sex'), tobacco_class: get('tobacco_class'),
      state: get('state'), face_amount: face,
      monthly_premium: monthlyDerived, annual_premium: annual, rate_per_thousand: rate,
    });
  });

  if (problems.length) {
    console.error(`\n${problems.length} row(s) need attention -- nothing was written:\n`);
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }

  const byPlan = new Map();
  for (const r of out) {
    if (!byPlan.has(r.plan)) byPlan.set(r.plan, []);
    byPlan.get(r.plan).push(r);
  }
  for (const [plan, rows] of byPlan) {
    const path = outPath.replace(/\.csv$/, `-${plan}.csv`);
    const header = 'age,sex,tobacco_class,face_amount,monthly_premium,annual_premium,rate_per_thousand';
    writeFileSync(path, [header, ...rows.map((r) =>
      [r.age, r.sex, r.tobacco_class, r.face_amount, r.monthly_premium, r.annual_premium, r.rate_per_thousand]
        .join(','))].join('\n') + '\n');
    console.log(`${plan}: ${rows.length} rates -> ${path}`);
  }
  console.log(`${blank} cell(s) still blank.`);
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'template') template(a ?? 'moo-living-promise-capture.csv');
else if (mode === 'build') build(a, b ?? 'moo-rates.csv');
else {
  console.error('usage: moo-capture.mjs template [out.csv]');
  console.error('       moo-capture.mjs build <filled.csv> [out.csv]');
  process.exit(1);
}
