import sgMail from "@sendgrid/mail";

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");
  sgMail.setApiKey(apiKey);
  initialized = true;
}

function getFromEmail(): string {
  return process.env.SENDGRID_FROM_EMAIL || "reminders@projectos.dev";
}

export async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  ensureInit();
  await sgMail.send({
    to,
    from: getFromEmail(),
    subject,
    text: body,
    html: `<div style="font-family:sans-serif;padding:20px;"><h2 style="color:#6366f1;">${subject}</h2><p>${body.replace(/\n/g, "<br>")}</p><hr style="border-color:#e5e7eb;"><p style="font-size:12px;color:#9ca3af;">Sent by ProjectOS</p></div>`,
  });
}

export function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY?.trim();
}
