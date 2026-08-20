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
  weeklyGenerationGoal: int("weeklyGenerationGoal").default(5).notNull(),
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

export const emailAuthAccounts = mysqlTable("email_auth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdIndex: uniqueIndex("email_auth_accounts_user_id_idx").on(table.userId),
}));

export const emailOtpChallenges = mysqlTable("email_otp_challenges", {
  id: varchar("id", { length: 32 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  purpose: mysqlEnum("purpose", ["signup", "login"]).notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  firstName: varchar("firstName", { length: 120 }),
  pendingPasswordHash: varchar("pendingPasswordHash", { length: 255 }),
  attempts: int("attempts").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "verified", "cancelled"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  emailCreatedAt: index("email_otp_challenges_email_created_idx").on(table.email, table.createdAt),
}));

export const payShapPaymentRequests = mysqlTable("payshap_payment_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["weekly", "monthly"]).notNull(),
  paymentReference: varchar("paymentReference", { length: 40 }).notNull().unique(),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "rejected", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  reconciledAt: timestamp("reconciledAt"),
  reconciledByUserId: int("reconciledByUserId"),
  reconciliationNote: varchar("reconciliationNote", { length: 280 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdCreatedAt: index("payshap_requests_user_created_idx").on(table.userId, table.createdAt),
  statusCreatedAt: index("payshap_requests_status_created_idx").on(table.status, table.createdAt),
}));

export const accountDeletionRequests = mysqlTable("account_deletion_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "in_review", "completed", "declined"]).default("pending").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedByUserId: int("resolvedByUserId"),
  resolutionNote: varchar("resolutionNote", { length: 280 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdCreatedAt: index("account_deletion_requests_user_created_idx").on(table.userId, table.createdAt),
  statusRequestedAt: index("account_deletion_requests_status_requested_idx").on(table.status, table.requestedAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ContentDraft = typeof contentDrafts.$inferSelect;
