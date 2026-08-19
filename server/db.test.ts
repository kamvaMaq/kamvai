import { describe, expect, it } from "vitest";
import { calculateUsageAllowance, createPayShapReference, generationEligibility, maskVoucherCode, normalizeDatabaseTimestamp } from "./db";

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

  it("accepts MySQL string timestamps when calculating the rolling reset", () => {
    const allowance = calculateUsageAllowance({
      used: 1,
      oldestGenerationAt: "2026-08-19T12:00:00.000Z",
      now: new Date("2026-08-19T13:00:00.000Z"),
    });
    expect(allowance.resetsAt).toEqual(new Date("2026-08-20T12:00:00.000Z"));
    expect(normalizeDatabaseTimestamp("not-a-date")).toBeNull();
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

describe("manual PayShap request references", () => {
  it("generates concise, non-sequential references suitable for payment reconciliation", () => {
    const reference = createPayShapReference();
    expect(reference).toMatch(/^KAM-[A-Z0-9_-]{10}$/);
    expect(createPayShapReference()).not.toBe(reference);
  });
});
