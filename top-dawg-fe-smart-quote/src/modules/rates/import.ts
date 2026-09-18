/**
 * CSV rate-table importer.
 *
 * Imported rates land in a DRAFT rate table. The rate engine only reads
 * PUBLISHED tables, so nothing an import produces can reach an agent until an
 * administrator has reviewed and published it.
 */
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { recordAudit, type AuditActor } from '@/modules/audit';
import type { Db } from '@/modules/catalog/repository';
import type { BenefitType, Sex, TobaccoClass } from '@/modules/engine/types';

export interface ParsedRateRow {
  age: number;
  sex: Sex;
  tobaccoClass: TobaccoClass;
  faceAmount: number;
  monthlyPremium: number;
  annualPremium: number | null;
  ratePerThousand: number | null;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedRateRow[];
  errors: ParseError[];
}

export const RATE_CSV_TEMPLATE_HEADERS = [
  'age',
  'sex',
  'tobacco_class',
  'face_amount',
  'monthly_premium',
  'annual_premium',
  'rate_per_thousand',
];

const SEX_ALIASES: Record<string, Sex> = {
  m: 'male', male: 'male', f: 'female', female: 'female',
  u: 'unisex', unisex: 'unisex', both: 'unisex',
};

const TOBACCO_ALIASES: Record<string, TobaccoClass> = {
  t: 'tobacco', tobacco: 'tobacco', smoker: 'tobacco',
  n: 'non_tobacco', nt: 'non_tobacco', non_tobacco: 'non_tobacco',
  'non-tobacco': 'non_tobacco', nonsmoker: 'non_tobacco', standard: 'non_tobacco',
  unismoke: 'unismoke', uni: 'unismoke', composite: 'unismoke',
};

function money(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parses a rate CSV. Bad rows are reported, never silently dropped or guessed. */
export function parseRateCsv(csv: string): ParseResult {
  const rows: ParsedRateRow[] = [];
  const errors: ParseError[] = [];

  let records: Record<string, string>[];
  try {
    records = parse(csv, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    return { rows: [], errors: [{ row: 0, message: `Could not read the CSV: ${(err as Error).message}` }] };
  }

  const seen = new Set<string>();

  records.forEach((record, index) => {
    const lineNumber = index + 2; // account for the header row
    const age = Number(record.age);
    const sex = SEX_ALIASES[String(record.sex ?? '').trim().toLowerCase()];
    const tobaccoClass = TOBACCO_ALIASES[String(record.tobacco_class ?? '').trim().toLowerCase()];
    const faceAmount = money(record.face_amount);
    const monthlyPremium = money(record.monthly_premium);
    const annualPremium = money(record.annual_premium);
    const ratePerThousand = money(record.rate_per_thousand);

    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.push({ row: lineNumber, message: `Invalid age "${record.age}".` });
      return;
    }
    if (!sex) {
      errors.push({ row: lineNumber, message: `Invalid sex "${record.sex}". Use male, female or unisex.` });
      return;
    }
    if (!tobaccoClass) {
      errors.push({
        row: lineNumber,
        message: `Invalid tobacco_class "${record.tobacco_class}". Use tobacco, non_tobacco or unismoke.`,
      });
      return;
    }
    if (faceAmount === null || faceAmount < 0) {
      errors.push({ row: lineNumber, message: `Invalid face_amount "${record.face_amount}".` });
      return;
    }
    if (monthlyPremium === null || monthlyPremium < 0) {
      errors.push({ row: lineNumber, message: `Invalid monthly_premium "${record.monthly_premium}".` });
      return;
    }
    if (faceAmount === 0 && ratePerThousand === null) {
      errors.push({
        row: lineNumber,
        message: 'face_amount 0 is reserved for per-$1,000 rows and requires rate_per_thousand.',
      });
      return;
    }

    const key = `${age}|${sex}|${tobaccoClass}|${faceAmount}`;
    if (seen.has(key)) {
      errors.push({ row: lineNumber, message: `Duplicate rate for age ${age}, ${sex}, ${tobaccoClass}, $${faceAmount}.` });
      return;
    }
    seen.add(key);

    rows.push({ age, sex, tobaccoClass, faceAmount, monthlyPremium, annualPremium, ratePerThousand });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'The file contained no rate rows.' });
  }

  return { rows, errors };
}

export interface ImportOptions {
  productId: number;
  benefitType: BenefitType;
  stateCode?: string | null;
  effectiveDate: string;
  endDate?: string | null;
  monthlyPolicyFee?: number;
  sourceDocumentId?: number | null;
  sourcePage?: string | null;
  filename: string;
  isFictionalSample?: boolean;
  notes?: string | null;
}

export interface ImportResult {
  rateTableId: number | null;
  importId: number;
  status: 'draft' | 'failed';
  accepted: number;
  rejected: number;
  errors: ParseError[];
}

export async function importRateCsv(
  db: Db,
  csv: string,
  options: ImportOptions,
  actor: AuditActor | null,
): Promise<ImportResult> {
  const { rows, errors } = parseRateCsv(csv);

  if (rows.length === 0) {
    const [imported] = await db
      .insert(schema.rateImports)
      .values({
        productId: options.productId,
        filename: options.filename,
        rowCount: errors.length,
        acceptedCount: 0,
        rejectedCount: errors.length,
        status: 'failed',
        errors,
        createdByUserId: actor?.id ?? null,
      })
      .returning();

    await recordAudit(db, {
      actor,
      action: 'rate_table.import_failed',
      entityType: 'rate_import',
      entityId: imported.id,
      summary: `Import of ${options.filename} rejected: ${errors.length} problem(s)`,
      after: { errors },
    });
    return { rateTableId: null, importId: imported.id, status: 'failed', accepted: 0, rejected: errors.length, errors };
  }

  // Version the new table above whatever already exists for this product.
  const existing = await db
    .select({ version: schema.rateTables.version })
    .from(schema.rateTables)
    .where(eq(schema.rateTables.productId, options.productId));
  const nextVersion = existing.reduce((max, t) => Math.max(max, t.version), 0) + 1;

  const [table] = await db
    .insert(schema.rateTables)
    .values({
      productId: options.productId,
      stateCode: options.stateCode ?? null,
      benefitType: options.benefitType,
      effectiveDate: options.effectiveDate,
      endDate: options.endDate ?? null,
      status: 'draft', // never live until an administrator publishes it
      version: nextVersion,
      monthlyPolicyFee: String(options.monthlyPolicyFee ?? 0),
      sourceDocumentId: options.sourceDocumentId ?? null,
      sourcePage: options.sourcePage ?? null,
      isFictionalSample: options.isFictionalSample ?? false,
      notes: options.notes ?? null,
      createdByUserId: actor?.id ?? null,
    })
    .returning();

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(schema.rateEntries).values(
      rows.slice(i, i + CHUNK).map((row) => ({
        rateTableId: table.id,
        age: row.age,
        sex: row.sex,
        tobaccoClass: row.tobaccoClass,
        faceAmount: row.faceAmount,
        monthlyPremium: String(row.monthlyPremium),
        annualPremium: row.annualPremium == null ? null : String(row.annualPremium),
        ratePerThousand: row.ratePerThousand == null ? null : String(row.ratePerThousand),
      })),
    );
  }

  const [imported] = await db
    .insert(schema.rateImports)
    .values({
      productId: options.productId,
      rateTableId: table.id,
      filename: options.filename,
      rowCount: rows.length + errors.length,
      acceptedCount: rows.length,
      rejectedCount: errors.length,
      status: 'draft',
      errors: errors.length > 0 ? errors : null,
      createdByUserId: actor?.id ?? null,
    })
    .returning();

  await recordAudit(db, {
    actor,
    action: 'rate_table.import',
    entityType: 'rate_table',
    entityId: table.id,
    entityVersion: table.version,
    summary: `Imported ${rows.length} rate(s) from ${options.filename} as DRAFT v${table.version}`,
    after: { rateTableId: table.id, accepted: rows.length, rejected: errors.length },
  });

  return {
    rateTableId: table.id,
    importId: imported.id,
    status: 'draft',
    accepted: rows.length,
    rejected: errors.length,
    errors,
  };
}

/**
 * Publishes a draft rate table. The previously published table for the same
 * product/state/benefit is archived rather than deleted, so history survives.
 */
export async function publishRateTable(db: Db, rateTableId: number, actor: AuditActor | null) {
  const [table] = await db
    .select()
    .from(schema.rateTables)
    .where(eq(schema.rateTables.id, rateTableId))
    .limit(1);
  if (!table) throw new Error(`Rate table ${rateTableId} not found.`);

  const siblings = await db
    .select()
    .from(schema.rateTables)
    .where(eq(schema.rateTables.productId, table.productId));

  for (const sibling of siblings) {
    if (
      sibling.id !== table.id &&
      sibling.status === 'published' &&
      sibling.benefitType === table.benefitType &&
      (sibling.stateCode ?? null) === (table.stateCode ?? null)
    ) {
      await db
        .update(schema.rateTables)
        .set({ status: 'archived' })
        .where(eq(schema.rateTables.id, sibling.id));
      await recordAudit(db, {
        actor,
        action: 'rate_table.archive',
        entityType: 'rate_table',
        entityId: sibling.id,
        entityVersion: sibling.version,
        summary: `Archived v${sibling.version}, superseded by v${table.version}`,
      });
    }
  }

  const [published] = await db
    .update(schema.rateTables)
    .set({ status: 'published', publishedAt: new Date() })
    .where(eq(schema.rateTables.id, rateTableId))
    .returning();

  await db
    .update(schema.rateImports)
    .set({ status: 'published' })
    .where(eq(schema.rateImports.rateTableId, rateTableId));

  await recordAudit(db, {
    actor,
    action: 'rate_table.publish',
    entityType: 'rate_table',
    entityId: rateTableId,
    entityVersion: published.version,
    summary: `Published rate table v${published.version}`,
    before: table,
    after: published,
  });

  return published;
}
