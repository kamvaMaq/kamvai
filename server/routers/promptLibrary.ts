import { z } from "zod";
import { createUserPrompt, deleteUserPrompt, getPublicPrompt, getUserPromptShareAnalytics, getUserSharedPromptLeaderboard, listPromptLibrary, recordPublicPromptView, revokeUserPromptShare, setUserPromptTags, shareUserPrompt, togglePromptLibraryFavorite, updateUserPrompt } from "../db";
import { promptKinds, promptLocales } from "../promptLibrary";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

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
  tag: z.string().trim().min(2).max(32).optional(),
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
  setTags: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32), tags: z.array(z.string().trim().min(2).max(32)).max(8) })).mutation(async ({ ctx, input }) => setUserPromptTags(ctx.user.id, input.promptId, input.tags)),
  share: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => shareUserPrompt(ctx.user.id, input.promptId)),
  revokeShare: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => revokeUserPromptShare(ctx.user.id, input.promptId)),
  shareAnalytics: protectedProcedure.input(z.object({ promptId: z.string().min(1).max(32) })).query(({ ctx, input }) => getUserPromptShareAnalytics(ctx.user.id, input.promptId)),
  sharedLeaderboard: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(10).optional() }).optional()).query(({ ctx, input }) => getUserSharedPromptLeaderboard(ctx.user.id, input?.limit ?? 5)),
  public: publicProcedure.input(z.object({ slug: z.string().min(8).max(40) })).query(async ({ input }) => {
    const prompt = await getPublicPrompt(input.slug);
    if (!prompt) return null;
    await recordPublicPromptView(prompt.id);
    const { id: _id, ...publicPrompt } = prompt;
    return publicPrompt;
  }),
});
