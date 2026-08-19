import { describe, expect, it } from "vitest";
import { hashOtp, hashPassword, normalizeEmail, verifyPassword } from "./emailAuth";

describe("email authentication safety primitives", () => {
  it("normalizes email addresses before creating account lookups", () => {
    expect(normalizeEmail("  THANDO@Example.CO.ZA ")).toBe("thando@example.co.za");
  });

  it("stores passwords as non-reversible, salt-bearing hashes", async () => {
    const password = "A-longer-password-for-testing";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect-password", hash)).resolves.toBe(false);
  });

  it("does not retain raw OTP values in the hash output", () => {
    const code = "482913";
    expect(hashOtp(code)).not.toContain(code);
  });
});
