import React, { ChangeEvent, useRef, useState } from "react";
import { FileImage, FileText, FileUp, Loader2, Paperclip, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"]);

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon({ mimeType }: { mimeType: string }) {
  return mimeType.startsWith("image/") ? <FileImage size={17} /> : <FileText size={17} />;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function DocumentUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const allowanceQuery = trpc.documents.allowance.useQuery(undefined, { enabled: open });
  const documentsQuery = trpc.documents.list.useQuery(undefined, { enabled: open });
  const upload = trpc.documents.upload.useMutation({
    onSuccess: () => { void utils.documents.allowance.invalidate(); void utils.documents.list.invalidate(); toast.success("Document uploaded securely."); },
    onError: error => toast.error(error.message || "We could not upload that document."),
  });
  const remove = trpc.documents.remove.useMutation({
    onSuccess: () => { void utils.documents.list.invalidate(); toast.success("Document removed from your workspace."); },
    onError: error => toast.error(error.message || "We could not remove that document."),
  });
  const allowance = allowanceQuery.data;
  const documents = documentsQuery.data ?? [];
  const remaining = allowance?.remaining ?? 0;

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.has(file.type)) { toast.error("Choose a PDF, Word document, JPG, PNG, or WebP image."); return; }
    if (file.size < 1 || file.size > MAX_FILE_BYTES) { toast.error("Each file must be between 1 byte and 10 MB."); return; }
    if ((allowance?.remaining ?? 0) < 1) { toast.error("You have reached today’s upload allowance."); return; }
    try { upload.mutate({ fileName: file.name, mimeType: file.type, dataBase64: await fileToBase64(file) }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The selected file could not be read."); }
  }

  async function download(documentId: string) {
    setDownloadingId(documentId);
    try {
      const result = await utils.documents.download.fetch({ documentId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not open that document.");
    } finally {
      setDownloadingId(null);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Attach documents" title="Attach documents" className="size-8 rounded-full border border-border bg-background/90 text-[#244F49] shadow-sm hover:bg-[#EAF3EE] dark:text-[#C7F0DD]"><Plus size={18} /></Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-0">
      <DialogHeader className="border-b border-[#D7E4DB] bg-[#F1F7F2] px-5 py-5 dark:border-[#426357] dark:bg-[#20382F] sm:px-6"><div className="flex items-start justify-between gap-4 pr-7"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Document workspace</p><DialogTitle className="mt-1 font-display text-2xl tracking-tight">Attach supporting files</DialogTitle><DialogDescription className="mt-1">PDF, Word, JPG, PNG, or WebP up to 10 MB each.</DialogDescription></div><div className="rounded-2xl bg-[#DDECE1] px-3 py-2 text-right dark:bg-[#315345]"><p className="text-lg font-bold text-[#244F49] dark:text-[#D4F5E0]">{allowanceQuery.isLoading ? "…" : remaining}</p><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#426357] dark:text-[#C7F0DD]">of 3 uploads left</p></div></div></DialogHeader>
      <div className="p-5 sm:p-6"><input ref={inputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" onChange={handleFileSelection} />
        <Button disabled={upload.isPending || allowanceQuery.isLoading || remaining < 1} onClick={() => inputRef.current?.click()} className="rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]">{upload.isPending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}{upload.isPending ? "Uploading…" : "Upload document"}</Button>
        <p className="mt-3 text-xs text-muted-foreground">Your upload allowance is enforced by the server on a rolling 24-hour basis. Removing a document does not restore an upload slot.</p>
        {documentsQuery.isLoading ? <div className="mt-5 space-y-2">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div> : documentsQuery.isError ? <div className="mt-5 rounded-xl border border-destructive/30 bg-muted/30 p-4 text-sm text-muted-foreground">Your attached files could not load. <Button variant="link" className="h-auto p-0" onClick={() => documentsQuery.refetch()}>Try again</Button></div> : documents.length ? <ul className="mt-5 divide-y divide-[#D7E4DB] rounded-xl border border-[#D7E4DB] bg-muted/20 dark:divide-[#426357] dark:border-[#426357]">{documents.map(document => <li key={document.id} className="flex items-center gap-3 px-3 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#DDECE1] text-[#244F49] dark:bg-[#315345] dark:text-[#D4F5E0]"><DocumentIcon mimeType={document.mimeType} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.fileName}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString()}</p></div><Button size="icon" variant="ghost" aria-label={`Open ${document.fileName}`} disabled={downloadingId === document.id} onClick={() => void download(document.id)}>{downloadingId === document.id ? <Loader2 className="animate-spin" size={16} /> : <Paperclip size={16} />}</Button><Button size="icon" variant="ghost" aria-label={`Remove ${document.fileName}`} disabled={remove.isPending} className="text-destructive hover:text-destructive" onClick={() => remove.mutate({ documentId: document.id })}><Trash2 size={16} /></Button></li>)}</ul> : <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-[#C7D7CF] bg-muted/10 p-7 text-center dark:border-[#426357]"><FileUp size={20} className="text-muted-foreground" /><p className="mt-3 font-semibold">No documents attached yet</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Use this private workspace to keep reference files ready for your next brief.</p></div>}
      </div>
    </DialogContent>
  </Dialog>;
}
