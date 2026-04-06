import { Router, type IRouter } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db, focusBlocksTable, habitsTable, schedulePreferencesTable, scheduledBlocksTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function isValidTime(v: unknown): v is string {
  return typeof v === "string" && TIME_RE.test(v);
}

function isValidDaysArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 7 && v.every(d => Number.isInteger(d) && d >= 0 && d <= 6);
}

function getMemberId(req: any): number {
  return (req as any).memberId || 1;
}

function blocksOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start < b.end && b.start < a.end;
}

router.get("/schedule/preferences", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const prefs = await db.select().from(schedulePreferencesTable).where(eq(schedulePreferencesTable.memberId, memberId));
    if (prefs.length === 0) {
      const [created] = await db.insert(schedulePreferencesTable).values({ memberId }).returning();
      res.json(created);
    } else {
      res.json(prefs[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.patch("/schedule/preferences", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const updates: any = { updatedAt: new Date() };
    const { workStartTime, workEndTime, workDays, bufferMinutes, lunchStartTime, lunchDurationMinutes, maxMeetingsPerDay, autoScheduleTasks, defendFocusTime } = req.body;

    if (workStartTime !== undefined) {
      if (!isValidTime(workStartTime)) { res.status(400).json({ error: "workStartTime must be HH:MM" }); return; }
      updates.workStartTime = workStartTime;
    }
    if (workEndTime !== undefined) {
      if (!isValidTime(workEndTime)) { res.status(400).json({ error: "workEndTime must be HH:MM" }); return; }
      updates.workEndTime = workEndTime;
    }
    if (workDays !== undefined) {
      if (!isValidDaysArray(workDays)) { res.status(400).json({ error: "workDays must be array of 0-6" }); return; }
      updates.workDays = workDays;
    }
    if (bufferMinutes !== undefined) {
      if (typeof bufferMinutes !== "number" || bufferMinutes < 0 || bufferMinutes > 60) { res.status(400).json({ error: "bufferMinutes 0-60" }); return; }
      updates.bufferMinutes = bufferMinutes;
    }
    if (lunchStartTime !== undefined) {
      if (!isValidTime(lunchStartTime)) { res.status(400).json({ error: "lunchStartTime must be HH:MM" }); return; }
      updates.lunchStartTime = lunchStartTime;
    }
    if (lunchDurationMinutes !== undefined) {
      if (typeof lunchDurationMinutes !== "number" || lunchDurationMinutes < 15 || lunchDurationMinutes > 120) { res.status(400).json({ error: "lunchDurationMinutes 15-120" }); return; }
      updates.lunchDurationMinutes = lunchDurationMinutes;
    }
    if (maxMeetingsPerDay !== undefined) {
      if (typeof maxMeetingsPerDay !== "number" || maxMeetingsPerDay < 0 || maxMeetingsPerDay > 20) { res.status(400).json({ error: "maxMeetingsPerDay 0-20" }); return; }
      updates.maxMeetingsPerDay = maxMeetingsPerDay;
    }
    if (autoScheduleTasks !== undefined) {
      if (typeof autoScheduleTasks !== "boolean") { res.status(400).json({ error: "autoScheduleTasks must be boolean" }); return; }
      updates.autoScheduleTasks = autoScheduleTasks;
    }
    if (defendFocusTime !== undefined) {
      if (typeof defendFocusTime !== "boolean") { res.status(400).json({ error: "defendFocusTime must be boolean" }); return; }
      updates.defendFocusTime = defendFocusTime;
    }

    const prefs = await db.select().from(schedulePreferencesTable).where(eq(schedulePreferencesTable.memberId, memberId));
    if (prefs.length === 0) {
      updates.memberId = memberId;
      const [created] = await db.insert(schedulePreferencesTable).values(updates).returning();
      res.json(created);
    } else {
      const [updated] = await db.update(schedulePreferencesTable).set(updates).where(and(eq(schedulePreferencesTable.id, prefs[0].id), eq(schedulePreferencesTable.memberId, memberId))).returning();
      res.json(updated);
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

router.get("/schedule/focus-blocks", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const blocks = await db.select().from(focusBlocksTable).where(eq(focusBlocksTable.memberId, memberId)).orderBy(desc(focusBlocksTable.createdAt));
    res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch focus blocks" });
  }
});

router.post("/schedule/focus-blocks", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const { title, weeklyGoalHours, minBlockMinutes, maxBlockMinutes, preferredStartTime, preferredEndTime, mode, color, daysOfWeek } = req.body;
    if (weeklyGoalHours !== undefined && (typeof weeklyGoalHours !== "number" || weeklyGoalHours < 1 || weeklyGoalHours > 60)) {
      res.status(400).json({ error: "weeklyGoalHours must be 1-60" }); return;
    }
    if (minBlockMinutes !== undefined && (typeof minBlockMinutes !== "number" || minBlockMinutes < 15 || minBlockMinutes > 240)) {
      res.status(400).json({ error: "minBlockMinutes must be 15-240" }); return;
    }
    if (maxBlockMinutes !== undefined && (typeof maxBlockMinutes !== "number" || maxBlockMinutes < 30 || maxBlockMinutes > 480)) {
      res.status(400).json({ error: "maxBlockMinutes must be 30-480" }); return;
    }
    if (preferredStartTime !== undefined && !isValidTime(preferredStartTime)) {
      res.status(400).json({ error: "preferredStartTime must be HH:MM" }); return;
    }
    if (preferredEndTime !== undefined && !isValidTime(preferredEndTime)) {
      res.status(400).json({ error: "preferredEndTime must be HH:MM" }); return;
    }
    if (preferredStartTime && preferredEndTime && preferredStartTime >= preferredEndTime) {
      res.status(400).json({ error: "preferredStartTime must be before preferredEndTime" }); return;
    }
    if (daysOfWeek !== undefined && !isValidDaysArray(daysOfWeek)) {
      res.status(400).json({ error: "daysOfWeek must be non-empty array of 0-6" }); return;
    }
    if (mode !== undefined && mode !== "proactive" && mode !== "reactive") {
      res.status(400).json({ error: "mode must be proactive or reactive" }); return;
    }
    const [block] = await db.insert(focusBlocksTable).values({
      memberId,
      title: typeof title === "string" ? title.substring(0, 100) : "Focus Time",
      weeklyGoalHours: weeklyGoalHours || 16,
      minBlockMinutes: minBlockMinutes || 60,
      maxBlockMinutes: maxBlockMinutes || 180,
      preferredStartTime: preferredStartTime || "09:00",
      preferredEndTime: preferredEndTime || "12:00",
      mode: mode || "proactive",
      color: typeof color === "string" ? color.substring(0, 20) : "#6366f1",
      daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5],
    }).returning();
    res.status(201).json(block);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create focus block" });
  }
});

router.patch("/schedule/focus-blocks/:id", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const updates: any = {};
    const { title, weeklyGoalHours, minBlockMinutes, maxBlockMinutes, preferredStartTime, preferredEndTime, mode, color, enabled, daysOfWeek } = req.body;
    if (title !== undefined) updates.title = typeof title === "string" ? title.substring(0, 100) : undefined;
    if (weeklyGoalHours !== undefined) {
      if (typeof weeklyGoalHours !== "number" || weeklyGoalHours < 1 || weeklyGoalHours > 60) { res.status(400).json({ error: "weeklyGoalHours 1-60" }); return; }
      updates.weeklyGoalHours = weeklyGoalHours;
    }
    if (preferredStartTime !== undefined) {
      if (!isValidTime(preferredStartTime)) { res.status(400).json({ error: "Invalid time" }); return; }
      updates.preferredStartTime = preferredStartTime;
    }
    if (preferredEndTime !== undefined) {
      if (!isValidTime(preferredEndTime)) { res.status(400).json({ error: "Invalid time" }); return; }
      updates.preferredEndTime = preferredEndTime;
    }
    if (mode !== undefined) {
      if (mode !== "proactive" && mode !== "reactive") { res.status(400).json({ error: "Invalid mode" }); return; }
      updates.mode = mode;
    }
    if (color !== undefined) updates.color = typeof color === "string" ? color.substring(0, 20) : undefined;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (daysOfWeek !== undefined) {
      if (!isValidDaysArray(daysOfWeek)) { res.status(400).json({ error: "Invalid days" }); return; }
      updates.daysOfWeek = daysOfWeek;
    }
    if (minBlockMinutes !== undefined) updates.minBlockMinutes = minBlockMinutes;
    if (maxBlockMinutes !== undefined) updates.maxBlockMinutes = maxBlockMinutes;

    const [block] = await db.update(focusBlocksTable).set(updates)
      .where(and(eq(focusBlocksTable.id, id), eq(focusBlocksTable.memberId, memberId))).returning();
    if (!block) { res.status(404).json({ error: "Not found" }); return; }
    res.json(block);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update focus block" });
  }
});

router.delete("/schedule/focus-blocks/:id", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    await db.delete(focusBlocksTable).where(and(eq(focusBlocksTable.id, id), eq(focusBlocksTable.memberId, memberId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.get("/schedule/habits", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const habits = await db.select().from(habitsTable).where(eq(habitsTable.memberId, memberId)).orderBy(desc(habitsTable.createdAt));
    res.json(habits);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

router.post("/schedule/habits", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const { title, durationMinutes, frequency, timesPerWeek, preferredTime, idealDays, color, category } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) { res.status(400).json({ error: "title is required" }); return; }
    if (durationMinutes !== undefined && (typeof durationMinutes !== "number" || durationMinutes < 5 || durationMinutes > 240)) {
      res.status(400).json({ error: "durationMinutes must be 5-240" }); return;
    }
    if (preferredTime !== undefined && !isValidTime(preferredTime)) {
      res.status(400).json({ error: "preferredTime must be HH:MM" }); return;
    }
    if (idealDays !== undefined && !isValidDaysArray(idealDays)) {
      res.status(400).json({ error: "idealDays must be array of 0-6" }); return;
    }
    if (timesPerWeek !== undefined && (typeof timesPerWeek !== "number" || timesPerWeek < 1 || timesPerWeek > 7)) {
      res.status(400).json({ error: "timesPerWeek must be 1-7" }); return;
    }
    const validCategories = ["wellness", "learning", "exercise", "social", "creative", "admin"];
    if (category !== undefined && !validCategories.includes(category)) {
      res.status(400).json({ error: `category must be one of: ${validCategories.join(", ")}` }); return;
    }
    if (frequency !== undefined && !["daily", "weekly"].includes(frequency)) {
      res.status(400).json({ error: "frequency must be daily or weekly" }); return;
    }
    const [habit] = await db.insert(habitsTable).values({
      memberId,
      title: title.trim().substring(0, 100),
      durationMinutes: durationMinutes || 30,
      frequency: frequency || "daily",
      timesPerWeek: timesPerWeek || 5,
      preferredTime: preferredTime || "08:00",
      idealDays: idealDays || [1, 2, 3, 4, 5],
      color: typeof color === "string" ? color.substring(0, 20) : "#10b981",
      category: category || "wellness",
    }).returning();
    res.status(201).json(habit);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create habit" });
  }
});

router.patch("/schedule/habits/:id", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const updates: any = {};
    const { title, durationMinutes, frequency, timesPerWeek, preferredTime, idealDays, color, enabled, category } = req.body;
    if (title !== undefined) updates.title = typeof title === "string" ? title.trim().substring(0, 100) : undefined;
    if (durationMinutes !== undefined) {
      if (typeof durationMinutes !== "number" || durationMinutes < 5 || durationMinutes > 240) { res.status(400).json({ error: "durationMinutes 5-240" }); return; }
      updates.durationMinutes = durationMinutes;
    }
    if (preferredTime !== undefined) {
      if (!isValidTime(preferredTime)) { res.status(400).json({ error: "Invalid time" }); return; }
      updates.preferredTime = preferredTime;
    }
    if (idealDays !== undefined) {
      if (!isValidDaysArray(idealDays)) { res.status(400).json({ error: "Invalid days" }); return; }
      updates.idealDays = idealDays;
    }
    if (color !== undefined) updates.color = typeof color === "string" ? color.substring(0, 20) : undefined;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (frequency !== undefined) updates.frequency = frequency;
    if (timesPerWeek !== undefined) updates.timesPerWeek = timesPerWeek;
    if (category !== undefined) updates.category = category;

    const [habit] = await db.update(habitsTable).set(updates)
      .where(and(eq(habitsTable.id, id), eq(habitsTable.memberId, memberId))).returning();
    if (!habit) { res.status(404).json({ error: "Not found" }); return; }
    res.json(habit);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update habit" });
  }
});

router.post("/schedule/habits/:id/complete", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [habit] = await db.select().from(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.memberId, memberId)));
    if (!habit) { res.status(404).json({ error: "Not found" }); return; }

    const lastCompleted = habit.lastCompletedAt ? new Date(habit.lastCompletedAt) : null;
    const now = new Date();
    const isConsecutive = lastCompleted && (now.getTime() - lastCompleted.getTime()) < 48 * 60 * 60 * 1000;

    const [updated] = await db.update(habitsTable).set({
      streak: isConsecutive ? habit.streak + 1 : 1,
      totalCompletions: habit.totalCompletions + 1,
      lastCompletedAt: now,
    }).where(and(eq(habitsTable.id, id), eq(habitsTable.memberId, memberId))).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to complete habit" });
  }
});

router.delete("/schedule/habits/:id", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    await db.delete(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.memberId, memberId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.get("/schedule/blocks", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const { start, end } = req.query;
    if (start && end) {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" }); return;
      }
      const blocks = await db.select().from(scheduledBlocksTable)
        .where(and(
          eq(scheduledBlocksTable.memberId, memberId),
          gte(scheduledBlocksTable.startTime, startDate),
          lte(scheduledBlocksTable.endTime, endDate)
        ))
        .orderBy(scheduledBlocksTable.startTime);
      res.json(blocks);
    } else {
      const blocks = await db.select().from(scheduledBlocksTable)
        .where(eq(scheduledBlocksTable.memberId, memberId))
        .orderBy(desc(scheduledBlocksTable.startTime));
      res.json(blocks);
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

router.post("/schedule/auto-plan", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) { res.status(400).json({ error: "Invalid date" }); return; }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const prefs = await db.select().from(schedulePreferencesTable).where(eq(schedulePreferencesTable.memberId, memberId));
    const pref = prefs[0] || { workStartTime: "09:00", workEndTime: "17:00", bufferMinutes: 15, lunchStartTime: "12:00", lunchDurationMinutes: 60, workDays: [1, 2, 3, 4, 5], autoScheduleTasks: true, defendFocusTime: true };

    const dayOfWeek = targetDate.getDay();
    const workDays = (pref.workDays as number[]) || [1, 2, 3, 4, 5];
    if (!workDays.includes(dayOfWeek)) {
      res.json({ success: true, blocks: [], summary: { total: 0, focus: 0, tasks: 0, habits: 0 }, message: "Not a work day" });
      return;
    }

    const focusBlocks = await db.select().from(focusBlocksTable).where(and(eq(focusBlocksTable.memberId, memberId), eq(focusBlocksTable.enabled, true)));
    const habits = await db.select().from(habitsTable).where(and(eq(habitsTable.memberId, memberId), eq(habitsTable.enabled, true)));
    const tasks = pref.autoScheduleTasks !== false
      ? await db.select().from(tasksTable).where(eq(tasksTable.status, "todo"))
      : [];

    await db.delete(scheduledBlocksTable).where(
      and(
        eq(scheduledBlocksTable.memberId, memberId),
        gte(scheduledBlocksTable.startTime, dayStart),
        lte(scheduledBlocksTable.endTime, dayEnd),
        eq(scheduledBlocksTable.isAutoScheduled, true)
      )
    );

    const planned: Array<{ start: Date; end: Date; data: any }> = [];
    const [workStartH, workStartM] = ((pref.workStartTime as string) || "09:00").split(":").map(Number);
    const [workEndH, workEndM] = ((pref.workEndTime as string) || "17:00").split(":").map(Number);
    const [lunchH, lunchM] = ((pref.lunchStartTime as string) || "12:00").split(":").map(Number);

    function canPlace(start: Date, end: Date): boolean {
      return !planned.some(p => blocksOverlap({ start, end }, { start: p.start, end: p.end }));
    }

    const lunchStart = new Date(targetDate);
    lunchStart.setHours(lunchH, lunchM, 0, 0);
    const lunchEnd = new Date(lunchStart.getTime() + ((pref.lunchDurationMinutes as number) || 60) * 60 * 1000);
    planned.push({
      start: lunchStart, end: lunchEnd,
      data: { type: "break", title: "Lunch Break", startTime: lunchStart, endTime: lunchEnd, color: "#f59e0b", status: "scheduled", isAutoScheduled: true, memberId }
    });

    for (const habit of habits) {
      if (habit.idealDays && Array.isArray(habit.idealDays) && !habit.idealDays.includes(dayOfWeek)) continue;
      const [prefH, prefM] = ((habit.preferredTime as string) || "08:00").split(":").map(Number);
      const start = new Date(targetDate);
      start.setHours(prefH, prefM, 0, 0);
      const end = new Date(start.getTime() + (habit.durationMinutes || 30) * 60 * 1000);
      if (canPlace(start, end)) {
        planned.push({
          start, end,
          data: { type: "habit", title: habit.title, startTime: start, endTime: end, habitId: habit.id, color: habit.color || "#10b981", status: "scheduled", isAutoScheduled: true, memberId }
        });
      }
    }

    if (pref.defendFocusTime !== false) {
      for (const fb of focusBlocks) {
        if (fb.daysOfWeek && Array.isArray(fb.daysOfWeek) && !fb.daysOfWeek.includes(dayOfWeek)) continue;
        const [startH, startM] = ((fb.preferredStartTime as string) || "09:00").split(":").map(Number);
        const [endH, endM] = ((fb.preferredEndTime as string) || "12:00").split(":").map(Number);
        const start = new Date(targetDate);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(targetDate);
        end.setHours(endH, endM, 0, 0);
        if (canPlace(start, end)) {
          planned.push({
            start, end,
            data: { type: "focus", title: fb.title || "Focus Time", startTime: start, endTime: end, focusBlockId: fb.id, color: fb.color || "#6366f1", status: "scheduled", isAutoScheduled: true, memberId }
          });
        }
      }
    }

    if (pref.autoScheduleTasks !== false) {
      const sortedTasks = tasks
        .filter((t: any) => t.priority)
        .sort((a: any, b: any) => {
          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
        })
        .slice(0, 5);

      const bufferMs = ((pref.bufferMinutes as number) || 15) * 60 * 1000;
      let taskSlotTime = new Date(targetDate);
      taskSlotTime.setHours(13, 30, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(workEndH, workEndM, 0, 0);

      for (const task of sortedTasks) {
        const estimateMinutes = (task as any).estimateHours ? (task as any).estimateHours * 60 : 45;
        let start = new Date(taskSlotTime);
        let end = new Date(start.getTime() + estimateMinutes * 60 * 1000);

        while (!canPlace(start, end) && end <= endOfDay) {
          start = new Date(start.getTime() + 15 * 60 * 1000);
          end = new Date(start.getTime() + estimateMinutes * 60 * 1000);
        }

        if (end > endOfDay) break;

        planned.push({
          start, end,
          data: { type: "task", title: task.title, startTime: start, endTime: end, taskId: task.id, color: task.priority === "critical" ? "#ef4444" : task.priority === "high" ? "#f97316" : "#3b82f6", status: "scheduled", isAutoScheduled: true, memberId }
        });
        taskSlotTime = new Date(end.getTime() + bufferMs);
      }
    }

    const blockValues = planned.map(p => p.data);
    if (blockValues.length > 0) {
      await db.insert(scheduledBlocksTable).values(blockValues);
    }

    const saved = await db.select().from(scheduledBlocksTable)
      .where(and(
        eq(scheduledBlocksTable.memberId, memberId),
        gte(scheduledBlocksTable.startTime, dayStart),
        lte(scheduledBlocksTable.endTime, dayEnd)
      ))
      .orderBy(scheduledBlocksTable.startTime);

    res.json({
      success: true,
      blocks: saved,
      summary: {
        total: saved.length,
        focus: saved.filter(b => b.type === "focus").length,
        tasks: saved.filter(b => b.type === "task").length,
        habits: saved.filter(b => b.type === "habit").length,
      }
    });
  } catch (err: any) {
    console.error("Auto-plan error:", err);
    res.status(500).json({ error: "Failed to auto-plan day" });
  }
});

router.get("/schedule/analytics", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);

  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const blocks = await db.select().from(scheduledBlocksTable)
      .where(and(eq(scheduledBlocksTable.memberId, memberId), gte(scheduledBlocksTable.startTime, weekStart)));

    let focusMinutes = 0, taskMinutes = 0, habitMinutes = 0, breakMinutes = 0;
    for (const block of blocks) {
      const duration = (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000;
      switch (block.type) {
        case "focus": focusMinutes += duration; break;
        case "task": taskMinutes += duration; break;
        case "habit": habitMinutes += duration; break;
        case "break": breakMinutes += duration; break;
      }
    }

    const habits = await db.select().from(habitsTable).where(eq(habitsTable.memberId, memberId));
    const focusBlocks = await db.select().from(focusBlocksTable).where(and(eq(focusBlocksTable.memberId, memberId), eq(focusBlocksTable.enabled, true)));
    const weeklyGoal = focusBlocks.reduce((sum, fb) => sum + (fb.weeklyGoalHours || 0), 0);

    res.json({
      thisWeek: {
        focusHours: Math.round(focusMinutes / 60 * 10) / 10,
        taskHours: Math.round(taskMinutes / 60 * 10) / 10,
        habitHours: Math.round(habitMinutes / 60 * 10) / 10,
        breakHours: Math.round(breakMinutes / 60 * 10) / 10,
        totalScheduledHours: Math.round((focusMinutes + taskMinutes + habitMinutes + breakMinutes) / 60 * 10) / 10,
      },
      focusGoal: { target: weeklyGoal, achieved: Math.round(focusMinutes / 60 * 10) / 10, percentage: weeklyGoal > 0 ? Math.round(focusMinutes / 60 / weeklyGoal * 100) : 0 },
      habits: {
        total: habits.length,
        active: habits.filter(h => h.enabled).length,
        longestStreak: Math.max(0, ...habits.map(h => h.streak || 0)),
        totalCompletions: habits.reduce((s, h) => s + (h.totalCompletions || 0), 0),
      },
      totalBlocks: blocks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
