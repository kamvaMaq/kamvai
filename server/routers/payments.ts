import { z } from "zod";
import { createVoucherAttempt, listVoucherAttemptsForUser } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const planSchema = z.enum(["weekly", "monthly"]);
const voucherSchema = z.enum(["kazang", "oneforyou", "blue", "ott"]);

export const paymentsRouter = router({
  plans: protectedProcedure.query(() => ([
    { id: "weekly", name: "Weekly pass", priceZar: 50, days: 7 },
    { id: "monthly", name: "Monthly pass", priceZar: 150, days: 30 },
  ])),
  attempts: protectedProcedure.query(({ ctx }) => listVoucherAttemptsForUser(ctx.user.id)),
  redeemVoucher: protectedProcedure.input(z.object({
    plan: planSchema,
    voucherBrand: voucherSchema,
    voucherCode: z.string().min(4).max(160),
  })).mutation(async ({ ctx, input }) => {
    const attempt = await createVoucherAttempt({
      userId: ctx.user.id,
      plan: input.plan,
      voucherBrand: input.voucherBrand,
      rawVoucherCode: input.voucherCode,
    });
    return {
      attempt,
      providerConfigured: false,
      message: "Your code has been safely masked and recorded. Activate a licensed payment-provider adapter before submitting it for redemption.",
    };
  }),
});
