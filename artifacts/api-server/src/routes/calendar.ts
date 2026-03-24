import { Router, type IRouter } from "express";
import { db, calendarEventsTable, calendarSyncLogTable, remindersTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql, isNotNull } from "drizzle-orm";
import { getUncachableGoogleCalendarClient } from "../lib/google-calendar";

const router: IRouter = Router();

async function syncCalendarEvents(calendarId: string = "primary"): Promise<{
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}> {
  const calendar = await getUncachableGoogleCalendarClient();
  const result = { added: 0, updated: 0, removed: 0, errors: [] as string[] };

  try {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

    let pageToken: string | undefined;
    const allEvents: any[] = [];

    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: "startTime",
        pageToken,
      });

      if (response.data.items) {
        allEvents.push(...response.data.items);
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    for (const event of allEvents) {
      if (!event.id) continue;

      const isAllDay = !!event.start?.date;
      const startTime = isAllDay
        ? new Date(event.start!.date + "T00:00:00")
        : new Date(event.start?.dateTime || event.start?.date || "");
      const endTime = isAllDay
        ? new Date(event.end!.date + "T23:59:59")
        : new Date(event.end?.dateTime || event.end?.date || "");

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue;

      const attendees = event.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      }));

      const eventData = {
        googleEventId: event.id,
        calendarId,
        title: event.summary || "(No title)",
        description: event.description || null,
        location: event.location || null,
        startTime,
        endTime,
        allDay: isAllDay,
        status: event.status || "confirmed",
        colorId: event.colorId || null,
        organizer: event.organizer?.email || null,
        attendees: attendees || null,
        recurrence: event.recurrence || null,
        reminders: event.reminders || null,
        conferenceLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
        htmlLink: event.htmlLink || null,
        syncedAt: new Date(),
        updatedAt: new Date(),
      };

      const existing = await db.select().from(calendarEventsTable)
        .where(eq(calendarEventsTable.googleEventId, event.id));

      if (existing.length > 0) {
        await db.update(calendarEventsTable)
          .set(eventData)
          .where(eq(calendarEventsTable.googleEventId, event.id));
        result.updated++;
      } else {
        await db.insert(calendarEventsTable).values({
          ...eventData,
          createdAt: new Date(),
        });
        result.added++;
      }
    }

    const syncedIds = allEvents.filter(e => e.id).map(e => e.id);
    if (syncedIds.length > 0) {
      const existing = await db.select({ id: calendarEventsTable.id, googleEventId: calendarEventsTable.googleEventId })
        .from(calendarEventsTable)
        .where(and(
          eq(calendarEventsTable.calendarId, calendarId),
          isNotNull(calendarEventsTable.googleEventId),
          gte(calendarEventsTable.startTime, new Date(timeMin)),
          lte(calendarEventsTable.endTime, new Date(timeMax)),
        ));

      for (const e of existing) {
        if (e.googleEventId && !syncedIds.includes(e.googleEventId)) {
          await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, e.id));
          result.removed++;
        }
      }
    }

    await db.insert(calendarSyncLogTable).values({
      calendarId,
      eventsAdded: result.added,
      eventsUpdated: result.updated,
      eventsRemoved: result.removed,
      status: "success",
    });
  } catch (err: any) {
    result.errors.push(err.message);
    await db.insert(calendarSyncLogTable).values({
      calendarId,
      status: "error",
      errorMessage: err.message,
    });
  }

  return result;
}

router.get("/calendar/events", async (req, res): Promise<void> => {
  const { start, end, calendarId } = req.query;

  let query = db.select().from(calendarEventsTable);
  const conditions: any[] = [];

  if (start) conditions.push(gte(calendarEventsTable.startTime, new Date(start as string)));
  if (end) conditions.push(lte(calendarEventsTable.endTime, new Date(end as string)));
  if (calendarId) conditions.push(eq(calendarEventsTable.calendarId, calendarId as string));

  const events = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(calendarEventsTable.startTime)
    : await query.orderBy(calendarEventsTable.startTime);

  res.json(events);
});

router.get("/calendar/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [event] = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(event);
});

router.post("/calendar/sync", async (_req, res): Promise<void> => {
  try {
    const result = await syncCalendarEvents("primary");
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/calendar/calendars", async (_req, res): Promise<void> => {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const response = await calendar.calendarList.list();
    const calendars = (response.data.items || []).map(c => ({
      id: c.id,
      summary: c.summary,
      description: c.description,
      primary: c.primary || false,
      backgroundColor: c.backgroundColor,
      foregroundColor: c.foregroundColor,
      accessRole: c.accessRole,
      timeZone: c.timeZone,
    }));
    res.json(calendars);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/calendar/events", async (req, res): Promise<void> => {
  try {
    const { title, description, location, startTime, endTime, allDay, attendees, calendarId: cId } = req.body;
    if (!title || !startTime || !endTime) {
      res.status(400).json({ error: "Title, startTime, and endTime are required" });
      return;
    }

    const calendar = await getUncachableGoogleCalendarClient();
    const targetCalendar = cId || "primary";

    const eventBody: any = {
      summary: title,
      description: description || undefined,
      location: location || undefined,
    };

    if (allDay) {
      eventBody.start = { date: new Date(startTime).toISOString().split("T")[0] };
      eventBody.end = { date: new Date(endTime).toISOString().split("T")[0] };
    } else {
      eventBody.start = { dateTime: new Date(startTime).toISOString() };
      eventBody.end = { dateTime: new Date(endTime).toISOString() };
    }

    if (attendees && Array.isArray(attendees)) {
      eventBody.attendees = attendees.map((e: string) => ({ email: e }));
    }

    const response = await calendar.events.insert({
      calendarId: targetCalendar,
      requestBody: eventBody,
      sendUpdates: "all",
    });

    const googleEvent = response.data;

    const [saved] = await db.insert(calendarEventsTable).values({
      googleEventId: googleEvent.id || null,
      calendarId: targetCalendar,
      title,
      description: description || null,
      location: location || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      allDay: allDay || false,
      status: googleEvent.status || "confirmed",
      organizer: googleEvent.organizer?.email || null,
      attendees: googleEvent.attendees?.map((a: any) => ({
        email: a.email, displayName: a.displayName, responseStatus: a.responseStatus,
      })) || null,
      htmlLink: googleEvent.htmlLink || null,
      conferenceLink: googleEvent.hangoutLink || null,
      syncedAt: new Date(),
    }).returning();

    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/calendar/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const [existing] = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

    const { title, description, location, startTime, endTime, allDay } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;
    if (startTime !== undefined) updates.startTime = new Date(startTime);
    if (endTime !== undefined) updates.endTime = new Date(endTime);
    if (allDay !== undefined) updates.allDay = allDay;

    if (existing.googleEventId) {
      const calendar = await getUncachableGoogleCalendarClient();
      const patchBody: any = {};
      if (title !== undefined) patchBody.summary = title;
      if (description !== undefined) patchBody.description = description;
      if (location !== undefined) patchBody.location = location;
      if (startTime !== undefined || endTime !== undefined) {
        const isAllDay = allDay ?? existing.allDay;
        if (isAllDay) {
          if (startTime) patchBody.start = { date: new Date(startTime).toISOString().split("T")[0] };
          if (endTime) patchBody.end = { date: new Date(endTime).toISOString().split("T")[0] };
        } else {
          if (startTime) patchBody.start = { dateTime: new Date(startTime).toISOString() };
          if (endTime) patchBody.end = { dateTime: new Date(endTime).toISOString() };
        }
      }

      await calendar.events.patch({
        calendarId: existing.calendarId,
        eventId: existing.googleEventId,
        requestBody: patchBody,
      });
    }

    const [updated] = await db.update(calendarEventsTable).set(updates)
      .where(eq(calendarEventsTable.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/calendar/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const [existing] = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

    if (existing.googleEventId) {
      const calendar = await getUncachableGoogleCalendarClient();
      await calendar.events.delete({
        calendarId: existing.calendarId,
        eventId: existing.googleEventId,
      });
    }

    await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/calendar/sync-log", async (_req, res): Promise<void> => {
  const logs = await db.select().from(calendarSyncLogTable)
    .orderBy(desc(calendarSyncLogTable.syncedAt))
    .limit(20);
  res.json(logs);
});

router.post("/calendar/events/:id/reminder", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [event] = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const { minutesBefore, notificationType, target } = req.body;
  const reminderTime = new Date(event.startTime.getTime() - (minutesBefore || 15) * 60 * 1000);

  if (reminderTime <= new Date()) {
    res.status(400).json({ error: "Reminder time is in the past" });
    return;
  }

  const [reminder] = await db.insert(remindersTable).values({
    userId: 1,
    projectId: event.projectId || null,
    title: `Upcoming: ${event.title}`,
    message: `${event.title} starts at ${event.startTime.toLocaleTimeString()}${event.location ? ` - ${event.location}` : ""}`,
    scheduledAt: reminderTime,
    notificationType: notificationType || "in_app",
    target: target || "",
    status: "pending",
  }).returning();

  res.status(201).json(reminder);
});

export default router;
