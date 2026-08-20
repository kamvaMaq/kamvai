// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const mutationResult = { mutate: vi.fn(), isPending: false };
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ documents: { allowance: { invalidate: vi.fn() }, list: { invalidate: vi.fn() }, download: { fetch: vi.fn() } } }),
    documents: {
      allowance: { useQuery: () => ({ data: { limit: 3, used: 0, remaining: 3, resetsAt: new Date() }, isLoading: false }) },
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }) },
      upload: { useMutation: () => mutationResult },
      remove: { useMutation: () => mutationResult },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DocumentUploader } from "./DocumentUploader";

describe("DocumentUploader", () => {
  it("opens the private document workspace from the plus-sign attachment control", () => {
    render(createElement(DocumentUploader));
    const trigger = screen.getByRole("button", { name: "Attach documents" });
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.getByText("Attach supporting files")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload document" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
