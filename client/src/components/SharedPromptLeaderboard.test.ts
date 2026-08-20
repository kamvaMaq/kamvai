// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useLeaderboardQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/trpc", () => ({ trpc: { promptLibrary: { sharedLeaderboard: { useQuery: useLeaderboardQuery } } } }));

import { SharedPromptLeaderboard } from "./SharedPromptLeaderboard";

describe("SharedPromptLeaderboard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    useLeaderboardQuery.mockReturnValue({
      data: [
        { id: "top", title: "Launch announcement", category: "Marketing", kind: "email", views: 18 },
        { id: "second", title: "Founder story", category: "Business", kind: "blog", views: 6 },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("shows an owner’s shared prompts in descending reach order", () => {
    render(createElement(SharedPromptLeaderboard));
    expect(screen.getByText("Your popular templates")).toBeTruthy();
    expect(screen.getByText("Launch announcement")).toBeTruthy();
    expect(screen.getByText("Founder story")).toBeTruthy();
    const titles = screen.getAllByText(/Launch announcement|Founder story/).map(element => element.textContent);
    expect(titles).toEqual(["Launch announcement", "Founder story"]);
    expect(screen.getByText("18")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("explains the empty state before a user has shared-prompt views", () => {
    useLeaderboardQuery.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
    render(createElement(SharedPromptLeaderboard));
    expect(screen.getByText("Your shared prompt reach will appear here")).toBeTruthy();
  });

  it("offers a retry when the ranking query fails", () => {
    const refetch = vi.fn();
    useLeaderboardQuery.mockReturnValue({ data: [], isLoading: false, isError: true, refetch });
    render(createElement(SharedPromptLeaderboard));
    expect(screen.getByText("Your shared prompt reach is unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
