import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { previewSchema } from '@/modules/admin/schemas';
import { requireAdmin } from '@/modules/auth';
import { loadActiveQuestions, loadQuoteCatalog } from '@/modules/catalog/repository';
import { runSuperQuote } from '@/modules/engine';
import { extractFacts, type AnswerMap } from '@/modules/questionnaire';
import { today } from '@/modules/quote/service';

/**
 * Preview: runs the engine without creating a quote session, optionally
 * including inactive carriers and products so an administrator can see exactly
 * what a configuration change will do before publishing it.
 */
export const POST = route(async (request: Request) => {
  await requireAdmin();
  const body = previewSchema.parse(await request.json());
  const db = getDb();
  const asOf = body.asOf ?? today();

  const intake = {
    stateCode: body.stateCode,
    age: body.age,
    ageNearestBirthday: body.ageNearestBirthday ?? null,
    sex: body.sex,
    tobaccoUse: body.tobaccoUse,
    faceAmount: body.faceAmount,
    monthlyBudget: body.monthlyBudget ?? null,
  };

  const questions = await loadActiveQuestions(db);
  const facts = extractFacts(questions, body.answers as AnswerMap);
  const bundles = await loadQuoteCatalog(db, {
    stateCode: intake.stateCode,
    age: intake.age,
    ageNearestBirthday: intake.ageNearestBirthday ?? null,
    faceAmount: intake.faceAmount,
    asOf,
    includeInactive: body.includeInactive,
    // The admin preview exists to inspect everything the platform holds,
    // including the demo carrier, which the agent-facing quote never sees.
    includeFictionalSample: true,
  });

  return ok({ quote: runSuperQuote({ intake, facts, bundles, asOf }), facts });
});
