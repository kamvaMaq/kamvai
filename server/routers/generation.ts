import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { createCodeStackInstruction } from "../codeStack";
import {
  addDraftRevision,
  createDraft,
  generationEligibility,
  getDraftForUser,
  getGenerationAllowance,
  getPreferencesForUser,
  recordGenerationUsage,
  updateDraftContent,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const kindSchema = z.enum(["blog", "email", "code", "image"]);
const languageNames: Record<string, string> = {
  en: "English", af: "Afrikaans", zu: "isiZulu", xh: "isiXhosa", nso: "Sepedi", tn: "Setswana", st: "Sesotho", ts: "Xitsonga", ss: "siSwati", ve: "Tshivenda", nr: "isiNdebele",
};

function createTitle(brief: string, kind: string) {
  const clean = brief.replace(/\s+/g, " ").trim();
  return clean.length > 68 ? `${clean.slice(0, 65)}…` : clean || `${kind} draft`;
}

export const generationRouter = router({
  create: protectedProcedure.input(z.object({
    kind: kindSchema,
    brief: z.string().min(8).max(6000),
    language: z.string().min(2).max(16),
    stack: z.string().trim().min(2).max(120).optional(),
    draftId: z.string().min(1).optional(),
    refinement: z.string().min(3).max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const preferences = await getPreferencesForUser(ctx.user.id);
    const allowance = await getGenerationAllowance(ctx.user.id);
    const eligibility = generationEligibility({ privacyConsentAt: preferences.privacyConsentAt, allowance });
    if (eligibility.reason === "privacy_consent_required") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please accept the privacy terms before generating content." });
    }
    if (eligibility.reason === "allowance_exhausted") {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Your free generation allowance is used. Your access resets 24 hours after each generation." });
    }

    const existing = input.draftId ? await getDraftForUser(input.draftId, ctx.user.id) : undefined;
    if (input.draftId && !existing) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found." });
    const targetLanguage = languageNames[input.language] ?? "English";
    const refinement = input.refinement ? `\nRefinement request: ${input.refinement}` : "";
    const priorDraft = existing?.body ? `\nPrior draft:\n${existing.body}` : "";
    const stackInstruction = input.kind === "code" ? `\n${createCodeStackInstruction(input.stack)}` : "";

    let body: string | null = null;
    let imageUrl: string | null = null;
    if (input.kind === "image") {
      const image = await generateImage({
        prompt: `Create a polished, original image. Brief: ${input.brief}.${refinement} Avoid logos, copyrighted characters, graphic violence, or real-person likenesses.`,
        quality: "medium",
      });
      imageUrl = image.url ?? null;
      if (!imageUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The image service returned no usable image. Please try again." });
    } else {
      const catalog = await listLLMModels();
      const model = catalog.data.find(entry => entry.id === "claude-sonnet-4-6")?.id
        ?? catalog.data.find(entry => entry.id.startsWith("claude-"))?.id;
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: `You write clear, useful ${input.kind} content for South African users. Return polished Markdown only. Write entirely in ${targetLanguage}. Respect the requested format, be specific, and do not fabricate sources or personal experiences.` },
          { role: "user", content: `Brief: ${input.brief}${stackInstruction}${refinement}${priorDraft}` },
        ],
      });
      body = String(response.choices[0]?.message?.content ?? "").trim();
      if (!body) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI service returned no usable content. Please try again." });
    }

    let draft;
    if (existing) {
      await addDraftRevision({ draftId: existing.id, instruction: input.refinement ?? input.brief, body, imageUrl });
      draft = await updateDraftContent({ id: existing.id, userId: ctx.user.id, prompt: input.brief, body, imageUrl });
    } else {
      draft = await createDraft({
        userId: ctx.user.id,
        kind: input.kind,
        title: createTitle(input.brief, input.kind),
        prompt: input.brief,
        language: input.language,
        body,
        imageUrl,
      });
    }
    const updatedAllowance = await recordGenerationUsage(ctx.user.id, input.kind);
    return { draft, allowance: updatedAllowance };
  }),
});
