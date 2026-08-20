import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const authenticatedContext = {
  user: {
    id: 1,
    openId: "weekly-goal-test-user",
    email: "goal@example.com",
    name: "Goal Test",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as unknown as TrpcContext;

describe("preferences weeklyGenerationGoal validation", () => {
  it.each([0, -1, 101, 1.5])("rejects an out-of-range or non-integer goal of %s", async weeklyGenerationGoal => {
    const caller = appRouter.createCaller(authenticatedContext);
    await expect(caller.preferences.save({ weeklyGenerationGoal })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
