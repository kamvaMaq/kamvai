import { describe, expect, it } from "vitest";
import { createCodeStackInstruction } from "./codeStack";

describe("code stack instructions", () => {
  it("asks the model to select a suitable stack when none is selected", () => {
    expect(createCodeStackInstruction()).toContain("Choose a sensible");
  });

  it("carries the user-selected stack into a focused implementation instruction", () => {
    const instruction = createCodeStackInstruction("Next.js 15 + TypeScript + PostgreSQL");
    expect(instruction).toContain("Next.js 15 + TypeScript + PostgreSQL");
    expect(instruction).toContain("required dependencies");
  });
});
