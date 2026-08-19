import { describe, expect, it } from "vitest";
import { getSendGridOtpConfig } from "./sendgrid";

describe("SendGrid transactional delivery configuration", () => {
  it("has the verified sender, API key, and template configuration required for OTP and transactional mail", () => {
    const config = getSendGridOtpConfig();
    expect(config).toMatchObject({
      from: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      templateId: expect.stringMatching(/^d-[a-f0-9]{32}$/),
    });
    expect(config?.apiKey.length).toBeGreaterThan(20);
  });
});
