import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  theme: mysqlEnum("theme", ["system", "light", "dark"]).default("system").notNull(),
  locale: varchar("locale", { length: 16 }).default("en").notNull(),
  privacyConsentVersion: varchar("privacyConsentVersion", { length: 32 }),
  privacyConsentAt: timestamp("privacyConsentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdUnique: uniqueIndex("user_preferences_user_id_idx").on(table.userId),
}));

export const contentDrafts = mysqlTable("content_drafts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  kind: mysqlEnum("kind", ["blog", "email", "code", "image"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  prompt: text("prompt").notNull(),
  language: varchar("language", { length: 32 }).default("en").notNull(),
  body: text("body"),
  imageUrl: text("imageUrl"),
  publicSlug: varchar("publicSlug", { length: 40 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdCreatedAt: index("content_drafts_user_created_idx").on(table.userId, table.createdAt),
}));

export const draftRevisions = mysqlTable("draft_revisions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  draftId: varchar("draftId", { length: 32 }).notNull(),
  instruction: text("instruction").notNull(),
  body: text("body"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  draftIdCreatedAt: index("draft_revisions_draft_created_idx").on(table.draftId, table.createdAt),
}));

export const generationUsages = mysqlTable("generation_usages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kind: mysqlEnum("kind", ["blog", "email", "code", "image"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdCreatedAt: index("generation_usages_user_created_idx").on(table.userId, table.createdAt),
}));

export const entitlements = mysqlTable("entitlements", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["weekly", "monthly"]).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  provider: varchar("provider", { length: 64 }),
  providerReference: varchar("providerReference", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdExpiresAt: index("entitlements_user_expiry_idx").on(table.userId, table.expiresAt),
}));

export const voucherRedemptionAttempts = mysqlTable("voucher_redemption_attempts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["weekly", "monthly"]).notNull(),
  voucherBrand: mysqlEnum("voucherBrand", ["kazang", "oneforyou", "blue", "ott"]).notNull(),
  maskedVoucherCode: varchar("maskedVoucherCode", { length: 32 }).notNull(),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "failed"]).default("pending").notNull(),
  provider: varchar("provider", { length: 64 }),
  providerReference: varchar("providerReference", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdCreatedAt: index("voucher_redemptions_user_created_idx").on(table.userId, table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ContentDraft = typeof contentDrafts.$inferSelect;
