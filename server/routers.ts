import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { draftsRouter } from "./routers/drafts";
import { emailAuthRouter } from "./routers/emailAuth";
import { generationRouter } from "./routers/generation";
import { paymentsRouter } from "./routers/payments";
import { preferencesRouter } from "./routers/preferences";
import { privacyRouter } from "./routers/privacy";
import { usageRouter } from "./routers/usage";
import { analyticsRouter } from "./routers/analytics";
import { promptLibraryRouter } from "./routers/promptLibrary";
import { documentsRouter } from "./routers/documents";

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
  emailAuth: emailAuthRouter,
  preferences: preferencesRouter,
  privacy: privacyRouter,
  usage: usageRouter,
  analytics: analyticsRouter,
  promptLibrary: promptLibraryRouter,
  documents: documentsRouter,
  drafts: draftsRouter,
  generation: generationRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
