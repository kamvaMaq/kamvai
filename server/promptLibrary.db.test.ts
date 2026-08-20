import { describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { createUserPrompt, deleteUserPrompt, getDb, getPublicPrompt, getUserPromptShareAnalytics, getUserSharedPromptLeaderboard, listPromptLibrary, recordPublicPromptView, revokeUserPromptShare, setUserPromptTags, shareUserPrompt, togglePromptLibraryFavorite, updateUserPrompt } from "./db";

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
      const publicPrompt = await getPublicPrompt(shared.slug);
      expect(publicPrompt).toMatchObject({ title: "Campaign callout", kind: "email" });
      await recordPublicPromptView(publicPrompt!.id);
      await recordPublicPromptView(publicPrompt!.id);
      await expect(getUserPromptShareAnalytics(user.id, created.id)).resolves.toEqual({ views: 2 });
      await expect(getUserPromptShareAnalytics(user.id + 1_000_000, created.id)).rejects.toThrow("not available to you");
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

  it("ranks only the owner’s active shared prompts with anonymous views", async () => {
    const db = await getDb();
    if (!db) return;
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    if (!user) return;

    const top = await createUserPrompt(user.id, { title: "Top shared template", category: "Marketing", kind: "email", body: "Write a focused email for [AUDIENCE]." });
    const second = await createUserPrompt(user.id, { title: "Second shared template", category: "Business", kind: "blog", body: "Write a concise blog article about [TOPIC]." });
    const zero = await createUserPrompt(user.id, { title: "Zero view template", category: "Business", kind: "email", body: "Write a helpful follow-up for [AUDIENCE]." });
    try {
      await Promise.all([shareUserPrompt(user.id, top.id), shareUserPrompt(user.id, second.id), shareUserPrompt(user.id, zero.id)]);
      await recordPublicPromptView(top.id);
      await recordPublicPromptView(top.id);
      await recordPublicPromptView(top.id);
      await recordPublicPromptView(second.id);

      const leaderboard = await getUserSharedPromptLeaderboard(user.id, 5);
      const ranking = leaderboard.filter(prompt => [top.id, second.id, zero.id].includes(prompt.id));
      expect(ranking).toEqual([{ id: top.id, title: "Top shared template", category: "Marketing", kind: "email", views: 3 }, { id: second.id, title: "Second shared template", category: "Business", kind: "blog", views: 1 }]);
      await expect(getUserSharedPromptLeaderboard(user.id + 1_000_000, 5)).resolves.toEqual([]);
    } finally {
      await Promise.all([deleteUserPrompt(user.id, top.id), deleteUserPrompt(user.id, second.id), deleteUserPrompt(user.id, zero.id)]);
    }
  });
});
