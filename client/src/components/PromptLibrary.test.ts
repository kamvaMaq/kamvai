// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { promptForGenerator, PromptLibrary } from "./PromptLibrary";

const invalidate = vi.fn();
const prompt = vi.hoisted(() => ({
  id: "custom-prompt",
  title: "Campaign follow-up",
  category: "Marketing",
  kind: "email" as const,
  body: "Draft a concise follow-up email for [AUDIENCE].",
  locale: "en",
  tags: [],
  isBuiltIn: false,
  isFavorite: false,
  isOwned: true,
  shareSlug: "shared-prompt-link",
  viewCount: 7,
}));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ promptLibrary: { list: { invalidate } } }),
    promptLibrary: {
      list: { useQuery: () => ({ data: [prompt], isLoading: false, isError: false, refetch: vi.fn() }) },
      toggleFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setTags: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      share: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      revokeShare: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("My Prompts generator application", () => {
  it("preserves a custom prompt’s title, format, and body when applying it to the generator", () => {
    expect(promptForGenerator(prompt)).toEqual({ title: "Campaign follow-up", kind: "email", prompt: "Draft a concise follow-up email for [AUDIENCE]." });
  });

  it("applies an owned custom prompt from the My Prompts tab", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(createElement(PromptLibrary, { onApply }));
    await user.click(screen.getByRole("button", { name: "Prompt Library" }));
    await user.click(screen.getByRole("button", { name: "My Prompts" }));
    expect(screen.getByText(/7 views · anonymous reach/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Use" }));
    expect(onApply).toHaveBeenCalledWith({ title: "Campaign follow-up", kind: "email", prompt: "Draft a concise follow-up email for [AUDIENCE]." });
  });
});
