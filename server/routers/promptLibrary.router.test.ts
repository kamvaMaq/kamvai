import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const database = vi.hoisted(() => ({
  createUserPrompt: vi.fn(),
  listPromptLibrary: vi.fn(),
  togglePromptLibraryFavorite: vi.fn(),
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
  });

  it("passes trimmed search and kind filters to the private library helper", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await caller.list({ query: " dashboard ", kind: "code" });
    expect(database.listPromptLibrary).toHaveBeenCalledWith(42, { query: "dashboard", kind: "code" });
  });

  it("persists a user-scoped favourite and removes it with the same protected mutation", async () => {
    const caller = promptLibraryRouter.createCaller(authenticatedContext);
    await expect(caller.toggleFavorite({ promptId: "code-dashboard-feature" })).resolves.toEqual({ isFavorite: true });
    expect(database.togglePromptLibraryFavorite).toHaveBeenCalledWith(42, "code-dashboard-feature");

    database.togglePromptLibraryFavorite.mockResolvedValueOnce({ isFavorite: false });
    await expect(caller.toggleFavorite({ promptId: "code-dashboard-feature" })).resolves.toEqual({ isFavorite: false });
    expect(database.togglePromptLibraryFavorite).toHaveBeenLastCalledWith(42, "code-dashboard-feature");
  });
});
