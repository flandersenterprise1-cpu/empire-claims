import { getDb } from '@/db/client';
import { fail, ok, route } from '@/lib/api';
import { generateSuperQuote, getQuoteSession } from '@/modules/quote/service';

type Params = { params: Promise<{ id: string }> };

/** Step 3 → runs the deterministic engine and returns the Super Quote. */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const db = getDb();
  const session = await getQuoteSession(db, id);
  if (!session) return fail('That quote has expired. Start a new one.', 404);

  const { quote, interview } = await generateSuperQuote(db, session);
  return ok({ quote, interview });
});
