import { z } from "zod";
import { createUserPrompt, deleteUserPrompt, listPromptLibrary, togglePromptLibraryFavorite, updateUserPrompt } from "../db";
import { promptKinds, promptLocales } from "../promptLibrary";
import { protectedProcedure, router } from "../_core/trpc";

const promptInput = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(6000),
  kind: z.enum(promptKinds),
  category: z.string().trim().min(2).max(64),
});
const listInput = z.object({
  query: z.string().trim().max(80).optional(),
  kind: z.enum(promptKinds).optional(),
  locale: z.enum(promptLocales).optional(),
  favoritesOnly: z.boolean().optional(),
}).default({});

export const promptLibraryRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    return listPromptLibrary(ctx.user.id, input);
  }),
  toggleFavorite: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => {
    return togglePromptLibraryFavorite(ctx.user.id, input.promptId);
  }),
  create: protectedProcedure.input(promptInput).mutation(async ({ ctx, input }) => createUserPrompt(ctx.user.id, input)),
  update: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32), ...promptInput.shape })).mutation(async ({ ctx, input }) => {
    const { promptId, ...data } = input;
    return updateUserPrompt(ctx.user.id, promptId, data);
  }),
  remove: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => deleteUserPrompt(ctx.user.id, input.promptId)),
});
