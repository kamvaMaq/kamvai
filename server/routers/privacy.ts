import { z } from "zod";
import { getAccountDeletionRequestForUser, listOpenAccountDeletionRequests, requestAccountDeletion, resolveAccountDeletionRequest } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

export function normalizeDeletionStatus<T>(request: T | undefined | null): T | null {
  return request ?? null;
}

export const privacyRouter = router({
  deletionStatus: protectedProcedure.query(async ({ ctx }) => normalizeDeletionStatus(await getAccountDeletionRequestForUser(ctx.user.id))),
  requestDeletion: protectedProcedure.mutation(({ ctx }) => requestAccountDeletion(ctx.user.id)),
  adminOpenDeletionRequests: adminProcedure.query(() => listOpenAccountDeletionRequests()),
  resolveDeletionRequest: adminProcedure.input(z.object({
    requestId: z.string().min(1),
    outcome: z.enum(["in_review", "completed", "declined"]),
    note: z.string().max(280).optional(),
  })).mutation(({ ctx, input }) => resolveAccountDeletionRequest({ ...input, adminUserId: ctx.user.id })),
});
