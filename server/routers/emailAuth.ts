import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ONE_YEAR_MS, COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { authenticateEmailPassword, requestEmailOtp, verifyEmailOtp } from "../emailAuth";
import { router, publicProcedure } from "../_core/trpc";

function toError(error: unknown) { return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Email authentication failed." }); }
async function startSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => unknown } }, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

export const emailAuthRouter = router({
  requestSignupOtp: publicProcedure.input(z.object({
    email: z.string().email(), firstName: z.string().max(120).optional(), password: z.string().min(12).max(128),
  })).mutation(async ({ input }) => {
    try { return await requestEmailOtp({ ...input, supportLink: "https://kamvai.co.za/support" }); } catch (error) { throw toError(error); }
  }),
  verifySignupOtp: publicProcedure.input(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
    try { const user = await verifyEmailOtp(input); await startSession(ctx, user); return { user: { name: user.name, email: user.email } }; } catch (error) { throw toError(error); }
  }),
  login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    try { const user = await authenticateEmailPassword(input); await startSession(ctx, user); return { user: { name: user.name, email: user.email } }; } catch (error) { throw toError(error); }
  }),
});
