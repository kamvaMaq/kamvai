import { describe, expect, it } from "vitest";
import { calculateDocumentUploadAllowance } from "./db";

describe("document upload allowance", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("allows three uploads in a rolling 24-hour window", () => {
    expect(calculateDocumentUploadAllowance({ used: 0, now })).toMatchObject({ limit: 3, used: 0, remaining: 3, resetsAt: now });
    expect(calculateDocumentUploadAllowance({ used: 2, oldestUploadAt: "2026-08-20T10:00:00.000Z", now })).toMatchObject({ limit: 3, used: 2, remaining: 1, resetsAt: new Date("2026-08-21T10:00:00.000Z") });
  });

  it("blocks a fourth upload and preserves the rolling reset time", () => {
    expect(calculateDocumentUploadAllowance({ used: 3, oldestUploadAt: "2026-08-19T18:00:00.000Z", now })).toMatchObject({ limit: 3, used: 3, remaining: 0, resetsAt: new Date("2026-08-20T18:00:00.000Z") });
  });
});
