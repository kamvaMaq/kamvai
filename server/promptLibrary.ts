export const promptKinds = ["blog", "email", "code", "image"] as const;
export type PromptKind = (typeof promptKinds)[number];

export type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  kind: PromptKind;
  category: string;
};

export const promptTemplates: PromptTemplate[] = [
  { id: "blog-market-insight", title: "Market insight article", description: "Turn an idea into a grounded, useful blog post.", kind: "blog", category: "Marketing", prompt: "Write a practical blog post for [AUDIENCE] about [TOPIC]. Open with a relatable local context, explain three useful insights with examples, and close with one action readers can take today. Use a warm, clear, credible voice." },
  { id: "blog-founder-story", title: "Founder story", description: "Share a human business origin story with purpose.", kind: "blog", category: "Business", prompt: "Create a compelling founder story for [BUSINESS]. Explain the problem that inspired it, the people it serves, and the vision for its next chapter. Keep it authentic, specific, and suitable for a website blog." },
  { id: "email-client-update", title: "Client project update", description: "Clear progress note that builds trust.", kind: "email", category: "Business", prompt: "Draft a concise client update about [PROJECT]. Include progress made, the next milestone, any decision needed from the client, and a friendly closing. Keep the tone calm, accountable, and easy to scan." },
  { id: "email-launch-invite", title: "Launch invitation", description: "Invite an audience to a launch or event.", kind: "email", category: "Marketing", prompt: "Write an engaging launch invitation for [OFFER OR EVENT] aimed at [AUDIENCE]. Include a clear benefit, date or availability, a short call to action, and an enthusiastic but credible tone." },
  { id: "code-api-endpoint", title: "Production API endpoint", description: "Plan a typed, validated server endpoint.", kind: "code", category: "Engineering", prompt: "Design and implement a production-ready [STACK] API endpoint for [FEATURE]. Include validation, authentication or authorization assumptions, error handling, data model considerations, tests, and brief setup instructions." },
  { id: "code-dashboard-feature", title: "Dashboard feature", description: "Build a resilient UI feature with states.", kind: "code", category: "Engineering", prompt: "Build a polished [STACK] dashboard feature for [USE CASE]. Include typed data contracts, loading, empty, and error states, responsive layout, accessibility notes, and tests for the critical behavior." },
  { id: "image-product-scene", title: "Editorial product scene", description: "Create a premium product image direction.", kind: "image", category: "Visuals", prompt: "Create an editorial product image for [PRODUCT] in a [SETTING] setting. Use [COLOUR PALETTE], natural directional light, refined composition, and enough negative space for optional campaign copy. Avoid visible logos and text." },
  { id: "image-community-campaign", title: "Community campaign image", description: "Warm, authentic visual campaign direction.", kind: "image", category: "Visuals", prompt: "Generate an authentic campaign image celebrating [COMMUNITY OR MOMENT]. Show diverse people naturally engaged in [ACTIVITY], with an optimistic documentary feel, warm South African light, and no overlaid text." },
  { id: "blog-how-to-guide", title: "Helpful how-to guide", description: "Teach a process readers can use immediately.", kind: "blog", category: "Education", prompt: "Write a practical step-by-step guide that helps [AUDIENCE] achieve [OUTCOME]. Start by naming the common challenge, explain the process in clear stages, add realistic tips, and finish with a concise checklist." },
  { id: "blog-customer-questions", title: "Answer common questions", description: "Turn recurring questions into useful content.", kind: "blog", category: "Business", prompt: "Write an FAQ-style article for [BUSINESS] that answers the most important questions about [TOPIC]. Be transparent, plain-spoken, and specific. Include a short introduction and a useful next step." },
  { id: "email-welcome-series", title: "Welcome email", description: "Start a useful relationship with new subscribers.", kind: "email", category: "Marketing", prompt: "Write a friendly welcome email for someone who has just joined [BRAND OR COMMUNITY]. Thank them, state what they can expect, offer one genuinely useful resource, and invite a low-pressure next action." },
  { id: "email-payment-reminder", title: "Payment reminder", description: "Ask for payment respectfully and clearly.", kind: "email", category: "Business", prompt: "Write a polite payment reminder for invoice [INVOICE NUMBER] due on [DATE]. State the amount, include a clear payment action, preserve a respectful relationship, and offer help if there is a problem." },
  { id: "code-form-flow", title: "Validated form flow", description: "Create an accessible form with robust feedback.", kind: "code", category: "Engineering", prompt: "Implement a complete [STACK] form flow for [USE CASE]. Include schema validation, accessible labels and error messages, loading and success states, secure server handling, and automated tests." },
  { id: "code-data-model", title: "Data model design", description: "Model entities and relationships before building.", kind: "code", category: "Engineering", prompt: "Design a maintainable data model for [PRODUCT OR FEATURE] using [STACK]. Define entities, relationships, constraints, indexes, privacy considerations, migration steps, and example queries." },
  { id: "image-brand-portrait", title: "Founder brand portrait", description: "Create a confident, natural professional portrait.", kind: "image", category: "Brand", prompt: "Create an editorial brand portrait of [PERSON OR ROLE] in [LOCATION OR SETTING]. Use natural, flattering light, a confident relaxed expression, authentic wardrobe details, and a polished but human documentary style. No text or logos." },
  { id: "image-social-series", title: "Social campaign visual", description: "Build a scroll-stopping concept for social content.", kind: "image", category: "Marketing", prompt: "Create a distinctive social campaign visual for [CAMPAIGN]. Convey [KEY FEELING OR BENEFIT] through a strong central subject, [COLOUR PALETTE], editorial lighting, and balanced negative space for optional copy. Do not add text." },
];

export function filterPromptTemplates(input: { query?: string; kind?: PromptKind }) {
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  return promptTemplates.filter(template => {
    const matchesKind = !input.kind || template.kind === input.kind;
    const haystack = `${template.title} ${template.description} ${template.category} ${template.prompt}`.toLocaleLowerCase();
    return matchesKind && (!query || haystack.includes(query));
  });
}

export function togglePromptFavouriteIds(currentIds: ReadonlySet<string>, promptId: string) {
  const nextIds = new Set(currentIds);
  const isFavorite = !nextIds.delete(promptId);
  if (isFavorite) nextIds.add(promptId);
  return { isFavorite, ids: nextIds };
}
