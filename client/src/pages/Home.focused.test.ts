// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => {
  const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, data: undefined };
  const query = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  const allowance = { unlimited: false, remaining: 7, resetsAt: new Date("2026-08-21T10:00:00.000Z"), used: 3, limit: 10 };
  const usageState = { data: allowance as typeof allowance | undefined, isLoading: false, isError: false, refetch: vi.fn() };
  const drafts: Array<{ id: string; title: string; kind: "blog" | "chat" | "video"; updatedAt: Date; body: string; language: string; prompt: string }> = [];
  const utils = new Proxy({}, { get: (_target, property) => property === "invalidate" || property === "fetch" ? vi.fn() : utils });
  const trpc = new Proxy({ useUtils: () => utils }, { get: (_target, namespace) => namespace === "useUtils" ? () => utils : new Proxy({}, { get: (_router, procedure) => ({ useQuery: () => namespace === "drafts" && procedure === "list" ? { ...query, data: drafts } : namespace === "usage" && procedure === "status" ? usageState : query, useMutation: () => mutation }) }) });
  return { trpc, promptOpen: vi.fn(), drafts, allowance, usageState };
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
  beforeEach(() => { cleanup(); testState.promptOpen.mockReset(); testState.drafts.splice(0); testState.usageState.data = testState.allowance; testState.usageState.isLoading = false; testState.usageState.isError = false; });

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

  it("keeps past drafts collapsed until Your Library is opened and clears the main chat for New draft", () => {
    testState.drafts.push({ id: "draft-1", title: "Saved campaign", kind: "blog", updatedAt: new Date("2026-08-20T00:00:00.000Z"), body: "A saved result", language: "en", prompt: "Campaign brief" });
    render(createElement(Home));

    expect(screen.getByRole("button", { name: "yourLibrary" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /Saved campaign/ })).toBeNull();
    expect(screen.queryByText("draftNotSelected")).toBeNull();

    const brief = screen.getByLabelText("What are you shaping today?");
    fireEvent.change(brief, { target: { value: "An unfinished brief" } });
    fireEvent.click(screen.getByRole("button", { name: "newDraft" }));
    expect((brief as HTMLTextAreaElement).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "yourLibrary" }));
    expect(screen.getByRole("button", { name: /Saved campaign/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Saved campaign/ }));
    expect(screen.getByText("A saved result")).toBeTruthy();
    expect(screen.getByRole("button", { name: "yourLibrary" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("restores saved drafts from the mobile library and returns to a blank chat", () => {
    testState.drafts.push({ id: "draft-mobile", title: "Mobile draft", kind: "blog", updatedAt: new Date("2026-08-20T00:00:00.000Z"), body: "Mobile saved result", language: "en", prompt: "Mobile brief" });
    render(createElement(Home));

    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByRole("heading", { name: "Your Library" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mobile draft/ }));
    expect(screen.getByText("Mobile saved result")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(screen.getByRole("button", { name: "New draft" }));
    expect(screen.queryByText("Mobile saved result")).toBeNull();
  });

  it("offers a general-purpose chat by default and makes the video plan workflow explicit", () => {
    render(createElement(Home));

    expect(screen.getByRole("button", { name: /General chat/ })).toBeTruthy();
    expect(screen.getByLabelText("What are you shaping today?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ask Kamvai" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Video plan/ }));
    expect(screen.getByText("Video planning workspace")).toBeTruthy();
    expect(screen.getByText(/does not render a video file/i)).toBeTruthy();
    expect(screen.getByLabelText("What video would you like to make?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create video plan" })).toBeTruthy();
  });

  it("keeps the professional workspace composition and clear selected-mode state", () => {
    const { container } = render(createElement(Home));
    expect(container.querySelector(".workspace-shell")).toBeTruthy();
    expect(container.querySelector(".premium-header")).toBeTruthy();
    expect(container.querySelector(".kamvai-trace")).toBeTruthy();
    expect(container.querySelector(".brand-lockup")).toBeTruthy();
    const mark = screen.getByAltText("Kamvai mark") as HTMLImageElement;
    expect(mark.src).toContain("kamvai-premium-mark_7acaf8e2.png");
    expect(container.querySelector(".workspace-sidebar")).toBeTruthy();
    expect(container.querySelector(".workspace-composer")).toBeTruthy();
    expect(container.querySelector(".workspace-mode-grid")).toBeTruthy();
    expect(screen.getByRole("button", { name: /General chat/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Blog post/ }));
    expect(screen.getByRole("button", { name: /Blog post/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps general chat and video planning modes reachable at desktop and mobile viewports", () => {
    for (const width of [375, 1280]) {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      window.dispatchEvent(new Event("resize"));
      const { unmount } = render(createElement(Home));

      expect(screen.getByRole("button", { name: /General chat/ })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Video plan/ }));
      expect(screen.getByLabelText("What video would you like to make?")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Create video plan" })).toBeTruthy();
      unmount();
    }
  });

  it("reveals the remaining generation credits from the compact sidebar button", () => {
    render(createElement(Home));

    const trigger = screen.getByRole("button", { name: "Remaining credits" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("7 generation credits remaining.")).toBeTruthy();
  });

  it("explains loading and unavailable allowance states from the sidebar button", () => {
    testState.usageState.data = undefined;
    testState.usageState.isLoading = true;
    const loadingView = render(createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Remaining credits" }));
    expect(screen.getByText("Checking allowance…")).toBeTruthy();
    loadingView.unmount();

    testState.usageState.isLoading = false;
    testState.usageState.isError = true;
    render(createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Remaining credits" }));
    expect(screen.getByText(/remaining credits are temporarily unavailable/i)).toBeTruthy();
  });

  it("explains unlimited pass access from the sidebar button", () => {
    testState.usageState.data = { unlimited: true, remaining: null as unknown as number, resetsAt: new Date("2026-08-21T10:00:00.000Z"), used: 0, limit: null as unknown as number };
    render(createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Remaining credits" }));
    expect(screen.getByText("Unlimited access is active.")).toBeTruthy();
    expect(screen.getByText("Your current pass is covering all generations.")).toBeTruthy();
  });
});
