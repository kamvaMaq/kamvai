import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { and, desc, eq, gt, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emailAuthAccounts, emailOtpChallenges, users } from "../drizzle/schema";
import { getDb, upsertUser } from "./db";
import { OTP_EXPIRY_MINUTES, sendOtpEmail } from "./sendgrid";

const scrypt = promisify(scryptCallback);
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_SENDS_PER_HOUR = 5;

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function makeOtpCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
export function hashOtp(code: string) { return createHash("sha256").update(`${process.env.JWT_SECRET ?? "kamvai"}:${code}`).digest("hex"); }

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

export async function requestEmailOtp(input: { email: string; firstName?: string; password: string; supportLink: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeEmail(input.email);
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.select().from(emailOtpChallenges).where(and(eq(emailOtpChallenges.email, email), gte(emailOtpChallenges.createdAt, since)));
  if (recent.length >= MAX_OTP_SENDS_PER_HOUR) throw new Error("Too many verification emails have been requested. Try again in an hour.");
  const [existing] = await db.select().from(emailAuthAccounts).where(eq(emailAuthAccounts.email, email)).limit(1);
  if (existing) throw new Error("An account already exists for this email. Sign in with your password instead.");

  const code = makeOtpCode();
  const passwordHash = await hashPassword(input.password);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(emailOtpChallenges).values({
    id: nanoid(), email, purpose: "signup", codeHash: hashOtp(code), firstName: input.firstName?.trim() || null,
    pendingPasswordHash: passwordHash, expiresAt,
  });
  await sendOtpEmail({ to: email, firstName: input.firstName, code, supportLink: input.supportLink });
  return { email, expiresAt };
}

export async function verifyEmailOtp(input: { email: string; code: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeEmail(input.email);
  const [challenge] = await db.select().from(emailOtpChallenges).where(and(eq(emailOtpChallenges.email, email), eq(emailOtpChallenges.status, "pending"))).orderBy(desc(emailOtpChallenges.createdAt)).limit(1);
  if (!challenge || challenge.expiresAt < new Date()) throw new Error("This verification code has expired. Request a new one.");
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) throw new Error("Too many invalid codes. Request a new verification email.");
  if (hashOtp(input.code) !== challenge.codeHash) {
    await db.update(emailOtpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(emailOtpChallenges.id, challenge.id));
    throw new Error("The verification code is incorrect.");
  }
  if (!challenge.pendingPasswordHash) throw new Error("This verification request cannot be completed. Request a new email.");
  const openId = `email:${email}`;
  await upsertUser({ openId, name: challenge.firstName ?? null, email, loginMethod: "email" });
  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!user) throw new Error("Could not create the email account.");
  await db.insert(emailAuthAccounts).values({ userId: user.id, email, passwordHash: challenge.pendingPasswordHash, verifiedAt: new Date() });
  await db.update(emailOtpChallenges).set({ status: "verified" }).where(eq(emailOtpChallenges.id, challenge.id));
  return user;
}

export async function authenticateEmailPassword(input: { email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeEmail(input.email);
  const [account] = await db.select().from(emailAuthAccounts).where(eq(emailAuthAccounts.email, email)).limit(1);
  if (!account || !account.verifiedAt || !(await verifyPassword(input.password, account.passwordHash))) throw new Error("Invalid email or password.");
  const [user] = await db.select().from(users).where(eq(users.id, account.userId)).limit(1);
  if (!user) throw new Error("Account not found.");
  return user;
}
