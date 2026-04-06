function getPostalConfig(): { url: string; apiKey: string } {
  const url = process.env.POSTAL_URL?.trim();
  const apiKey = process.env.POSTAL_API_KEY?.trim();
  if (!url || !apiKey) throw new Error("Postal not configured. Set POSTAL_URL and POSTAL_API_KEY.");
  return { url: url.replace(/\/+$/, ""), apiKey };
}

function getFromEmail(): string {
  return process.env.POSTAL_FROM_EMAIL || "notifications@projectos.dev";
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const { url, apiKey } = getPostalConfig();

  const htmlBody = `<div style="font-family:sans-serif;padding:20px;"><h2 style="color:#6366f1;">${subject}</h2><p>${body.replace(/\n/g, "<br>")}</p><hr style="border-color:#e5e7eb;"><p style="font-size:12px;color:#9ca3af;">Sent by ProjectOS</p></div>`;

  const response = await fetch(`${url}/api/v1/send/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Server-API-Key": apiKey,
    },
    body: JSON.stringify({
      to: [to],
      from: getFromEmail(),
      subject,
      plain_body: body,
      html_body: htmlBody,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Postal error (${response.status}): ${text}`);
  }

  const result = await response.json().catch(() => null);
  if (result && result.status === "error") {
    throw new Error(`Postal error: ${result.data?.message || JSON.stringify(result)}`);
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.POSTAL_URL?.trim() && process.env.POSTAL_API_KEY?.trim());
}
