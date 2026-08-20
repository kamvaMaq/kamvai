import { getContributionAnalytics } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  summary: protectedProcedure.query(({ ctx }) => getContributionAnalytics(ctx.user.id)),
});
