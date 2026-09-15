import { getDb } from '@/db/client';
import { fail, ok, route } from '@/lib/api';
import { loadActiveQuestions } from '@/modules/catalog/repository';
import { healthAnswersSchema } from '@/modules/intake/validation';
import { getQuoteSession, saveHealthAnswers } from '@/modules/quote/service';
import { interviewProgress, type AnswerMap } from '@/modules/questionnaire';

type Params = { params: Promise<{ id: string }> };

/**
 * Saves the health answers and returns the recomputed visible question set, so
 * follow-ups appear (and disappear) as soon as a gate answer changes.
 */
export const PUT = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const db = getDb();
  const session = await getQuoteSession(db, id);
  if (!session) return fail('That quote has expired. Start a new one.', 404);

  const answers = healthAnswersSchema.parse(await request.json());
  const updated = await saveHealthAnswers(db, id, answers as AnswerMap);

  const questions = await loadActiveQuestions(db);
  const saved = (updated.healthAnswers ?? {}) as AnswerMap;

  return ok({
    questions,
    answers: saved,
    progress: interviewProgress(questions, saved),
  });
});
