import { Resend } from "resend";

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "notifications@projectos.dev";
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const client = getClient();
  const { error } = await client.emails.send({
    from: getFromEmail(),
    to,
    subject,
    text: body,
    html: `<div style="font-family:sans-serif;padding:20px;"><h2 style="color:#6366f1;">${subject}</h2><p>${body.replace(/\n/g, "<br>")}</p><hr style="border-color:#e5e7eb;"><p style="font-size:12px;color:#9ca3af;">Sent by ProjectOS</p></div>`,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}
