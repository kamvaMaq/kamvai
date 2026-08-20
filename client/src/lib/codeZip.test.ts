import { describe, expect, it } from "vitest";
import { buildCodeExport } from "./codeZip";

describe("code ZIP export", () => {
  it("turns fenced code into safe export files and adds a manifest", () => {
    const exportPayload = buildCodeExport({
      title: "My API",
      body: "```typescript filename=src/server.ts\nexport const api = true;\n```\n\n```json\n{\"ok\":true}\n```",
      language: "en",
      prompt: "Create a small API",
    });
    expect(exportPayload.archiveName).toBe("my-api.zip");
    expect(exportPayload.files.map(file => file.path)).toEqual(["README.md", "src/server.ts", "src/snippet-2.json"]);
    expect(exportPayload.files[0]?.content).toContain("Create a small API");
  });

  it("falls back to a Markdown file and rejects path traversal in supplied filenames", () => {
    const plain = buildCodeExport({ title: "Draft", body: "No code fences here." });
    expect(plain.files.map(file => file.path)).toEqual(["README.md", "generated-code.md"]);
    const sanitized = buildCodeExport({ title: "Draft", body: "```js filename=../../secrets.js\nconsole.log('safe');\n```" });
    expect(sanitized.files[1]?.path).toBe("secrets.js");
  });
});
