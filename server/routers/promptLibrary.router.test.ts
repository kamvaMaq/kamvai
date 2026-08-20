import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const database = vi.hoisted(() => ({
  createUserPrompt: vi.fn(),
  deleteUserPrompt: vi.fn(),
  getPublicPrompt: vi.fn(),
  getUserPromptShareAnalytics: vi.fn(),
  getUserSharedPromptLeaderboard: vi.fn(),
  listPromptLibrary: vi.fn(),
  revokeUserPromptShare: vi.fn(),
  recordPublicPromptView: vi.fn(),
  setUserPromptTags: vi.fn(),
  shareUserPrompt: vi.fn(),
  togglePromptLibraryFavorite: vi.fn(),
  updateUserPrompt: vi.fn(),
}));

vi.mock("../db", () => database);

import { promptLibraryRouter } from "./promptLibrary";

const authenticatedContext = {
  user: { id: 42, role: "user" },
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("protected Prompt Library router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.listPromptLibrary.mockResolvedValue([]);
    database.togglePromptLibraryFavorite.mockResolvedValue({ isFavorite: true });
    database.updateUserPrompt.mockResolvedValue({ id: "custom", title: "Updated" });
    database.deleteUserPrompt.mockResolvedValue({ success: true });
    database.setUserPromptTags.mockResolvedValue({ tags: ["sales"] });
    database.shareUserPrompt.mockResolvedValue({ slug: "shared-prompt-link" });
    database.revokeUserPromptShare.mockResolvedValue({ success: true });
    database.getUserPromptShareAnalytics.mockResolvedValue({ views: 4 });
    database.getUserSharedPromptLeaderboard.mockResolvedValue([]);
    database.recordPublicPromptView.mockResolvedValue(undefined);
  });

  it("passes trimmed search, locale, kind, and favourites filters to the private library helper", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await caller.list({ query: " dashboard ", kind: "code", locale: "zu", favoritesOnly: true });
    expect(database.listPromptLibrary).toHaveBeenCalledWith(42, { query: "dashboard", kind: "code", locale: "zu", favoritesOnly: true });
  });

  it("persists a user-scoped favourite and removes it with the same protected mutation", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await expect(caller.toggleFavorite({ promptId: "code-dashboard-feature" })).resolves.toEqual({ isFavorite: true });
    expect(database.togglePromptLibraryFavorite).toHaveBeenCalledWith(42, "code-dashboard-feature");

    database.togglePromptLibraryFavorite.mockResolvedValueOnce({ isFavorite: false });
    await expect(caller.toggleFavorite({ promptId: "code-dashboard-feature" })).resolves.toEqual({ isFavorite: false });
    expect(database.togglePromptLibraryFavorite).toHaveBeenLastCalledWith(42, "code-dashboard-feature");
  });

  it("keeps custom prompt updates and removals scoped to the authenticated owner", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    const data = { title: "Campaign", category: "Marketing", kind: "email" as const, body: "Draft an email for [AUDIENCE]." };
    await caller.update({ promptId: "custom-prompt", ...data });
    expect(database.updateUserPrompt).toHaveBeenCalledWith(42, "custom-prompt", data);
    await caller.remove({ promptId: "custom-prompt" });
    expect(database.deleteUserPrompt).toHaveBeenCalledWith(42, "custom-prompt");
  });

  it("passes tag and share-link changes through the authenticated owner context", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await caller.setTags({ promptId: "custom-prompt", tags: ["sales", "launch"] });
    expect(database.setUserPromptTags).toHaveBeenCalledWith(42, "custom-prompt", ["sales", "launch"]);
    await caller.share({ promptId: "custom-prompt" });
    expect(database.shareUserPrompt).toHaveBeenCalledWith(42, "custom-prompt");
    await caller.revokeShare({ promptId: "custom-prompt" });
    expect(database.revokeUserPromptShare).toHaveBeenCalledWith(42, "custom-prompt");
  });

  it("returns reach only to the owner and records a view only for a valid public link", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await expect(caller.shareAnalytics({ promptId: "custom-prompt" })).resolves.toEqual({ views: 4 });
    expect(database.getUserPromptShareAnalytics).toHaveBeenCalledWith(42, "custom-prompt");

    database.getPublicPrompt.mockResolvedValueOnce(null);
    await expect(caller.public({ slug: "revoked-share-link" })).resolves.toBeNull();
    expect(database.recordPublicPromptView).not.toHaveBeenCalled();

    database.getPublicPrompt.mockResolvedValueOnce({ id: "custom-prompt", title: "Shared", body: "Prompt body", kind: "email", category: "Marketing" });
    await expect(caller.public({ slug: "active-share-link" })).resolves.toEqual({ title: "Shared", body: "Prompt body", kind: "email", category: "Marketing" });
    expect(database.recordPublicPromptView).toHaveBeenCalledWith("custom-prompt");
  });

  it("retrieves the shared-prompt ranking only through the authenticated owner context", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await caller.sharedLeaderboard({ limit: 3 });
    expect(database.getUserSharedPromptLeaderboard).toHaveBeenCalledWith(42, 3);
  });
});
