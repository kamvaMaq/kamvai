import { describe, expect, it } from "vitest";
import { createGenerationSystemPrompt } from "./generation";

describe("generation mode instructions", () => {
  it("uses a direct conversational assistant instruction for general chat", () => {
    const prompt = createGenerationSystemPrompt("chat", "isiZulu");
    expect(prompt).toContain("conversational assistant");
    expect(prompt).toContain("isiZulu");
    expect(prompt).toContain("question or help with their request");
  });

  it("makes video output an honest production plan rather than a rendered file", () => {
    const prompt = createGenerationSystemPrompt("video", "English");
    expect(prompt).toContain("production-ready video plan");
    expect(prompt).toContain("shot-by-shot plan");
    expect(prompt).toContain("Do not claim to have rendered a video file");
  });
});
