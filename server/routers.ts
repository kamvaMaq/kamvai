import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { draftsRouter } from "./routers/drafts";
import { generationRouter } from "./routers/generation";
import { paymentsRouter } from "./routers/payments";
import { preferencesRouter } from "./routers/preferences";
import { usageRouter } from "./routers/usage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  preferences: preferencesRouter,
  usage: usageRouter,
  drafts: draftsRouter,
  generation: generationRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
