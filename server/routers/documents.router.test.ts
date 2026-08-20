import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import type { TrpcContext } from "../_core/context";

const database = vi.hoisted(() => ({
  createUploadedDocument: vi.fn(),
  getDocumentUploadAllowance: vi.fn(),
  getUserDocument: vi.fn(),
  listUserDocuments: vi.fn(),
  removeUserDocument: vi.fn(),
}));
const storage = vi.hoisted(() => ({ storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));
vi.mock("../db", () => database);
vi.mock("../storage", () => storage);

import { documentsRouter } from "./documents";

const authenticatedContext = { user: { id: 42, role: "user" }, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;
const pdfData = "JVBERi0xLjQ=";

describe("protected document upload router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getDocumentUploadAllowance.mockResolvedValue({ limit: 3, used: 0, remaining: 3, resetsAt: new Date() });
    database.createUploadedDocument.mockResolvedValue({ id: "document", fileName: "brief.pdf", mimeType: "application/pdf", sizeBytes: 8, createdAt: new Date() });
    storage.storagePut.mockResolvedValue({ key: "documents/42/file.pdf", url: "/manus-storage/documents/42/file.pdf" });
  });

  it("stores a supported PDF only after checking the server-side allowance", async () => {
    const caller = documentsRouter.createCaller(authenticatedContext);
    await expect(caller.upload({ fileName: "brief.pdf", mimeType: "application/pdf", dataBase64: pdfData })).resolves.toMatchObject({ id: "document" });
    expect(database.getDocumentUploadAllowance).toHaveBeenCalledWith(42);
    expect(storage.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^documents\/42\/.+\.pdf$/), expect.any(Buffer), "application/pdf");
    expect(database.createUploadedDocument).toHaveBeenCalledWith(42, expect.objectContaining({ fileName: "brief.pdf", mimeType: "application/pdf", sizeBytes: 8, storageKey: "documents/42/file.pdf" }));
  });

  it("accepts validated OOXML Word documents and PNG images", async () => {
    const caller = documentsRouter.createCaller(authenticatedContext);
    const archive = new JSZip();
    archive.file("[Content_Types].xml", "<Types />");
    archive.file("word/document.xml", "<w:document />");
    const docxData = (await archive.generateAsync({ type: "nodebuffer" })).toString("base64");
    const pngData = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");

    await expect(caller.upload({ fileName: "brief.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataBase64: docxData })).resolves.toBeTruthy();
    await expect(caller.upload({ fileName: "visual.png", mimeType: "image/png", dataBase64: pngData })).resolves.toBeTruthy();
    expect(storage.storagePut).toHaveBeenCalledWith(expect.stringMatching(/\.docx$/), expect.any(Buffer), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(storage.storagePut).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), expect.any(Buffer), "image/png");
  });

  it("rejects a generic ZIP disguised as a DOCX file", async () => {
    const caller = documentsRouter.createCaller(authenticatedContext);
    const archive = new JSZip();
    archive.file("notes.txt", "not a Word document");
    const genericZip = (await archive.generateAsync({ type: "nodebuffer" })).toString("base64");
    await expect(caller.upload({ fileName: "not-a-document.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataBase64: genericZip })).rejects.toThrow("contents do not match");
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("rejects an unsupported extension or a full daily allowance before storage", async () => {
    const caller = documentsRouter.createCaller(authenticatedContext);
    await expect(caller.upload({ fileName: "brief.doc", mimeType: "application/pdf", dataBase64: pdfData })).rejects.toThrow("Use a PDF");
    expect(storage.storagePut).not.toHaveBeenCalled();

    database.getDocumentUploadAllowance.mockResolvedValue({ limit: 3, used: 3, remaining: 0, resetsAt: new Date() });
    await expect(caller.upload({ fileName: "brief.pdf", mimeType: "application/pdf", dataBase64: pdfData })).rejects.toThrow("limit of 3 document uploads");
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("keeps download and removal operations scoped to the authenticated user", async () => {
    const caller = documentsRouter.createCaller(authenticatedContext);
    database.getUserDocument.mockResolvedValue({ id: "document", userId: 42, storageKey: "documents/42/file.pdf", fileName: "brief.pdf" });
    storage.storageGetSignedUrl.mockResolvedValue("https://example.test/signed.pdf");
    await expect(caller.download({ documentId: "document" })).resolves.toEqual({ url: "https://example.test/signed.pdf", fileName: "brief.pdf" });
    expect(database.getUserDocument).toHaveBeenCalledWith(42, "document");
    await caller.remove({ documentId: "document" });
    expect(database.removeUserDocument).toHaveBeenCalledWith(42, "document");
  });

  it("rejects a non-owner from downloading or removing another user’s document", async () => {
    const otherContext = { ...authenticatedContext, user: { id: 99, role: "user" } } as TrpcContext;
    const caller = documentsRouter.createCaller(otherContext);
    database.getUserDocument.mockResolvedValue(null);
    await expect(caller.download({ documentId: "document" })).rejects.toThrow("not available to you");
    expect(database.getUserDocument).toHaveBeenCalledWith(99, "document");
    expect(storage.storageGetSignedUrl).not.toHaveBeenCalled();

    database.removeUserDocument.mockRejectedValue(new Error("That document is not available to you."));
    await expect(caller.remove({ documentId: "document" })).rejects.toThrow("not available to you");
    expect(database.removeUserDocument).toHaveBeenCalledWith(99, "document");
  });
});
