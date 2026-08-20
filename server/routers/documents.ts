import path from "node:path";
import JSZip from "jszip";
import { z } from "zod";
import { createUploadedDocument, getDocumentUploadAllowance, getUserDocument, listUserDocuments, removeUserDocument } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl, storagePut } from "../storage";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = 14 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"]);
const extensionsByMimeType: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function safeFileName(fileName: string) {
  const clean = path.basename(fileName).replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim();
  return clean.slice(0, 180) || "uploaded-file";
}

function fileExtension(fileName: string) {
  return path.extname(fileName).toLocaleLowerCase();
}

async function validFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mimeType === "image/jpeg") return buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "application/msword") return buffer.subarray(0, 4).toString("hex") === "d0cf11e0";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const archive = await JSZip.loadAsync(buffer);
      return Boolean(archive.file("[Content_Types].xml")) && Object.keys(archive.files).some(name => name.startsWith("word/"));
    } catch {
      return false;
    }
  }
  return false;
}

export const documentsRouter = router({
  allowance: protectedProcedure.query(({ ctx }) => getDocumentUploadAllowance(ctx.user.id)),
  list: protectedProcedure.query(({ ctx }) => listUserDocuments(ctx.user.id)),
  upload: protectedProcedure.input(z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.string().max(100),
    dataBase64: z.string().min(4).max(MAX_BASE64_LENGTH),
  })).mutation(async ({ ctx, input }) => {
    const fileName = safeFileName(input.fileName);
    const extension = fileExtension(fileName);
    if (!allowedMimeTypes.has(input.mimeType) || !allowedExtensions.has(extension) || !extensionsByMimeType[input.mimeType]?.includes(extension)) throw new Error("Use a PDF, Word document, JPG, PNG, or WebP image.");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.dataBase64)) throw new Error("The uploaded file could not be read.");
    const buffer = Buffer.from(input.dataBase64, "base64");
    if (!buffer.length || buffer.length > MAX_DOCUMENT_BYTES) throw new Error("Each file must be between 1 byte and 10 MB.");
    if (!await validFileSignature(buffer, input.mimeType)) throw new Error("The file contents do not match its selected type.");
    const allowance = await getDocumentUploadAllowance(ctx.user.id);
    if (allowance.remaining < 1) throw new Error("You have reached the limit of 3 document uploads in a rolling 24-hour period.");
    const { key, url } = await storagePut(`documents/${ctx.user.id}/${crypto.randomUUID()}${extension}`, buffer, input.mimeType);
    return createUploadedDocument(ctx.user.id, { fileName, mimeType: input.mimeType, sizeBytes: buffer.length, storageKey: key, storageUrl: url });
  }),
  remove: protectedProcedure.input(z.object({ documentId: z.string().min(1).max(32) })).mutation(({ ctx, input }) => removeUserDocument(ctx.user.id, input.documentId)),
  download: protectedProcedure.input(z.object({ documentId: z.string().min(1).max(32) })).query(async ({ ctx, input }) => {
    const document = await getUserDocument(ctx.user.id, input.documentId);
    if (!document) throw new Error("That document is not available to you.");
    return { url: await storageGetSignedUrl(document.storageKey), fileName: document.fileName };
  }),
});
