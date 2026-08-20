import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const database = vi.hoisted(() => ({
  createUserPrompt: vi.fn(),
  deleteUserPrompt: vi.fn(),
  listPromptLibrary: vi.fn(),
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
});
