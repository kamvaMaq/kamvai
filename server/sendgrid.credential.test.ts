import { describe, expect, it } from "vitest";

describe("SendGrid credential", () => {
  it("authenticates against SendGrid's lightweight profile endpoint", async () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const sender = process.env.SENDGRID_FROM_EMAIL;
    const templateId = process.env.SENDGRID_OTP_TEMPLATE_ID;
    expect(apiKey, "SENDGRID_API_KEY must be configured").toBeTruthy();
    expect(sender, "SENDGRID_FROM_EMAIL must be configured").toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(templateId, "SENDGRID_OTP_TEMPLATE_ID must be configured").toMatch(/^d-[a-f0-9]{32}$/);

    const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.status, "SendGrid key should authenticate successfully").toBeLessThan(400);

    const senderResponse = await fetch("https://api.sendgrid.com/v3/verified_senders?limit=500", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(senderResponse.status, "SendGrid key should be allowed to inspect verified senders").toBeLessThan(400);
    const senderData = await senderResponse.json() as { results?: Array<{ from_email?: string; verified?: boolean }> };
    const matchingSender = senderData.results?.find(entry => entry.from_email?.toLowerCase() === sender?.toLowerCase());
    expect(matchingSender?.verified, "SENDGRID_FROM_EMAIL must be verified in SendGrid before OTP delivery").toBe(true);
  }, 15_000);
});
