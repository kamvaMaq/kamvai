import { describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { createUserPrompt, deleteUserPrompt, getDb, getPublicPrompt, listPromptLibrary, revokeUserPromptShare, setUserPromptTags, shareUserPrompt, togglePromptLibraryFavorite, updateUserPrompt } from "./db";

describe("Prompt Library database integration", () => {
  it("seeds searchable prompts and persists a favourite only for the active user", async () => {
    const db = await getDb();
    if (!db) return;
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    if (!user) return;

    const matchingPrompts = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
    expect(matchingPrompts.map(prompt => prompt.id)).toContain("code-dashboard-feature");
    expect(matchingPrompts.every(prompt => prompt.kind === "code")).toBe(true);

    const isiZuluPrompts = await listPromptLibrary(user.id, { locale: "zu", kind: "email" });
    expect(isiZuluPrompts.map(prompt => prompt.id)).toContain("email-welcome-series-zu");
    const isiXhosaPrompts = await listPromptLibrary(user.id, { locale: "xh", kind: "image" });
    expect(isiXhosaPrompts.map(prompt => prompt.id)).toContain("image-social-series-xh");

    const promptId = "code-dashboard-feature";
    const original = matchingPrompts.find(prompt => prompt.id === promptId)?.isFavorite ?? false;
    if (original) await togglePromptLibraryFavorite(user.id, promptId);

    try {
      await expect(togglePromptLibraryFavorite(user.id, promptId)).resolves.toEqual({ isFavorite: true });
      const savedForUser = await listPromptLibrary(user.id, { query: "dashboard", kind: "code" });
      expect(savedForUser.find(prompt => prompt.id === promptId)?.isFavorite).toBe(true);
      const favoritesOnly = await listPromptLibrary(user.id, { query: "dashboard", kind: "code", favoritesOnly: true });
      expect(favoritesOnly.map(prompt => prompt.id)).toEqual([promptId]);

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

  it("allows only the owner to create, update, list, and remove a custom prompt", async () => {
    const db = await getDb();
    if (!db) return;
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    if (!user) return;

    const created = await createUserPrompt(user.id, { title: "Campaign callout", category: "Marketing", kind: "email", body: "Draft a short launch email for [AUDIENCE] about [OFFER]." });
    try {
      const library = await listPromptLibrary(user.id, { query: "Campaign callout" });
      expect(library.find(prompt => prompt.id === created.id)).toMatchObject({ isOwned: true, title: "Campaign callout" });
      await expect(setUserPromptTags(user.id, created.id, ["Sales", "Launch", "sales"])).resolves.toEqual({ tags: ["sales", "launch"] });
      const taggedLibrary = await listPromptLibrary(user.id, { tag: "sales" });
      expect(taggedLibrary.find(prompt => prompt.id === created.id)?.tags).toEqual(expect.arrayContaining(["sales", "launch"]));
      await expect(setUserPromptTags(user.id + 1_000_000, created.id, ["private"])).rejects.toThrow("not available to you");
      await expect(shareUserPrompt(user.id + 1_000_000, created.id)).rejects.toThrow("not available to you");
      await expect(revokeUserPromptShare(user.id + 1_000_000, created.id)).rejects.toThrow("not available to you");
      const shared = await shareUserPrompt(user.id, created.id);
      await expect(getPublicPrompt(shared.slug)).resolves.toMatchObject({ title: "Campaign callout", kind: "email" });
      await expect(revokeUserPromptShare(user.id, created.id)).resolves.toEqual({ success: true });
      await expect(getPublicPrompt(shared.slug)).resolves.toBeNull();
      await expect(updateUserPrompt(user.id, created.id, { title: "Campaign follow-up", category: "Marketing", kind: "email", body: "Draft a concise follow-up email for [AUDIENCE]." })).resolves.toMatchObject({ title: "Campaign follow-up" });
      await expect(updateUserPrompt(user.id + 1_000_000, created.id, { title: "Not allowed", category: "Marketing", kind: "email", body: "This cannot be saved by another user." })).rejects.toThrow("not available for editing");
      await expect(deleteUserPrompt(user.id + 1_000_000, created.id)).rejects.toThrow("not available for removal");
      await expect(deleteUserPrompt(user.id, created.id)).resolves.toEqual({ success: true });
    } finally {
      const remaining = await listPromptLibrary(user.id, { query: "Campaign" });
      if (remaining.some(prompt => prompt.id === created.id)) await deleteUserPrompt(user.id, created.id);
    }
  });
});
