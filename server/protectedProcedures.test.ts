import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as unknown as TrpcContext;

describe("protected Kamvai procedures", () => {
  it("does not expose draft, payment, or preference operations without an authenticated user", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.drafts.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.payments.attempts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.preferences.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
