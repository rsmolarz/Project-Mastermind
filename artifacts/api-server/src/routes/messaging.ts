import { Router, type IRouter, type Request, type Response } from "express";
import { db, contactsTable, messagesTable } from "@workspace/db";
import { eq, desc, or, ilike, sql, and } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID not configured");
  }
  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  if (authToken) {
    return twilio(accountSid, authToken);
  }
  throw new Error("Twilio credentials not configured — need either API Key or Auth Token");
}

function getAccountClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required for account queries");
  }
  return twilio(accountSid, authToken);
}

function getTwilioPhone(): string {
  return process.env.TWILIO_PHONE_NUMBER || "+19035225399";
}

router.get("/messaging/status", async (_req, res): Promise<void> => {
  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  let accountInfo = null;
  let phoneNumbers: any[] = [];

  if (configured) {
    try {
      const client = getAccountClient();
      const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
      phoneNumbers = numbers.map(n => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        capabilities: n.capabilities,
      }));
      accountInfo = {
        friendlyName: "ProjectOS Twilio",
        status: "active",
        type: "Full",
        phoneCount: numbers.length,
      };
    } catch (e: any) {
      try {
        const client = getTwilioClient();
        const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
        phoneNumbers = numbers.map(n => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          capabilities: n.capabilities,
        }));
        accountInfo = {
          friendlyName: "ProjectOS Twilio",
          status: "active (API Key)",
          type: "Full",
          phoneCount: numbers.length,
        };
      } catch (e2: any) {
        accountInfo = {
          error: e2.message,
          code: e2.code,
          hint: "Check that TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct. The auth token may need to be refreshed from your Twilio console.",
        };
      }
    }
  }

  const totalMessages = await db.select({ count: sql<number>`count(*)` }).from(messagesTable);
  const totalContacts = await db.select({ count: sql<number>`count(*)` }).from(contactsTable);

  res.json({
    configured,
    twilioPhone: getTwilioPhone(),
    accountInfo,
    phoneNumbers,
    stats: {
      totalMessages: Number(totalMessages[0]?.count || 0),
      totalContacts: Number(totalContacts[0]?.count || 0),
    },
  });
});

router.get("/contacts", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  let contacts;
  if (search) {
    contacts = await db.select().from(contactsTable)
      .where(or(
        ilike(contactsTable.name, `%${search}%`),
        ilike(contactsTable.email, `%${search}%`),
        ilike(contactsTable.phone, `%${search}%`),
        ilike(contactsTable.company, `%${search}%`),
      ))
      .orderBy(desc(contactsTable.createdAt));
  } else {
    contacts = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));
  }
  res.json(contacts);
});

router.post("/contacts", async (req, res): Promise<void> => {
  const { name, email, phone, company, role, tags, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [contact] = await db.insert(contactsTable).values({
    name, email, phone, company, role,
    tags: tags || [],
    notes,
  }).returning();
  res.json(contact);
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, email, phone, company, role, tags, notes } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (company !== undefined) updates.company = company;
  if (role !== undefined) updates.role = role;
  if (tags !== undefined) updates.tags = tags;
  if (notes !== undefined) updates.notes = notes;
  const [contact] = await db.update(contactsTable).set(updates).where(eq(contactsTable.id, id)).returning();
  res.json(contact);
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.json({ success: true });
});

router.post("/messaging/sms", async (req, res): Promise<void> => {
  const { to, body, contactId } = req.body;
  if (!to || !body) {
    res.status(400).json({ error: "Phone number (to) and message body are required" });
    return;
  }

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      from: getTwilioPhone(),
      to,
    });

    const [saved] = await db.insert(messagesTable).values({
      contactId: contactId || null,
      direction: "outbound",
      channel: "sms",
      from: getTwilioPhone(),
      to,
      body,
      status: message.status,
      twilioSid: message.sid,
      metadata: { numSegments: message.numSegments, price: message.price },
    }).returning();

    res.json({ success: true, message: saved, twilioStatus: message.status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/messaging/call", async (req, res): Promise<void> => {
  const { to, message, contactId } = req.body;
  if (!to) {
    res.status(400).json({ error: "Phone number (to) is required" });
    return;
  }

  try {
    const client = getTwilioClient();
    const twiml = message
      ? `<Response><Say voice="alice">${message}</Say></Response>`
      : `<Response><Say voice="alice">Hello, this is a call from ProjectOS.</Say></Response>`;

    const call = await client.calls.create({
      twiml,
      from: getTwilioPhone(),
      to,
    });

    const [saved] = await db.insert(messagesTable).values({
      contactId: contactId || null,
      direction: "outbound",
      channel: "voice",
      from: getTwilioPhone(),
      to,
      body: message || "Voice call initiated",
      status: call.status,
      twilioSid: call.sid,
      metadata: { duration: call.duration },
    }).returning();

    res.json({ success: true, message: saved, twilioStatus: call.status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/messaging/email", async (req, res): Promise<void> => {
  const { to, subject, body, contactId } = req.body;
  if (!to || !subject || !body) {
    res.status(400).json({ error: "To, subject, and body are required" });
    return;
  }

  try {
    const client = getTwilioClient();
    const fromPhone = getTwilioPhone();

    const message = await client.messages.create({
      body: `[Email via SMS] Subject: ${subject}\n\n${body}`,
      from: fromPhone,
      to,
    });

    const [saved] = await db.insert(messagesTable).values({
      contactId: contactId || null,
      direction: "outbound",
      channel: "email",
      from: fromPhone,
      to,
      subject,
      body,
      status: message.status,
      twilioSid: message.sid,
    }).returning();

    res.json({ success: true, message: saved });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/messaging/history", async (req, res): Promise<void> => {
  const channel = req.query.channel as string | undefined;
  const contactId = req.query.contactId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  const conditions = [];
  if (channel) conditions.push(eq(messagesTable.channel, channel));
  if (contactId) conditions.push(eq(messagesTable.contactId, parseInt(contactId)));

  const messages = conditions.length > 0
    ? await db.select().from(messagesTable).where(and(...conditions)).orderBy(desc(messagesTable.createdAt)).limit(limit)
    : await db.select().from(messagesTable).orderBy(desc(messagesTable.createdAt)).limit(limit);

  res.json(messages);
});

router.get("/messaging/history/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }

  if (message.twilioSid) {
    try {
      const client = getAccountClient();
      if (message.channel === "voice") {
        const call = await client.calls(message.twilioSid).fetch();
        res.json({ ...message, liveStatus: call.status, duration: call.duration, price: call.price });
        return;
      } else {
        const msg = await client.messages(message.twilioSid).fetch();
        res.json({ ...message, liveStatus: msg.status, price: msg.price, errorCode: msg.errorCode, errorMessage: msg.errorMessage });
        return;
      }
    } catch (e: any) {
      res.json({ ...message, liveStatusError: e.message });
      return;
    }
  }

  res.json(message);
});

router.get("/messaging/twilio/messages", async (_req, res): Promise<void> => {
  try {
    const client = getAccountClient();
    const messages = await client.messages.list({ limit: 50 });
    res.json(messages.map(m => ({
      sid: m.sid,
      from: m.from,
      to: m.to,
      body: m.body,
      status: m.status,
      direction: m.direction,
      dateSent: m.dateSent,
      price: m.price,
      numSegments: m.numSegments,
      errorCode: m.errorCode,
      errorMessage: m.errorMessage,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/messaging/twilio/calls", async (_req, res): Promise<void> => {
  try {
    const client = getAccountClient();
    const calls = await client.calls.list({ limit: 50 });
    res.json(calls.map(c => ({
      sid: c.sid,
      from: c.from,
      to: c.to,
      status: c.status,
      direction: c.direction,
      duration: c.duration,
      startTime: c.startTime,
      endTime: c.endTime,
      price: c.price,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

function validateTwilioSignature(req: Request): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) return false;
  const signature = req.headers["x-twilio-signature"] as string;
  if (!signature) return false;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost";
  const url = `${protocol}://${host}${req.originalUrl}`;
  return twilio.validateRequest(authToken, signature, url, req.body);
}

router.post("/messaging/webhook/incoming", async (req, res): Promise<void> => {
  if (!validateTwilioSignature(req)) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  const { From, To, Body, MessageSid, NumMedia } = req.body;

  if (Body && From) {
    let contactId = null;
    const [existingContact] = await db.select().from(contactsTable).where(eq(contactsTable.phone, From));
    if (existingContact) contactId = existingContact.id;

    await db.insert(messagesTable).values({
      contactId,
      direction: "inbound",
      channel: "sms",
      from: From,
      to: To || getTwilioPhone(),
      body: Body,
      status: "received",
      twilioSid: MessageSid,
      metadata: { numMedia: NumMedia },
    });
  }

  res.type("text/xml").send("<Response></Response>");
});

router.post("/messaging/webhook/voice", async (req, res): Promise<void> => {
  if (!validateTwilioSignature(req)) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  const { From, To, CallSid, CallStatus } = req.body;

  if (From && CallSid) {
    let contactId = null;
    const [existingContact] = await db.select().from(contactsTable).where(eq(contactsTable.phone, From));
    if (existingContact) contactId = existingContact.id;

    await db.insert(messagesTable).values({
      contactId,
      direction: "inbound",
      channel: "voice",
      from: From,
      to: To || getTwilioPhone(),
      body: `Incoming call - ${CallStatus}`,
      status: CallStatus || "ringing",
      twilioSid: CallSid,
    });
  }

  res.type("text/xml").send('<Response><Say voice="alice">Thank you for calling ProjectOS. We will get back to you shortly.</Say></Response>');
});

export default router;
