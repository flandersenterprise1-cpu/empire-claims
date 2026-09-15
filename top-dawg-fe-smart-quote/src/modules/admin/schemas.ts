/** Server-side validation for every administrative mutation. */
import { z } from 'zod';
import { STATE_CODES } from '@/lib/constants';

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Use lower-case letters, numbers and hyphens only.');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
const stateCode = z.enum(STATE_CODES as unknown as [string, ...string[]]);

export const benefitType = z.enum(['level', 'graded', 'modified', 'guaranteed_issue']);
export const ruleResult = z.enum([
  'decline',
  'level',
  'graded',
  'modified',
  'guaranteed_issue',
  'refer',
  'allow',
]);
export const ruleLifecycle = z.enum(['draft', 'verified', 'expired', 'archived']);

export const carrierCreateSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(160),
  agentPortalUrl: z.string().trim().url().max(500).nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

export const carrierUpdateSchema = carrierCreateSchema.partial().omit({ slug: true });

export const documentCreateSchema = z.object({
  carrierId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  docType: z.string().trim().min(2).max(60).default('underwriting_guide'),
  reference: z.string().trim().max(1000).nullish(),
  documentDate: isoDate.nullish(),
  effectiveDate: isoDate.nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

export const productCreateSchema = z.object({
  carrierId: z.coerce.number().int().positive(),
  slug,
  name: z.string().trim().min(2).max(160),
  benefitType,
  minFaceAmount: z.coerce.number().int().min(1000).max(100_000),
  maxFaceAmount: z.coerce.number().int().min(1000).max(100_000),
  faceIncrement: z.coerce.number().int().min(1).max(25_000),
  minAge: z.coerce.number().int().min(0).max(120),
  maxAge: z.coerce.number().int().min(0).max(120),
  tobaccoClasses: z.array(z.enum(['tobacco', 'non_tobacco', 'unismoke'])).min(1),
  sexClasses: z.array(z.enum(['male', 'female', 'unisex'])).min(1),
  waitingPeriodMonths: z.coerce.number().int().min(0).max(120).default(0),
  simplicityScore: z.coerce.number().int().min(1).max(5).default(3),
  rateMethodology: z.enum(['exact_only', 'per_thousand']).default('exact_only'),
  allowInterpolation: z.boolean().default(false),
  applicationUrl: z.string().trim().url().max(500).nullish(),
  eApplicationUrl: z.string().trim().url().max(500).nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .omit({ carrierId: true, slug: true });

export const productStatesSchema = z.object({
  states: z
    .array(
      z.object({
        stateCode,
        isAvailable: z.boolean(),
        effectiveDate: isoDate.nullish(),
        endDate: isoDate.nullish(),
      }),
    )
    .max(60),
});

export const faceLimitSchema = z.object({
  minAge: z.coerce.number().int().min(0).max(120),
  maxAge: z.coerce.number().int().min(0).max(120),
  minFaceAmount: z.coerce.number().int().min(0),
  maxFaceAmount: z.coerce.number().int().min(0),
  stateCode: stateCode.nullish(),
  notes: z.string().trim().max(500).nullish(),
});

/** A criteria tree. Shape is checked; values stay free-form. */
const criterion: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.object({
      fact: z.string().min(1).max(120),
      op: z.enum([
        'eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte',
        'exists', 'not_exists', 'contains_any', 'contains_none',
      ]),
      value: z.unknown().optional(),
    }),
    criteriaGroup,
  ]),
);

const criteriaGroup: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    all: z.array(criterion).optional(),
    any: z.array(criterion).optional(),
    none: z.array(criterion).optional(),
  }),
);

export const criteriaSchema = criteriaGroup.nullable();

export const ruleCreateSchema = z.object({
  carrierId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive().nullish(),
  stateCode: stateCode.nullish(),
  ruleCategory: z.string().trim().min(2).max(80),
  conditionCode: z.string().trim().min(2).max(80),
  treatment: z.string().trim().max(120).nullish(),
  lookbackMonths: z.coerce.number().int().min(0).max(1200).nullish(),
  criteria: criteriaSchema,
  result: ruleResult,
  benefitClassification: benefitType.nullish(),
  explanation: z.string().trim().min(10).max(2000),
  underwritingConcern: z.string().trim().max(2000).nullish(),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  sourceDocumentId: z.coerce.number().int().positive().nullish(),
  sourcePage: z.string().trim().max(40).nullish(),
  effectiveDate: isoDate,
  expirationDate: isoDate.nullish(),
});

export const ruleUpdateSchema = ruleCreateSchema.partial().omit({ carrierId: true });

export const medicationRuleCreateSchema = z.object({
  carrierId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive().nullish(),
  medicationName: z.string().trim().toLowerCase().min(2).max(160),
  impliesConditionCode: z.string().trim().max(80).nullish(),
  result: ruleResult,
  benefitClassification: benefitType.nullish(),
  explanation: z.string().trim().min(10).max(2000),
  sourceDocumentId: z.coerce.number().int().positive().nullish(),
  sourcePage: z.string().trim().max(40).nullish(),
  effectiveDate: isoDate,
  expirationDate: isoDate.nullish(),
});

export const questionCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_]+$/, 'Use lower-case letters, numbers and underscores.'),
  category: z.string().trim().min(2).max(80),
  prompt: z.string().trim().min(5).max(1000),
  helpText: z.string().trim().max(1000).nullish(),
  answerType: z.enum([
    'boolean', 'single_select', 'multi_select', 'integer',
    'decimal', 'months_ago', 'text', 'height_weight', 'medication_list',
  ]),
  options: z
    .array(z.object({ value: z.string().min(1).max(80), label: z.string().min(1).max(160) }))
    .nullish(),
  isRequired: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
  isActive: z.boolean().default(true),
  parentQuestionId: z.coerce.number().int().positive().nullish(),
  showWhen: criteriaSchema,
  factPath: z.string().trim().max(120).nullish(),
});

export const questionUpdateSchema = questionCreateSchema.partial().omit({ code: true });

export const rateImportSchema = z.object({
  csv: z.string().min(10).max(8_000_000),
  filename: z.string().trim().min(1).max(255),
  benefitType,
  stateCode: stateCode.nullish(),
  effectiveDate: isoDate,
  endDate: isoDate.nullish(),
  monthlyPolicyFee: z.coerce.number().min(0).max(500).default(0),
  sourceDocumentId: z.coerce.number().int().positive().nullish(),
  sourcePage: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const previewSchema = z.object({
  stateCode,
  age: z.coerce.number().int().min(0).max(120),
  sex: z.enum(['male', 'female']),
  tobaccoUse: z.boolean(),
  faceAmount: z.coerce.number().int().min(1000).max(100_000),
  monthlyBudget: z.coerce.number().positive().nullish(),
  answers: z.record(z.string(), z.unknown()).default({}),
  includeInactive: z.boolean().default(true),
  asOf: isoDate.optional(),
});

export const activationSchema = z.object({ status: z.enum(['active', 'inactive']) });
export const ruleStatusSchema = z.object({ status: ruleLifecycle });
export const rollbackSchema = z.object({ version: z.coerce.number().int().positive() });
