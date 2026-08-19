const OTP_EXPIRY_MINUTES = 10;
const SENDER_VERIFICATION_CACHE_MS = 10 * 60 * 1000;
let verifiedSenderUntil = 0;

type OtpEmailInput = { to: string; firstName?: string | null; code: string; supportLink: string };
type TransactionalEmailInput = { to: string; subject: string; text: string; html: string; category: "payment-confirmation" | "privacy-request" };

export function getSendGridOtpConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  const templateId = process.env.SENDGRID_OTP_TEMPLATE_ID;
  if (!apiKey || !from || !templateId) return null;
  return { apiKey, from, templateId };
}

async function assertVerifiedSender(config: NonNullable<ReturnType<typeof getSendGridOtpConfig>>) {
  if (Date.now() < verifiedSenderUntil) return;
  const response = await fetch("https://api.sendgrid.com/v3/verified_senders?limit=500", {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) throw new Error("SendGrid sender verification could not be confirmed. Check the API key permissions.");
  const data = await response.json() as { results?: Array<{ from_email?: string; verified?: boolean }> };
  const sender = data.results?.find(entry => entry.from_email?.toLowerCase() === config.from.toLowerCase());
  if (!sender?.verified) throw new Error("The configured SendGrid sender address is not verified. Verify it before sending OTP emails.");
  verifiedSenderUntil = Date.now() + SENDER_VERIFICATION_CACHE_MS;
}

export async function sendOtpEmail(input: OtpEmailInput) {
  const config = getSendGridOtpConfig();
  if (!config) throw new Error("SendGrid OTP delivery is not ready. Configure a verified sender address and dynamic-template ID first.");
  await assertVerifiedSender(config);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: config.from, name: "Kamvai" },
      personalizations: [{
        to: [{ email: input.to }],
        dynamic_template_data: {
          first_name: input.firstName?.trim() || "there",
          code: input.code,
          expiry_minutes: OTP_EXPIRY_MINUTES,
          support_link: input.supportLink,
        },
      }],
      template_id: config.templateId,
      categories: ["otp-verification"],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid rejected the OTP email request (${response.status}).`);
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const config = getSendGridOtpConfig();
  if (!config) throw new Error("SendGrid delivery is not ready. Configure a verified sender address and API credential first.");
  await assertVerifiedSender(config);
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: config.from, name: "Kamvai" },
      personalizations: [{ to: [{ email: input.to }] }],
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        { type: "text/html", value: input.html },
      ],
      categories: [input.category],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid rejected the transactional email request (${response.status}).`);
}

export { OTP_EXPIRY_MINUTES };
