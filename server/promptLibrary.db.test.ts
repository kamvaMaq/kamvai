import { describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { getDb, listPromptLibrary, togglePromptLibraryFavorite } from "./db";

describe("Prompt Library database integration", () => {
  it("seeds searchable prompts and persists a favourite only for the active user", async () => {
    const db = await getDb();
    if (!db) return;
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    if (!user) return;

    const matchingPrompts = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
    expect(matchingPrompts.map(prompt => prompt.id)).toContain("code-dashboard-feature");
    expect(matchingPrompts.every(prompt => prompt.kind === "code")).toBe(true);

    const promptId = "code-dashboard-feature";
    const original = matchingPrompts.find(prompt => prompt.id === promptId)?.isFavorite ?? false;
    if (original) await togglePromptLibraryFavorite(user.id, promptId);

    try {
      await expect(togglePromptLibraryFavorite(user.id, promptId)).resolves.toEqual({ isFavorite: true });
      const savedForUser = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
      expect(savedForUser.find(prompt => prompt.id === promptId)?.isFavorite).toBe(true);

      const otherUserView = await listPromptLibrary(user.id + 1_000_000, { query: "dashboard", kind: "code" });
      expect(otherUserView.find(prompt => prompt.id === promptId)?.isFavorite).toBe(false);

      await expect(togglePromptLibraryFavorite(user.id, promptId)).resolves.toEqual({ isFavorite: false });
      const removedForUser = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
      expect(removedForUser.find(prompt => prompt.id === promptId)?.isFavorite).toBe(false);
    } finally {
      const current = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
      const currentlyFavorite = current.find(prompt => prompt.id === promptId)?.isFavorite ?? false;
      if (currentlyFavorite !== original) await togglePromptLibraryFavorite(user.id, promptId);
    }
  });
});
