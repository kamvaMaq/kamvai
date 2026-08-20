import { describe, expect, it } from "vitest";
import { filterPromptTemplates, togglePromptFavouriteIds } from "./promptLibrary";

describe("smart prompt library", () => {
  it("filters curated templates by content kind", () => {
    const codeTemplates = filterPromptTemplates({ kind: "code" });
    expect(codeTemplates).toHaveLength(4);
    expect(codeTemplates.every(template => template.kind === "code")).toBe(true);
  });

  it("returns the complete localized starter collection for isiZulu and isiXhosa", () => {
    expect(filterPromptTemplates({ locale: "zu" })).toHaveLength(16);
    expect(filterPromptTemplates({ locale: "xh" })).toHaveLength(16);
    expect(filterPromptTemplates({ locale: "zu" }).map(template => template.id)).toContain("blog-founder-story-zu");
    expect(filterPromptTemplates({ locale: "xh" }).map(template => template.id)).toContain("blog-founder-story-xh");
  });

  it("finds templates across title, category, and prompt text", () => {
    expect(filterPromptTemplates({ query: "dashboard" }).map(template => template.id)).toContain("code-dashboard-feature");
    expect(filterPromptTemplates({ query: "visuals" }).every(template => template.category === "Visuals")).toBe(true);
  });

  it("adds and removes a user-scoped prompt favourite without changing other ids", () => {
    const saved = togglePromptFavouriteIds(new Set(["email-client-update"]), "blog-market-insight");
    expect(saved.isFavorite).toBe(true);
    expect([...saved.ids]).toEqual(["email-client-update", "blog-market-insight"]);

    const removed = togglePromptFavouriteIds(saved.ids, "blog-market-insight");
    expect(removed.isFavorite).toBe(false);
    expect([...removed.ids]).toEqual(["email-client-update"]);
  });
});
