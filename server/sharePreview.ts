import type { Express } from "express";
import { getPublicDraft } from "./db";

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
function toPlainText(value: string) { return value.replace(/[#*_`>[\]()]/g, " ").replace(/\s+/g, " ").trim(); }

export function registerSharePreviewRoutes(app: Express) {
  app.get("/p/:slug", async (req, res) => {
    const draft = await getPublicDraft(req.params.slug);
    if (!draft) { res.status(404).send("Preview not found"); return; }
    const title = escapeHtml(draft.title);
    const description = escapeHtml(toPlainText(draft.body ?? draft.prompt).slice(0, 180));
    const body = draft.kind === "image" && draft.imageUrl
      ? `<img src="${escapeHtml(draft.imageUrl)}" alt="${escapeHtml(draft.prompt)}" style="max-width:100%;border-radius:20px" />`
      : escapeHtml(draft.body ?? "").replace(/\n/g, "<br />");
    const canonical = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const ogImage = draft.kind === "image" && draft.imageUrl ? `<meta property="og:image" content="${escapeHtml(draft.imageUrl)}" /><meta name="twitter:card" content="summary_large_image" />` : `<meta name="twitter:card" content="summary" />`;
    res.set("Cache-Control", "public, max-age=300").type("html").send(`<!doctype html><html lang="${escapeHtml(draft.language)}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title} · Kamvai</title><meta name="description" content="${description}" /><meta property="og:type" content="article" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:url" content="${escapeHtml(canonical)}" /><meta property="og:site_name" content="Kamvai" />${ogImage}<style>body{margin:0;background:#fbf7ee;color:#29362f;font-family:ui-sans-serif,system-ui,sans-serif}.wrap{max-width:700px;margin:0 auto;padding:72px 24px}small{letter-spacing:.12em;text-transform:uppercase;color:#ac6634;font-weight:700}h1{font-family:Georgia,serif;font-size:clamp(2.4rem,8vw,4.4rem);line-height:1.03;margin:16px 0 30px}article{font-size:1.1rem;line-height:1.85;border-top:1px solid #ddd2bd;padding-top:28px}.brand{margin-top:50px;color:#64736b;font-weight:700}</style></head><body><main class="wrap"><small>Kamvai · ${escapeHtml(draft.kind)}</small><h1>${title}</h1><article>${body}</article><p class="brand">Created with Kamvai</p></main></body></html>`);
  });
}
