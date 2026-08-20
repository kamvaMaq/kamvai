// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ documents: [] as Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: Date }>, mutate: vi.fn() }));
const mutationResult = { mutate: state.mutate, isPending: false };
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ documents: { allowance: { invalidate: vi.fn() }, list: { invalidate: vi.fn() }, download: { fetch: vi.fn() } } }),
    documents: {
      allowance: { useQuery: () => ({ data: { limit: 3, used: 0, remaining: 3, resetsAt: new Date() }, isLoading: false }) },
      list: { useQuery: () => ({ data: state.documents, isLoading: false, isError: false, refetch: vi.fn() }) },
      upload: { useMutation: () => mutationResult },
      remove: { useMutation: () => mutationResult },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AttachedDocumentChips, DocumentUploader } from "./DocumentUploader";

describe("DocumentUploader", () => {
  beforeEach(() => { state.documents = []; state.mutate.mockReset(); });

  it("opens the private document workspace from the plus-sign attachment control", () => {
    render(createElement(DocumentUploader));
    const trigger = screen.getByRole("button", { name: "Attach documents" });
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.getByText("Attach supporting files")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Browse files" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders stored documents as compact prompt attachment chips", () => {
    state.documents = [{ id: "document-1", fileName: "campaign-brief.pdf", mimeType: "application/pdf", sizeBytes: 1024, createdAt: new Date() }];
    render(createElement(AttachedDocumentChips));
    expect(screen.getByLabelText("Attached documents")).toBeTruthy();
    expect(screen.getByText("campaign-brief.pdf")).toBeTruthy();
  });

  it("accepts a dropped permitted file through the dialog drop zone", async () => {
    const originalReader = globalThis.FileReader;
    class TestFileReader {
      result = "data:application/pdf;base64,JVBERi0xLjQ=";
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() { this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>); }
    }
    // @ts-expect-error Test implementation supplies the FileReader surface used by the component.
    globalThis.FileReader = TestFileReader;
    render(createElement(DocumentUploader));
    fireEvent.click(screen.getByRole("button", { name: "Attach documents" }));
    const dropZone = screen.getByRole("group", { name: "Document upload drop zone" });
    const file = new File(["%PDF-1.4"], "brief.pdf", { type: "application/pdf" });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(state.mutate).toHaveBeenCalledWith({ fileName: "brief.pdf", mimeType: "application/pdf", dataBase64: "JVBERi0xLjQ=" }));
    globalThis.FileReader = originalReader;
  });
});
