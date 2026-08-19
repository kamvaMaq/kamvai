import { describe, expect, it } from "vitest";
import { getPayShapInstructions } from "./payShap";

describe("PayShap payment instructions", () => {
  it("withholds payment details when the merchant configuration is incomplete", () => {
    expect(getPayShapInstructions({ recipientName: "Kamvai" })).toMatchObject({
      paymentInstructionsConfigured: false,
      recipientName: null,
      shapId: null,
    });
  });

  it("returns the configured recipient details while preserving pending-only access guidance", () => {
    const details = getPayShapInstructions({ recipientName: "Kamvai", shapId: "+27-000000000@BANK" });
    expect(details).toMatchObject({
      paymentInstructionsConfigured: true,
      recipientName: "Kamvai",
      shapId: "+27-000000000@BANK",
    });
    expect(details.message).toContain("never unlocks access");
  });
});
