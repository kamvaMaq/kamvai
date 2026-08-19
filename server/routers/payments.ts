import { z } from "zod";
import { createPayShapPaymentRequest, createVoucherAttempt, listOpenPayShapRequests, listPayShapRequestsForUser, listVoucherAttemptsForUser, reconcilePayShapRequest } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getPayShapInstructions } from "../payShap";

const planSchema = z.enum(["weekly", "monthly"]);
const voucherSchema = z.enum(["kazang", "oneforyou", "blue", "ott"]);

export const paymentsRouter = router({
  plans: protectedProcedure.query(() => ([
    { id: "weekly", name: "Weekly pass", priceZar: 50, days: 7 },
    { id: "monthly", name: "Monthly pass", priceZar: 150, days: 30 },
  ])),
  attempts: protectedProcedure.query(({ ctx }) => listVoucherAttemptsForUser(ctx.user.id)),
  payShapRequests: protectedProcedure.query(({ ctx }) => listPayShapRequestsForUser(ctx.user.id)),
  requestPayShap: protectedProcedure.input(z.object({ plan: planSchema })).mutation(async ({ ctx, input }) => {
    const request = await createPayShapPaymentRequest({ userId: ctx.user.id, plan: input.plan });
    return {
      request,
      ...getPayShapInstructions({ recipientName: process.env.PAYSHAP_RECIPIENT_NAME, shapId: process.env.PAYSHAP_SHAP_ID }),
    };
  }),
  adminOpenPayShapRequests: adminProcedure.query(() => listOpenPayShapRequests()),
  reconcilePayShap: adminProcedure.input(z.object({ requestId: z.string().min(1), outcome: z.enum(["confirmed", "rejected"]), note: z.string().max(280).optional() })).mutation(({ ctx, input }) => reconcilePayShapRequest({ ...input, adminUserId: ctx.user.id })),
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
