import Twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (!accountSid) throw new Error("TWILIO_ACCOUNT_SID not configured");
  if (apiKeySid && apiKeySecret) return Twilio(apiKeySid, apiKeySecret, { accountSid });
  if (authToken) return Twilio(accountSid, authToken);
  throw new Error("Twilio credentials not configured");
}

function getFromPhone(): string {
  return process.env.TWILIO_PHONE_NUMBER || "+19035225399";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSMS(to: string, body: string): Promise<string> {
  const client = getTwilioClient();
  const message = await client.messages.create({
    to,
    from: getFromPhone(),
    body,
  });
  return message.sid;
}

export async function makeVoiceCall(to: string, message: string): Promise<string> {
  const client = getTwilioClient();
  const twiml = `<Response><Say voice="alice" language="en-US">${escapeXml(message)}</Say></Response>`;
  const call = await client.calls.create({
    to,
    from: getFromPhone(),
    twiml,
  });
  return call.sid;
}
