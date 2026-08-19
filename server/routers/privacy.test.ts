import { describe, expect, it } from "vitest";
import { normalizeDeletionStatus } from "./privacy";

describe("privacy deletion status contract", () => {
  it("returns null rather than undefined when no deletion request exists", () => {
    expect(normalizeDeletionStatus(undefined)).toBeNull();
    expect(normalizeDeletionStatus(null)).toBeNull();
  });

  it("preserves a retrieved deletion request", () => {
    const request = { id: "request", status: "pending" };
    expect(normalizeDeletionStatus(request)).toEqual(request);
  });
});
