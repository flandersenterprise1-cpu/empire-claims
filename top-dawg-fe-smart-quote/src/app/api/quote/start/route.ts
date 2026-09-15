import { getDb } from '@/db/client';
import { ok, route } from '@/lib/api';
import { clientBasicsSchema } from '@/modules/intake/validation';
import { createQuoteSession } from '@/modules/quote/service';

/** Step 1 → creates an anonymous quote session. No identifying data is kept. */
export const POST = route(async (request: Request) => {
  const basics = clientBasicsSchema.parse(await request.json());
  const session = await createQuoteSession(getDb(), basics);
  return ok(
    {
      quoteSessionId: session.id,
      stateCode: session.stateCode,
      age: session.age,
      sex: session.sex,
      tobaccoUse: session.tobaccoUse,
      faceAmount: session.faceAmount,
      monthlyBudget: session.monthlyBudget,
    },
    201,
  );
});
