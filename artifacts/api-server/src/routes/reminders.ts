import { Router, type IRouter } from "express";
import { db, remindersTable, notificationsTable } from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (!accountSid) throw new Error("TWILIO_ACCOUNT_SID not configured");
  if (apiKeySid && apiKeySecret) return twilio(apiKeySid, apiKeySecret, { accountSid });
  if (authToken) return twilio(accountSid, authToken);
  throw new Error("Twilio credentials not configured");
}

async function dispatchReminder(reminder: any): Promise<void> {
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "+19035225399";

  try {
    switch (reminder.notificationType) {
      case "sms": {
        const client = getTwilioClient();
        await client.messages.create({
          to: reminder.target,
          from: twilioPhone,
          body: `📋 Reminder: ${reminder.title}\n${reminder.message}`,
        });
        break;
      }
      case "call": {
        const client = getTwilioClient();
        const twiml = `<Response><Say voice="alice">${reminder.title}. ${reminder.message}</Say></Response>`;
        await client.calls.create({
          to: reminder.target,
          from: twilioPhone,
          twiml,
        });
        break;
      }
      case "email": {
        const client = getTwilioClient();
        await client.messages.create({
          to: reminder.target,
          from: twilioPhone,
          body: `📧 Reminder: ${reminder.title}\n${reminder.message}`,
        });
        break;
      }
      case "in_app":
      default: {
        await db.insert(notificationsTable).values({
          userId: reminder.userId,
          type: "reminder",
          title: reminder.title,
          message: reminder.message,
          link: reminder.projectId ? `/tasks?projectId=${reminder.projectId}` : undefined,
        });
        break;
      }
    }

    await db.update(remindersTable)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(remindersTable.id, reminder.id));
  } catch (error: any) {
    await db.update(remindersTable)
      .set({ status: "failed", errorMessage: error.message })
      .where(eq(remindersTable.id, reminder.id));
  }
}

router.get("/reminders", async (_req, res): Promise<void> => {
  const reminders = await db.select().from(remindersTable)
    .orderBy(desc(remindersTable.scheduledAt));
  res.json(reminders);
});

router.post("/reminders", async (req, res): Promise<void> => {
  const { title, message, scheduledAt, notificationType, target, projectId, userId } = req.body;
  if (!title || !message || !scheduledAt) {
    res.status(400).json({ error: "Title, message, and scheduledAt are required" });
    return;
  }

  const [reminder] = await db.insert(remindersTable).values({
    userId: userId || 1,
    projectId: projectId || null,
    title,
    message,
    scheduledAt: new Date(scheduledAt),
    notificationType: notificationType || "in_app",
    target: target || "",
    status: "pending",
  }).returning();

  res.status(201).json(reminder);
});

router.patch("/reminders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const updates: any = {};
  const { title, message, scheduledAt, notificationType, target, status } = req.body;
  if (title !== undefined) updates.title = title;
  if (message !== undefined) updates.message = message;
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);
  if (notificationType !== undefined) updates.notificationType = notificationType;
  if (target !== undefined) updates.target = target;
  if (status !== undefined) updates.status = status;
  const [reminder] = await db.update(remindersTable).set(updates)
    .where(eq(remindersTable.id, id)).returning();
  res.json(reminder);
});

router.delete("/reminders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(remindersTable)
    .set({ status: "cancelled" })
    .where(eq(remindersTable.id, id));
  res.json({ success: true });
});

router.post("/reminders/:id/send-now", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [reminder] = await db.select().from(remindersTable)
    .where(eq(remindersTable.id, id));
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  await dispatchReminder(reminder);
  const [updated] = await db.select().from(remindersTable)
    .where(eq(remindersTable.id, id));
  res.json(updated);
});

setInterval(async () => {
  try {
    const dueReminders = await db.select().from(remindersTable)
      .where(and(
        eq(remindersTable.status, "pending"),
        lte(remindersTable.scheduledAt, new Date())
      ));
    for (const r of dueReminders) {
      const [claimed] = await db.update(remindersTable)
        .set({ status: "processing" })
        .where(and(
          eq(remindersTable.id, r.id),
          eq(remindersTable.status, "pending")
        ))
        .returning();
      if (claimed) {
        await dispatchReminder(claimed);
      }
    }
  } catch (e) {
    console.error("Reminder sweep error:", e);
  }
}, 30000);

export default router;
