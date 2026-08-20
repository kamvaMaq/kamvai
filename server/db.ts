import { and, asc, desc, eq, gt, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  accountDeletionRequests,
  contentDrafts,
  documentUploadEvents,
  draftRevisions,
  entitlements,
  generationUsages,
  InsertUser,
  payShapPaymentRequests,
  promptLibraryFavorites,
  promptLibraryItemTags,
  promptLibraryItems,
  promptLibraryShareViews,
  promptLibraryTags,
  userPreferences,
  uploadedDocuments,
  users,
  voucherRedemptionAttempts,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendTransactionalEmail } from "./sendgrid";
import { contributionAnalyticsStart, contributionStreakStart, DEFAULT_WEEKLY_GENERATION_GOAL, summarizeContributionAnalytics } from "./contributionAnalytics";
import { type PromptKind, type PromptLocale, promptTemplates } from "./promptLibrary";

const FREE_GENERATION_LIMIT = 10;
const DOCUMENT_UPLOAD_LIMIT = 3;
const DOCUMENT_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export function normalizeDatabaseTimestamp(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateUsageAllowance(input: { used: number; oldestGenerationAt?: Date | string | null; now?: Date; unlimited?: boolean; plan?: "weekly" | "monthly" }) {
  if (input.unlimited) {
    return { unlimited: true, limit: null, used: 0, remaining: null, resetsAt: null, plan: input.plan ?? "weekly" };
  }
  const now = input.now ?? new Date();
  const oldestGenerationAt = normalizeDatabaseTimestamp(input.oldestGenerationAt);
  const resetAt = oldestGenerationAt ? new Date(oldestGenerationAt.getTime() + 24 * 60 * 60 * 1000) : now;
  return { unlimited: false, limit: FREE_GENERATION_LIMIT, used: input.used, remaining: Math.max(0, FREE_GENERATION_LIMIT - input.used), resetsAt: resetAt, plan: "free" as const };
}

export function calculateDocumentUploadAllowance(input: { used: number; oldestUploadAt?: Date | string | null; now?: Date }) {
  const now = input.now ?? new Date();
  const oldestUploadAt = normalizeDatabaseTimestamp(input.oldestUploadAt);
  return {
    limit: DOCUMENT_UPLOAD_LIMIT,
    used: input.used,
    remaining: Math.max(0, DOCUMENT_UPLOAD_LIMIT - input.used),
    resetsAt: oldestUploadAt ? new Date(oldestUploadAt.getTime() + DOCUMENT_UPLOAD_WINDOW_MS) : now,
  };
}

export function generationEligibility(input: { privacyConsentAt?: Date | null; allowance: { unlimited: boolean; remaining: number | null } }) {
  if (!input.privacyConsentAt) return { allowed: false, reason: "privacy_consent_required" as const };
  if (!input.allowance.unlimited && (input.allowance.remaining ?? 0) < 1) return { allowed: false, reason: "allowance_exhausted" as const };
  return { allowed: true, reason: null } as const;
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getDocumentUploadAllowance(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return calculateDocumentUploadAllowance({ used: 0, now });
  const cutoff = new Date(now.getTime() - DOCUMENT_UPLOAD_WINDOW_MS);
  const events = await db.select({ createdAt: documentUploadEvents.createdAt }).from(documentUploadEvents).where(and(eq(documentUploadEvents.userId, userId), gte(documentUploadEvents.createdAt, cutoff))).orderBy(documentUploadEvents.createdAt);
  return calculateDocumentUploadAllowance({ used: events.length, oldestUploadAt: events[0]?.createdAt, now });
}

export async function listUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: uploadedDocuments.id, fileName: uploadedDocuments.fileName, mimeType: uploadedDocuments.mimeType, sizeBytes: uploadedDocuments.sizeBytes, createdAt: uploadedDocuments.createdAt }).from(uploadedDocuments).where(eq(uploadedDocuments.userId, userId)).orderBy(desc(uploadedDocuments.createdAt));
}

export async function createUploadedDocument(userId: number, input: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string; storageUrl: string }) {
  const db = await getDb();
  if (!db) throw new Error("Document storage is temporarily unavailable.");
  const id = nanoid();
  await db.insert(uploadedDocuments).values({ id, userId, ...input });
  await db.insert(documentUploadEvents).values({ id: nanoid(), userId, documentId: id });
  return { id, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, createdAt: new Date() };
}

export async function getUserDocument(userId: number, documentId: string) {
  const db = await getDb();
  if (!db) return null;
  const [document] = await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id, documentId), eq(uploadedDocuments.userId, userId))).limit(1);
  return document ?? null;
}

export async function removeUserDocument(userId: number, documentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Document storage is temporarily unavailable.");
  const document = await getUserDocument(userId, documentId);
  if (!document) throw new Error("That document is not available to you.");
  await db.delete(uploadedDocuments).where(eq(uploadedDocuments.id, documentId));
  return { success: true } as const;
}

export async function seedPromptLibrary() {
  const db = await getDb();
  if (!db) return;
  await db.insert(promptLibraryItems).values(promptTemplates.map(template => ({
    id: template.id,
    title: template.title,
    body: template.prompt,
    kind: template.kind,
    category: template.category,
    locale: template.locale,
    isBuiltIn: true,
    createdByUserId: null,
  }))).onDuplicateKeyUpdate({ set: { isBuiltIn: true } });
}

export async function listPromptLibrary(userId: number, input: { query?: string; kind?: PromptKind; locale?: PromptLocale; favoritesOnly?: boolean; tag?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  await seedPromptLibrary();
  const rows = await db.select({
    id: promptLibraryItems.id,
    title: promptLibraryItems.title,
    body: promptLibraryItems.body,
    kind: promptLibraryItems.kind,
    category: promptLibraryItems.category,
    locale: promptLibraryItems.locale,
    publicSlug: promptLibraryItems.publicSlug,
    isBuiltIn: promptLibraryItems.isBuiltIn,
    createdByUserId: promptLibraryItems.createdByUserId,
    favoriteId: promptLibraryFavorites.id,
  }).from(promptLibraryItems).leftJoin(promptLibraryFavorites, and(
    eq(promptLibraryFavorites.promptId, promptLibraryItems.id),
    eq(promptLibraryFavorites.userId, userId),
  )).where(or(
    and(eq(promptLibraryItems.isBuiltIn, true), eq(promptLibraryItems.locale, input.locale ?? "en")),
    eq(promptLibraryItems.createdByUserId, userId),
  )).orderBy(desc(promptLibraryItems.isBuiltIn), desc(promptLibraryItems.createdAt));
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  const ownedPromptIds = rows.filter(prompt => prompt.createdByUserId === userId).map(prompt => prompt.id);
  const tagsByPrompt = new Map<string, string[]>();
  const viewsByPrompt = new Map<string, number>();
  if (ownedPromptIds.length) {
    const tags = await db.select({ promptId: promptLibraryItemTags.promptId, name: promptLibraryTags.name }).from(promptLibraryItemTags).innerJoin(promptLibraryTags, eq(promptLibraryItemTags.tagId, promptLibraryTags.id)).where(and(inArray(promptLibraryItemTags.promptId, ownedPromptIds), eq(promptLibraryTags.userId, userId)));
    for (const tag of tags) tagsByPrompt.set(tag.promptId, [...(tagsByPrompt.get(tag.promptId) ?? []), tag.name]);
    const views = await db.select({ promptId: promptLibraryShareViews.promptId, count: sql<number>`count(*)` }).from(promptLibraryShareViews).where(inArray(promptLibraryShareViews.promptId, ownedPromptIds)).groupBy(promptLibraryShareViews.promptId);
    for (const view of views) viewsByPrompt.set(view.promptId, Number(view.count));
  }
  const selectedTag = input.tag?.trim().toLocaleLowerCase();
  return rows.filter(prompt => {
    const matchesKind = !input.kind || prompt.kind === input.kind;
    const haystack = `${prompt.title} ${prompt.body} ${prompt.category}`.toLocaleLowerCase();
    const tags = tagsByPrompt.get(prompt.id) ?? [];
    return matchesKind && (!input.favoritesOnly || Boolean(prompt.favoriteId)) && (!selectedTag || tags.includes(selectedTag)) && (!query || haystack.includes(query));
  }).map(({ favoriteId, createdByUserId, publicSlug, ...prompt }) => ({ ...prompt, tags: tagsByPrompt.get(prompt.id) ?? [], isFavorite: Boolean(favoriteId), isOwned: createdByUserId === userId, shareSlug: createdByUserId === userId ? publicSlug : null, viewCount: createdByUserId === userId ? viewsByPrompt.get(prompt.id) ?? 0 : 0 }));
}

export async function togglePromptLibraryFavorite(userId: number, promptId: string) {
  const db = await getDb();
  if (!db) throw new Error("Prompt Library is temporarily unavailable.");
  const [visiblePrompt] = await db.select({ id: promptLibraryItems.id }).from(promptLibraryItems).where(and(
    eq(promptLibraryItems.id, promptId),
    or(eq(promptLibraryItems.isBuiltIn, true), eq(promptLibraryItems.createdByUserId, userId)),
  )).limit(1);
  if (!visiblePrompt) throw new Error("That prompt is not available in your library.");
  const [existing] = await db.select({ id: promptLibraryFavorites.id }).from(promptLibraryFavorites).where(and(eq(promptLibraryFavorites.userId, userId), eq(promptLibraryFavorites.promptId, promptId))).limit(1);
  if (existing) {
    await db.delete(promptLibraryFavorites).where(eq(promptLibraryFavorites.id, existing.id));
    return { isFavorite: false } as const;
  }
  await db.insert(promptLibraryFavorites).values({ id: nanoid(), userId, promptId });
  return { isFavorite: true } as const;
}

export async function createUserPrompt(userId: number, input: { title: string; body: string; kind: PromptKind; category: string }) {
  const db = await getDb();
  if (!db) throw new Error("Prompt Library is temporarily unavailable.");
  const id = nanoid();
  await db.insert(promptLibraryItems).values({ ...input, id, locale: "en", isBuiltIn: false, createdByUserId: userId });
  return { id, ...input, locale: "en", isBuiltIn: false, isFavorite: false, isOwned: true };
}

export async function updateUserPrompt(userId: number, promptId: string, input: { title: string; body: string; kind: PromptKind; category: string }) {
  const db = await getDb();
  if (!db) throw new Error("Prompt Library is temporarily unavailable.");
  const [existing] = await db.select({ id: promptLibraryItems.id }).from(promptLibraryItems).where(and(eq(promptLibraryItems.id, promptId), eq(promptLibraryItems.createdByUserId, userId), eq(promptLibraryItems.isBuiltIn, false))).limit(1);
  if (!existing) throw new Error("That custom prompt is not available for editing.");
  await db.update(promptLibraryItems).set(input).where(eq(promptLibraryItems.id, promptId));
  return { id: promptId, ...input };
}

export async function deleteUserPrompt(userId: number, promptId: string) {
  const db = await getDb();
  if (!db) throw new Error("Prompt Library is temporarily unavailable.");
  const [existing] = await db.select({ id: promptLibraryItems.id }).from(promptLibraryItems).where(and(eq(promptLibraryItems.id, promptId), eq(promptLibraryItems.createdByUserId, userId), eq(promptLibraryItems.isBuiltIn, false))).limit(1);
  if (!existing) throw new Error("That custom prompt is not available for removal.");
  await db.delete(promptLibraryFavorites).where(eq(promptLibraryFavorites.promptId, promptId));
  await db.delete(promptLibraryItemTags).where(eq(promptLibraryItemTags.promptId, promptId));
  await db.delete(promptLibraryItems).where(eq(promptLibraryItems.id, promptId));
  return { success: true } as const;
}

function normalizePromptTags(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim().replace(/\s+/g, " ").toLocaleLowerCase()).filter(tag => tag.length >= 2 && tag.length <= 32))).slice(0, 8);
}

async function requireOwnedCustomPrompt(userId: number, promptId: string) {
  const db = await getDb();
  if (!db) throw new Error("Prompt Library is temporarily unavailable.");
  const [prompt] = await db.select({ id: promptLibraryItems.id, publicSlug: promptLibraryItems.publicSlug }).from(promptLibraryItems).where(and(eq(promptLibraryItems.id, promptId), eq(promptLibraryItems.createdByUserId, userId), eq(promptLibraryItems.isBuiltIn, false))).limit(1);
  if (!prompt) throw new Error("That custom prompt is not available to you.");
  return { db, prompt };
}

export async function setUserPromptTags(userId: number, promptId: string, tags: string[]) {
  const { db } = await requireOwnedCustomPrompt(userId, promptId);
  const names = normalizePromptTags(tags);
  await db.delete(promptLibraryItemTags).where(eq(promptLibraryItemTags.promptId, promptId));
  for (const name of names) {
    const [existing] = await db.select({ id: promptLibraryTags.id }).from(promptLibraryTags).where(and(eq(promptLibraryTags.userId, userId), eq(promptLibraryTags.name, name))).limit(1);
    const tagId = existing?.id ?? nanoid();
    if (!existing) await db.insert(promptLibraryTags).values({ id: tagId, userId, name });
    await db.insert(promptLibraryItemTags).values({ id: nanoid(), promptId, tagId }).onDuplicateKeyUpdate({ set: { promptId } });
  }
  return { tags: names };
}

export async function shareUserPrompt(userId: number, promptId: string) {
  const { db, prompt } = await requireOwnedCustomPrompt(userId, promptId);
  const slug = prompt.publicSlug ?? nanoid(16);
  if (!prompt.publicSlug) await db.update(promptLibraryItems).set({ publicSlug: slug }).where(eq(promptLibraryItems.id, promptId));
  return { slug };
}

export async function revokeUserPromptShare(userId: number, promptId: string) {
  const { db } = await requireOwnedCustomPrompt(userId, promptId);
  await db.update(promptLibraryItems).set({ publicSlug: null }).where(eq(promptLibraryItems.id, promptId));
  return { success: true } as const;
}

export async function getPublicPrompt(publicSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const [prompt] = await db.select({ id: promptLibraryItems.id, title: promptLibraryItems.title, body: promptLibraryItems.body, kind: promptLibraryItems.kind, category: promptLibraryItems.category }).from(promptLibraryItems).where(and(eq(promptLibraryItems.publicSlug, publicSlug), eq(promptLibraryItems.isBuiltIn, false))).limit(1);
  return prompt ?? null;
}

export async function recordPublicPromptView(promptId: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(promptLibraryShareViews).values({ id: nanoid(), promptId });
}

export async function getUserPromptShareAnalytics(userId: number, promptId: string) {
  const { db } = await requireOwnedCustomPrompt(userId, promptId);
  const [result] = await db.select({ views: sql<number>`count(*)` }).from(promptLibraryShareViews).where(eq(promptLibraryShareViews.promptId, promptId));
  return { views: Number(result?.views ?? 0) };
}

export async function getUserSharedPromptLeaderboard(userId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const views = sql<number>`count(${promptLibraryShareViews.id})`;
  const rows = await db.select({
    id: promptLibraryItems.id,
    title: promptLibraryItems.title,
    category: promptLibraryItems.category,
    kind: promptLibraryItems.kind,
    views,
  }).from(promptLibraryItems).innerJoin(promptLibraryShareViews, eq(promptLibraryShareViews.promptId, promptLibraryItems.id)).where(and(
    eq(promptLibraryItems.createdByUserId, userId),
    eq(promptLibraryItems.isBuiltIn, false),
    isNotNull(promptLibraryItems.publicSlug),
  )).groupBy(promptLibraryItems.id, promptLibraryItems.title, promptLibraryItems.category, promptLibraryItems.kind).orderBy(desc(views), asc(promptLibraryItems.title)).limit(limit);
  return rows.map(row => ({ ...row, views: Number(row.views) }));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getPreferencesForUser(userId: number) {
  const db = await getDb();
  if (!db) return { theme: "system" as const, locale: "en", weeklyGenerationGoal: DEFAULT_WEEKLY_GENERATION_GOAL, privacyConsentAt: null, privacyConsentVersion: null };
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0] ?? { theme: "system" as const, locale: "en", weeklyGenerationGoal: DEFAULT_WEEKLY_GENERATION_GOAL, privacyConsentAt: null, privacyConsentVersion: null };
}

export async function updatePreferencesForUser(
  userId: number,
  data: { theme?: "system" | "light" | "dark"; locale?: string; weeklyGenerationGoal?: number; acceptPrivacy?: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const values = {
    userId,
    theme: data.theme ?? "system",
    locale: data.locale ?? "en",
    weeklyGenerationGoal: data.weeklyGenerationGoal ?? DEFAULT_WEEKLY_GENERATION_GOAL,
    privacyConsentVersion: data.acceptPrivacy ? "2026-08" : null,
    privacyConsentAt: data.acceptPrivacy ? now : null,
  };
  await db.insert(userPreferences).values(values).onDuplicateKeyUpdate({
    set: {
      ...(data.theme ? { theme: data.theme } : {}),
      ...(data.locale ? { locale: data.locale } : {}),
      ...(data.weeklyGenerationGoal !== undefined ? { weeklyGenerationGoal: data.weeklyGenerationGoal } : {}),
      ...(data.acceptPrivacy ? { privacyConsentVersion: "2026-08", privacyConsentAt: now } : {}),
    },
  });
  return getPreferencesForUser(userId);
}

export async function getGenerationAllowance(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const [activePass] = await db.select().from(entitlements).where(and(
    eq(entitlements.userId, userId),
    eq(entitlements.status, "active"),
    gt(entitlements.expiresAt, now),
  )).limit(1);
  if (activePass) return { unlimited: true, limit: null, used: 0, remaining: null, resetsAt: activePass.expiresAt, plan: activePass.plan };

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [row] = await db.select({ count: sql<number>`count(*)`, oldest: sql<Date | null>`min(${generationUsages.createdAt})` }).from(generationUsages).where(and(
    eq(generationUsages.userId, userId),
    gte(generationUsages.createdAt, since),
  ));
  return calculateUsageAllowance({ used: Number(row?.count ?? 0), oldestGenerationAt: row?.oldest, now });
}

export async function recordGenerationUsage(userId: number, kind: "blog" | "email" | "code" | "image") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(generationUsages).values({ userId, kind });
  return getGenerationAllowance(userId);
}

export async function getContributionAnalytics(userId: number) {
  const db = await getDb();
  if (!db) return summarizeContributionAnalytics([]);
  const now = new Date();
  const periodStart = contributionAnalyticsStart(now);
  const streakStart = contributionStreakStart(now);
  const queryStart = streakStart < periodStart ? streakStart : periodStart;
  const records = await db.select({ kind: generationUsages.kind, createdAt: generationUsages.createdAt }).from(generationUsages).where(and(
    eq(generationUsages.userId, userId),
    gte(generationUsages.createdAt, queryStart),
  ));
  const [preferences] = await db.select({ weeklyGenerationGoal: userPreferences.weeklyGenerationGoal }).from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return summarizeContributionAnalytics(records, now, preferences?.weeklyGenerationGoal ?? DEFAULT_WEEKLY_GENERATION_GOAL);
}

export async function listDraftsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentDrafts).where(eq(contentDrafts.userId, userId)).orderBy(desc(contentDrafts.updatedAt));
}

export async function getDraftForUser(id: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentDrafts).where(and(eq(contentDrafts.id, id), eq(contentDrafts.userId, userId))).limit(1);
  return result[0];
}

export async function getPublicDraft(publicSlug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentDrafts).where(eq(contentDrafts.publicSlug, publicSlug)).limit(1);
  return result[0];
}

export async function createDraft(input: {
  userId: number;
  kind: "blog" | "email" | "code" | "image";
  title: string;
  prompt: string;
  language: string;
  body?: string | null;
  imageUrl?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const id = nanoid();
  await db.insert(contentDrafts).values({ id, ...input });
  return getDraftForUser(id, input.userId);
}

export async function updateDraftContent(input: { id: string; userId: number; prompt?: string; body?: string | null; imageUrl?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(contentDrafts).set({
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
  }).where(and(eq(contentDrafts.id, input.id), eq(contentDrafts.userId, input.userId)));
  return getDraftForUser(input.id, input.userId);
}

export async function addDraftRevision(input: { draftId: string; instruction: string; body?: string | null; imageUrl?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(draftRevisions).values({ id: nanoid(), ...input });
}

export async function listRevisions(draftId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftRevisions).where(eq(draftRevisions.draftId, draftId)).orderBy(desc(draftRevisions.createdAt));
}

export async function publishDraft(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const draft = await getDraftForUser(id, userId);
  if (!draft) return undefined;
  const publicSlug = draft.publicSlug ?? nanoid(16);
  if (!draft.publicSlug) await db.update(contentDrafts).set({ publicSlug }).where(and(eq(contentDrafts.id, id), eq(contentDrafts.userId, userId)));
  return publicSlug;
}

export function maskVoucherCode(rawCode: string) {
  const cleaned = rawCode.replace(/\s/g, "");
  return `•••• ${cleaned.slice(-4)}`;
}

export function createPayShapReference() {
  return `KAM-${nanoid(10).toUpperCase()}`;
}

export async function createPayShapPaymentRequest(input: { userId: number; plan: "weekly" | "monthly" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const amountCents = input.plan === "weekly" ? 5000 : 15000;
  const id = nanoid();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  await db.insert(payShapPaymentRequests).values({
    id,
    userId: input.userId,
    plan: input.plan,
    paymentReference: createPayShapReference(),
    amountCents,
    expiresAt,
  });
  const [request] = await db.select().from(payShapPaymentRequests).where(eq(payShapPaymentRequests.id, id)).limit(1);
  return request;
}

export async function listPayShapRequestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payShapPaymentRequests).where(eq(payShapPaymentRequests.userId, userId)).orderBy(desc(payShapPaymentRequests.createdAt));
}

export async function requestAccountDeletion(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [existing] = await db.select().from(accountDeletionRequests).where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "pending"))).orderBy(desc(accountDeletionRequests.requestedAt)).limit(1);
  if (existing) return existing;
  const id = nanoid();
  await db.insert(accountDeletionRequests).values({ id, userId });
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, id)).limit(1);
  const user = await getUserById(userId);
  if (user?.email) {
    void sendTransactionalEmail({
      to: user.email,
      subject: "We received your Kamvai account-deletion request",
      text: "We received your request to delete your Kamvai account data. This request is now pending review. You will receive a further update when it is processed.",
      html: "<p>We received your request to delete your Kamvai account data.</p><p>This request is now pending review. You will receive a further update when it is processed.</p>",
      category: "privacy-request",
    }).catch(error => console.error("[Email] Account-deletion acknowledgement could not be sent:", error instanceof Error ? error.message : error));
  }
  return request;
}

export async function getAccountDeletionRequestForUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.userId, userId)).orderBy(desc(accountDeletionRequests.requestedAt)).limit(1);
  return request ?? null;
}

export async function listOpenAccountDeletionRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.status, "pending")).orderBy(desc(accountDeletionRequests.requestedAt));
}

export async function resolveAccountDeletionRequest(input: { requestId: string; adminUserId: number; outcome: "in_review" | "completed" | "declined"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, input.requestId)).limit(1);
  if (!request) throw new Error("Deletion request not found.");
  if (request.status === "completed" || request.status === "declined") throw new Error("This deletion request has already been resolved.");
  const resolvedAt = input.outcome === "in_review" ? null : new Date();
  await db.update(accountDeletionRequests).set({ status: input.outcome, resolvedAt, resolvedByUserId: input.adminUserId, resolutionNote: input.note?.trim() || null }).where(eq(accountDeletionRequests.id, input.requestId));
  return { ...request, status: input.outcome, resolvedAt, resolvedByUserId: input.adminUserId, resolutionNote: input.note?.trim() || null };
}

export async function listOpenPayShapRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payShapPaymentRequests).where(eq(payShapPaymentRequests.status, "pending")).orderBy(desc(payShapPaymentRequests.createdAt));
}

export async function reconcilePayShapRequest(input: { requestId: string; adminUserId: number; outcome: "confirmed" | "rejected"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [request] = await db.select().from(payShapPaymentRequests).where(eq(payShapPaymentRequests.id, input.requestId)).limit(1);
  if (!request) throw new Error("Payment request not found.");
  if (request.status !== "pending") throw new Error("Only pending payment requests can be reconciled.");
  if (request.expiresAt < new Date()) {
    await db.update(payShapPaymentRequests).set({ status: "expired" }).where(eq(payShapPaymentRequests.id, request.id));
    throw new Error("This payment request has expired.");
  }
  const reconciledAt = new Date();
  await db.update(payShapPaymentRequests).set({ status: input.outcome, reconciledAt, reconciledByUserId: input.adminUserId, reconciliationNote: input.note?.trim() || null }).where(and(eq(payShapPaymentRequests.id, request.id), eq(payShapPaymentRequests.status, "pending")));
  if (input.outcome === "confirmed") {
    const duration = request.plan === "weekly" ? 7 : 30;
    const expiresAt = new Date(reconciledAt.getTime() + duration * 24 * 60 * 60 * 1000);
    await db.insert(entitlements).values({ id: nanoid(), userId: request.userId, plan: request.plan, status: "active", startedAt: reconciledAt, expiresAt, provider: "payshap_manual", providerReference: request.paymentReference });
    const user = await getUserById(request.userId);
    if (user?.email) {
      const passName = request.plan === "weekly" ? "weekly" : "monthly";
      const expiry = expiresAt.toLocaleDateString("en-ZA", { dateStyle: "long" });
      void sendTransactionalEmail({
        to: user.email,
        subject: `Your Kamvai ${passName} pass is active`,
        text: `Your PayShap payment has been confirmed. Your ${passName} Kamvai pass is now active until ${expiry}.`,
        html: `<p>Your PayShap payment has been confirmed.</p><p>Your <strong>${passName}</strong> Kamvai pass is now active until <strong>${expiry}</strong>.</p>`,
        category: "payment-confirmation",
      }).catch(error => console.error("[Email] Payment confirmation could not be sent:", error instanceof Error ? error.message : error));
    }
  }
  return { ...request, status: input.outcome, reconciledAt, reconciledByUserId: input.adminUserId, reconciliationNote: input.note?.trim() || null };
}

export async function createVoucherAttempt(input: {
  userId: number;
  plan: "weekly" | "monthly";
  voucherBrand: "kazang" | "oneforyou" | "blue" | "ott";
  rawVoucherCode: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const amountCents = input.plan === "weekly" ? 5000 : 15000;
  const maskedVoucherCode = maskVoucherCode(input.rawVoucherCode);
  const id = nanoid();
  await db.insert(voucherRedemptionAttempts).values({
    id,
    userId: input.userId,
    plan: input.plan,
    voucherBrand: input.voucherBrand,
    maskedVoucherCode,
    amountCents,
    status: "pending",
  });
  const result = await db.select().from(voucherRedemptionAttempts).where(eq(voucherRedemptionAttempts.id, id)).limit(1);
  return result[0];
}

export async function listVoucherAttemptsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voucherRedemptionAttempts).where(eq(voucherRedemptionAttempts.userId, userId)).orderBy(desc(voucherRedemptionAttempts.createdAt));
}
