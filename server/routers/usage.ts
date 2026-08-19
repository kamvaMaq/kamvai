import { getGenerationAllowance } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const usageRouter = router({
  status: protectedProcedure.query(({ ctx }) => getGenerationAllowance(ctx.user.id)),
});
