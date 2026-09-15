/**
 * Anonymous quote sessions.
 *
 * A session is identified only by a random ID. It stores the handful of
 * attributes the engines need and nothing else — no name, SSN, banking,
 * beneficiary or contact information — and it expires automatically.
 */
import { eq, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@/db/schema';
import { loadActiveQuestions, loadQuoteCatalog, type Db } from '@/modules/catalog/repository';
import { ENGINE_VERSION, runSuperQuote } from '@/modules/engine';
import type { ClientIntake, SuperQuote } from '@/modules/engine/types';
import { extractFacts, interviewProgress, visibleQuestions, type AnswerMap } from '@/modules/questionnaire';
import type { ClientBasics } from '@/modules/intake/validation';

export type QuoteSessionRow = typeof schema.quoteSessions.$inferSelect;

function retentionDays(): number {
  const raw = Number(process.env.QUOTE_RETENTION_DAYS ?? 30);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

function expiryDate(): Date {
  return new Date(Date.now() + retentionDays() * 24 * 3600 * 1000);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createQuoteSession(db: Db, basics: ClientBasics): Promise<QuoteSessionRow> {
  const [row] = await db
    .insert(schema.quoteSessions)
    .values({
      id: nanoid(21),
      stateCode: basics.stateCode,
      age: basics.age,
      sex: basics.sex,
      tobaccoUse: basics.tobaccoUse,
      faceAmount: basics.faceAmount,
      monthlyBudget: basics.monthlyBudget == null ? null : String(basics.monthlyBudget),
      healthAnswers: {},
      step: 2,
      expiresAt: expiryDate(),
    })
    .returning();
  return row;
}

export async function getQuoteSession(db: Db, id: string): Promise<QuoteSessionRow | null> {
  const [row] = await db
    .select()
    .from(schema.quoteSessions)
    .where(eq(schema.quoteSessions.id, id))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function updateQuoteBasics(
  db: Db,
  id: string,
  basics: ClientBasics,
): Promise<QuoteSessionRow> {
  const [row] = await db
    .update(schema.quoteSessions)
    .set({
      stateCode: basics.stateCode,
      age: basics.age,
      sex: basics.sex,
      tobaccoUse: basics.tobaccoUse,
      faceAmount: basics.faceAmount,
      monthlyBudget: basics.monthlyBudget == null ? null : String(basics.monthlyBudget),
      updatedAt: new Date(),
      expiresAt: expiryDate(),
    })
    .where(eq(schema.quoteSessions.id, id))
    .returning();
  return row;
}

export async function saveHealthAnswers(
  db: Db,
  id: string,
  answers: AnswerMap,
): Promise<QuoteSessionRow> {
  const questions = await loadActiveQuestions(db);
  const known = new Set(questions.map((q) => q.code));

  // Drop anything that is not a known question code: the quote flow must never
  // become a general-purpose store for client data.
  const filtered: AnswerMap = {};
  for (const [code, value] of Object.entries(answers)) {
    if (known.has(code)) filtered[code] = value;
  }

  // Answers whose question is no longer visible are discarded so a corrected
  // "no" cannot leave orphaned follow-up data behind.
  const visible = new Set(visibleQuestions(questions, filtered).map((q) => q.code));
  const pruned: AnswerMap = {};
  for (const [code, value] of Object.entries(filtered)) {
    if (visible.has(code)) pruned[code] = value;
  }

  const [row] = await db
    .update(schema.quoteSessions)
    .set({ healthAnswers: pruned, step: 3, updatedAt: new Date(), expiresAt: expiryDate() })
    .where(eq(schema.quoteSessions.id, id))
    .returning();
  return row;
}

export function intakeFromSession(session: QuoteSessionRow): ClientIntake {
  if (
    session.stateCode == null ||
    session.age == null ||
    session.sex == null ||
    session.tobaccoUse == null ||
    session.faceAmount == null
  ) {
    throw new Error('This quote is missing Step 1 details. Start again from client basics.');
  }
  return {
    stateCode: session.stateCode,
    age: session.age,
    sex: session.sex === 'unisex' ? 'male' : session.sex,
    tobaccoUse: session.tobaccoUse,
    faceAmount: session.faceAmount,
    monthlyBudget: session.monthlyBudget == null ? null : Number(session.monthlyBudget),
  };
}

export interface SuperQuoteOutcome {
  quote: SuperQuote;
  interview: ReturnType<typeof interviewProgress>;
}

export async function generateSuperQuote(
  db: Db,
  session: QuoteSessionRow,
  options: { persist?: boolean; includeInactive?: boolean; asOf?: string } = {},
): Promise<SuperQuoteOutcome> {
  const asOf = options.asOf ?? today();
  const intake = intakeFromSession(session);
  const questions = await loadActiveQuestions(db);
  const answers = (session.healthAnswers ?? {}) as AnswerMap;

  const facts = extractFacts(questions, answers);
  const interview = interviewProgress(questions, answers);

  const bundles = await loadQuoteCatalog(db, {
    stateCode: intake.stateCode,
    age: intake.age,
    faceAmount: intake.faceAmount,
    asOf,
    includeInactive: options.includeInactive ?? false,
  });

  const quote = runSuperQuote({ intake, facts, bundles, asOf });

  if (!interview.complete) {
    quote.notices.unshift(
      `${interview.requiredOutstanding.length} health question(s) are still unanswered, so some products can only be returned as "Requires underwriting verification".`,
    );
  }

  if (options.persist !== false) {
    await db.insert(schema.quoteResults).values({
      quoteSessionId: session.id,
      engineVersion: ENGINE_VERSION,
      payload: quote as never,
    });
  }

  return { quote, interview };
}

/** Deletes expired quote sessions (and their results, by cascade). */
export async function purgeExpiredQuoteSessions(db: Db): Promise<number> {
  const deleted = await db
    .delete(schema.quoteSessions)
    .where(lt(schema.quoteSessions.expiresAt, new Date()))
    .returning({ id: schema.quoteSessions.id });
  return deleted.length;
}
