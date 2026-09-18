import { getDb } from '@/db/client';
import { fail, ok, route } from '@/lib/api';
import { loadActiveQuestions } from '@/modules/catalog/repository';
import { getQuoteSession } from '@/modules/quote/service';
import { interviewProgress, type AnswerMap } from '@/modules/questionnaire';

type Params = { params: Promise<{ id: string }> };

/**
 * Returns the whole active question set plus the saved answers. The client
 * computes visibility with the same pure `visibleQuestions` module the server
 * uses, so branching is instant on screen and identical on both sides.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const db = getDb();
  const session = await getQuoteSession(db, id);
  if (!session) return fail('That quote has expired. Start a new one.', 404);

  const questions = await loadActiveQuestions(db);
  const answers = (session.healthAnswers ?? {}) as AnswerMap;

  return ok({
    questions,
    answers,
    progress: interviewProgress(questions, answers),
  });
});
