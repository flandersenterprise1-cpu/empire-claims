/**
 * Server-side validation for Step 1 (client basics).
 *
 * Deliberately minimal: state, age, sex, tobacco, coverage, optional budget.
 * No name, SSN, banking, beneficiary or contact details are accepted — if a
 * client sends them they are dropped rather than stored.
 */
import { z } from 'zod';
import {
  COVERAGE_STEP,
  MAX_AGE,
  MAX_COVERAGE,
  MIN_AGE,
  MIN_COVERAGE,
  STATE_CODES,
} from '@/lib/constants';

export const stateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => (STATE_CODES as readonly string[]).includes(v), {
    message: 'Select a valid US state.',
  });

/** Age nearest birthday is carrier-specific; the MVP uses actual age. */
export function ageFromDateOfBirth(dob: string, asOf: Date = new Date()): number {
  const birth = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) throw new Error('Invalid date of birth.');
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export const clientBasicsSchema = z
  .object({
    stateCode: stateCodeSchema,
    /**
     * Either an explicit age or a date of birth. The date of birth is used to
     * compute the age and is then discarded — it is never persisted.
     */
    age: z.coerce.number().int().min(MIN_AGE).max(MAX_AGE).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
      .optional(),
    sex: z.enum(['male', 'female']),
    tobaccoUse: z.boolean(),
    faceAmount: z.coerce
      .number()
      .int()
      .min(MIN_COVERAGE, `Coverage starts at $${MIN_COVERAGE.toLocaleString()}.`)
      .max(MAX_COVERAGE, `Coverage tops out at $${MAX_COVERAGE.toLocaleString()}.`)
      .refine((v) => v % COVERAGE_STEP === 0, {
        message: `Enter coverage in $${COVERAGE_STEP.toLocaleString()} increments.`,
      }),
    monthlyBudget: z.coerce.number().positive().max(10_000).nullish(),
  })
  .refine((data) => data.age != null || data.dateOfBirth != null, {
    message: 'Enter either an age or a date of birth.',
    path: ['age'],
  })
  .transform((data) => {
    const age = data.age ?? ageFromDateOfBirth(data.dateOfBirth!);
    return {
      stateCode: data.stateCode,
      age,
      sex: data.sex,
      tobaccoUse: data.tobaccoUse,
      faceAmount: data.faceAmount,
      monthlyBudget: data.monthlyBudget ?? null,
    };
  })
  .refine((data) => data.age >= MIN_AGE && data.age <= MAX_AGE, {
    message: `Age must be between ${MIN_AGE} and ${MAX_AGE}.`,
    path: ['dateOfBirth'],
  });

export type ClientBasics = z.infer<typeof clientBasicsSchema>;

/** Health answers are free-form per question type; shape is checked per answer. */
export const healthAnswersSchema = z.record(z.string().min(1).max(80), z.unknown());

export const saveAnswersSchema = z.object({
  quoteSessionId: z.string().min(8).max(32),
  answers: healthAnswersSchema,
});
