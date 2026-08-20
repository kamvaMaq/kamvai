import { z } from "zod";
import { getPreferencesForUser, updatePreferencesForUser } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const preferencesRouter = router({
  get: protectedProcedure.query(({ ctx }) => getPreferencesForUser(ctx.user.id)),
  save: protectedProcedure.input(z.object({
    theme: z.enum(["system", "light", "dark"]).optional(),
    locale: z.string().min(2).max(16).optional(),
    weeklyGenerationGoal: z.number().int().min(1).max(100).optional(),
    acceptPrivacy: z.boolean().optional(),
  })).mutation(({ ctx, input }) => updatePreferencesForUser(ctx.user.id, input)),
});
