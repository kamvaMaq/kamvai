// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => {
  const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, data: undefined };
  const query = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  const utils = new Proxy({}, { get: (_target, property) => property === "invalidate" || property === "fetch" ? vi.fn() : utils });
  const procedure = { useQuery: () => query, useMutation: () => mutation };
  const trpc = new Proxy({ useUtils: () => utils }, { get: (_target, property) => property === "useUtils" ? () => utils : new Proxy({}, { get: () => procedure }) });
  return { trpc, promptOpen: vi.fn() };
});

vi.mock("@/lib/trpc", () => ({ trpc: testState.trpc }));
vi.mock("../_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, name: "Kv", role: "user" }, loading: false, isAuthenticated: true, logout: vi.fn() }) }));
vi.mock("../contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "light", preference: "light", toggleTheme: vi.fn(), setThemePreference: vi.fn() }) }));
vi.mock("react-i18next", async importOriginal => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return { ...actual, useTranslation: () => ({ t: (value: string) => value, i18n: { language: "en", changeLanguage: vi.fn() } }) };
});
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: string }) => createElement("div", null, children) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));
vi.mock("../components/PromptLibrary", () => ({ PromptLibrary: () => createElement("button", { onClick: testState.promptOpen }, "Prompt Library") }));
vi.mock("../components/ContributionAnalytics", () => ({ ContributionAnalytics: () => createElement("div", null, "Contribution dashboard") }));
vi.mock("../components/SharedPromptLeaderboard", () => ({ SharedPromptLeaderboard: () => createElement("div", null, "Shared prompt leaderboard") }));
vi.mock("../components/DocumentUploader", () => ({ DocumentUploader: () => createElement("button", null, "Attach documents"), AttachedDocumentChips: () => null }));
vi.mock("../lib/codeZip", () => ({ downloadCodeExport: vi.fn() }));

import Home from "./Home";

describe("focused workspace navigation", () => {
  beforeEach(() => testState.promptOpen.mockReset());

  it("opens deferred payment choices and continues into the PayShap request flow", () => {
    render(createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Payments & passes" }));
    expect(screen.getByRole("heading", { name: "Payments & passes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Choose monthly/ }));
    expect(screen.getByRole("heading", { name: "Pay with PayShap" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create PayShap request" })).toBeTruthy();
  });

  it("opens contribution tools only when the user selects them", () => {
    render(createElement(Home));
    expect(screen.queryByText("Contribution dashboard")).toBeNull();
    expect(screen.queryByText("Shared prompt leaderboard")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Payments & passes" })).toBeNull();
    expect(screen.getByRole("button", { name: "Contribution & goals" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Prompt Library" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Shared prompt reach" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Payments & passes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Privacy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.getByRole("heading", { name: "Privacy & data" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Contribution & goals" }));
    expect(screen.getByText("Contribution dashboard")).toBeTruthy();
  });

  it("keeps mobile prompt, sharing, and payment actions explicit", () => {
    render(createElement(Home));
    const promptTriggers = screen.getAllByRole("button", { name: "Prompt Library" });
    fireEvent.click(promptTriggers[promptTriggers.length - 1]);
    expect(testState.promptOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Sharing" }));
    expect(screen.getByRole("heading", { name: "Shared prompt reach" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: "Payments" }));
    expect(screen.getByRole("heading", { name: "Payments & passes" })).toBeTruthy();
  });
});
