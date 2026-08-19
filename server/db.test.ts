import { describe, expect, it } from "vitest";
import { calculateUsageAllowance, generationEligibility, maskVoucherCode } from "./db";

describe("privacy-safe voucher handling", () => {
  it("masks all but the final four voucher characters", () => {
    const rawCode = "KZNG 4098 7721";
    const masked = maskVoucherCode(rawCode);
    expect(masked).toBe("•••• 7721");
    expect(masked).not.toContain("4098");
    expect(masked).not.toContain(rawCode);
  });
});

describe("rolling generation allowance", () => {
  it("enforces the free limit and resets 24 hours after the oldest counted generation", () => {
    const oldest = new Date("2026-08-19T08:00:00.000Z");
    const status = calculateUsageAllowance({
      used: 5,
      oldestGenerationAt: oldest,
      now: new Date("2026-08-19T12:00:00.000Z"),
    });
    expect(status.remaining).toBe(0);
    expect(status.resetsAt?.toISOString()).toBe("2026-08-20T08:00:00.000Z");
  });

  it("marks active passes as unlimited without exposing a free cap", () => {
    expect(calculateUsageAllowance({ used: 5, unlimited: true, plan: "monthly" })).toMatchObject({ unlimited: true, remaining: null, plan: "monthly" });
  });
});

describe("privacy-aware generation eligibility", () => {
  it("requires explicit privacy consent before server-side generation", () => {
    expect(generationEligibility({ privacyConsentAt: null, allowance: { unlimited: false, remaining: 5 } })).toEqual({ allowed: false, reason: "privacy_consent_required" });
  });

  it("blocks a free user when the rolling allowance is exhausted", () => {
    expect(generationEligibility({ privacyConsentAt: new Date(), allowance: { unlimited: false, remaining: 0 } })).toEqual({ allowed: false, reason: "allowance_exhausted" });
  });
});
