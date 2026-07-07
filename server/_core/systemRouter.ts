import { publicProcedure, router } from "./trpc";

/** Basic system/health procedures. */
export const systemRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    time: new Date().toISOString(),
  })),
});
