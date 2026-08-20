import { z } from "zod";
import { createUserPrompt, listPromptLibrary, togglePromptLibraryFavorite } from "../db";
import { promptKinds } from "../promptLibrary";
import { protectedProcedure, router } from "../_core/trpc";

const listInput = z.object({ query: z.string().trim().max(80).optional(), kind: z.enum(promptKinds).optional() }).default({});

export const promptLibraryRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    return listPromptLibrary(ctx.user.id, input);
  }),
  toggleFavorite: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => {
    return togglePromptLibraryFavorite(ctx.user.id, input.promptId);
  }),
  create: protectedProcedure.input(z.object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(10).max(6000),
    kind: z.enum(promptKinds),
    category: z.string().trim().min(2).max(64),
  })).mutation(async ({ ctx, input }) => createUserPrompt(ctx.user.id, input)),
});
