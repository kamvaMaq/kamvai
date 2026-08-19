import { z } from "zod";
import { getDraftForUser, listDraftsForUser, listRevisions, publishDraft } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const draftsRouter = router({
  list: protectedProcedure.query(({ ctx }) => listDraftsForUser(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const draft = await getDraftForUser(input.id, ctx.user.id);
    if (!draft) return null;
    return { draft, revisions: await listRevisions(input.id) };
  }),
  publish: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const slug = await publishDraft(input.id, ctx.user.id);
    if (!slug) throw new Error("Draft not found");
    return { slug };
  }),
});
