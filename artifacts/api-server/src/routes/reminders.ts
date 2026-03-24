import { Router, type IRouter } from "express";
import { db, remindersTable, notificationsTable } from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import cron from "node-cron";
import { sendSMS, makeVoiceCall } from "../services/twilio.service";
import { sendEmailViaSendGrid, isSendGridConfigured } from "../services/sendgrid.service";
import { createInAppNotification } from "../services/notification.service";

const router: IRouter = Router();

async function dispatchReminder(reminder: any): Promise<void> {
  try {
    switch (reminder.notificationType) {
      case "sms": {
        const sid = await sendSMS(
          reminder.target,
          `📋 Reminder: ${reminder.title}\n${reminder.message}`,
        );
        await db.update(remindersTable)
          .set({ status: "sent", sentAt: new Date(), jobId: sid })
          .where(eq(remindersTable.id, reminder.id));
        break;
      }
      case "call": {
        const sid = await makeVoiceCall(
          reminder.target,
          `${reminder.title}. ${reminder.message}`,
        );
        await db.update(remindersTable)
          .set({ status: "sent", sentAt: new Date(), jobId: sid })
          .where(eq(remindersTable.id, reminder.id));
        break;
      }
      case "email": {
        if (isSendGridConfigured()) {
          await sendEmailViaSendGrid(
            reminder.target,
            `Reminder: ${reminder.title}`,
            reminder.message,
          );
        } else {
          await sendSMS(
            reminder.target,
            `📧 Reminder: ${reminder.title}\n${reminder.message}`,
          );
        }
        await db.update(remindersTable)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(remindersTable.id, reminder.id));
        break;
      }
      case "in_app":
      default: {
        await createInAppNotification(
          reminder.userId,
          reminder.title,
          reminder.message,
          {
            reminderId: reminder.id,
            projectId: reminder.projectId,
            calendarEventId: reminder.calendarEventId,
          },
        );
        await db.update(remindersTable)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(remindersTable.id, reminder.id));
        break;
      }
    }
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
  const { title, message, scheduledAt, notificationType, target, projectId, userId, calendarEventId } = req.body;
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
    calendarEventId: calendarEventId || null,
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

router.get("/reminders/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(remindersTable);
  const pending = all.filter(r => r.status === "pending").length;
  const sent = all.filter(r => r.status === "sent").length;
  const failed = all.filter(r => r.status === "failed").length;
  const cancelled = all.filter(r => r.status === "cancelled").length;
  res.json({ total: all.length, pending, sent, failed, cancelled });
});

cron.schedule("*/30 * * * * *", async () => {
  try {
    const dueReminders = await db.select().from(remindersTable)
      .where(and(
        eq(remindersTable.status, "pending"),
        lte(remindersTable.scheduledAt, new Date()),
      ));

    for (const r of dueReminders) {
      const [claimed] = await db.update(remindersTable)
        .set({ status: "processing" })
        .where(and(
          eq(remindersTable.id, r.id),
          eq(remindersTable.status, "pending"),
        ))
        .returning();

      if (claimed) {
        await dispatchReminder(claimed);
      }
    }

    if (dueReminders.length > 0) {
      console.log(`[Cron] Dispatched ${dueReminders.length} reminder(s)`);
    }
  } catch (e) {
    console.error("[Cron] Reminder sweep error:", e);
  }
});

console.log("[Cron] Reminder sweep scheduled — runs every 30 seconds");

export default router;
