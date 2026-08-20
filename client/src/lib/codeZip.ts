import JSZip from "jszip";

type CodeExportInput = { title: string; body: string; language?: string | null; prompt?: string | null };
type ExportFile = { path: string; content: string };

const extensionByLanguage: Record<string, string> = {
  javascript: "js", js: "js", jsx: "jsx", typescript: "ts", ts: "ts", tsx: "tsx", python: "py", py: "py",
  php: "php", java: "java", csharp: "cs", cs: "cs", dart: "dart", go: "go", rust: "rs", ruby: "rb",
  sql: "sql", html: "html", css: "css", json: "json", yaml: "yml", yml: "yml", bash: "sh", shell: "sh",
};

function safeSegment(value: string, fallback: string) {
  const normalized = value.replace(/\\/g, "/").split("/").filter(segment => segment && segment !== "." && segment !== "..").join("/");
  return normalized.replace(/[^a-zA-Z0-9._/-]/g, "-").replace(/-+/g, "-").slice(0, 140) || fallback;
}

function parseFenceInfo(info: string, index: number) {
  const filenameMatch = info.match(/filename\s*=\s*["']?([^\s"']+)["']?/i);
  if (filenameMatch?.[1]) return safeSegment(filenameMatch[1], `snippet-${index}.txt`);
  const language = info.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return `src/snippet-${index}.${extensionByLanguage[language] ?? "txt"}`;
}

export function buildCodeExport(input: CodeExportInput) {
  const files: ExportFile[] = [];
  const fencePattern = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = fencePattern.exec(input.body)) && index < 50) {
    index += 1;
    files.push({ path: parseFenceInfo(match[1] ?? "", index), content: match[2] });
  }
  if (!files.length) files.push({ path: "generated-code.md", content: input.body });

  const folder = safeSegment(input.title.toLowerCase().replace(/\s+/g, "-"), "kamvai-code-export");
  const manifest = [
    "# Kamvai code export",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Files: ${files.length}`,
    input.language ? `Interface language: ${input.language}` : "",
    input.prompt ? "\n## Original brief\n\n" + input.prompt.trim() : "",
    "\nReview generated code before using it in production.",
  ].filter(Boolean).join("\n");

  return { archiveName: `${folder}.zip`, files: [{ path: "README.md", content: manifest }, ...files] };
}

export async function downloadCodeExport(input: CodeExportInput) {
  const payload = buildCodeExport(input);
  const zip = new JSZip();
  payload.files.forEach(file => zip.file(file.path, file.content));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.archiveName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return payload;
}
