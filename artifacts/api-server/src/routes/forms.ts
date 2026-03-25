import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, formsTable, formSubmissionsTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/forms", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const conditions = projectId ? eq(formsTable.projectId, projectId) : undefined;
  const forms = await db.select().from(formsTable).where(conditions).orderBy(desc(formsTable.createdAt));
  res.json(forms);
});

router.get("/forms/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id));
  if (!form) { res.status(404).json({ error: "Not found" }); return; }
  res.json(form);
});

router.post("/forms", async (req, res): Promise<void> => {
  const { title, description, projectId, fields, slug, submitLabel, successMessage, autoCreateTask, active } = req.body;
  if (!title || !projectId || !slug) {
    res.status(400).json({ error: "title, projectId and slug required" });
    return;
  }
  const [form] = await db.insert(formsTable).values({
    title,
    description: description || "",
    projectId,
    fields: fields || [],
    slug,
    submitLabel: submitLabel || "Submit",
    successMessage: successMessage || "Thank you for your submission!",
    autoCreateTask: autoCreateTask !== false,
    active: active !== false,
  }).returning();
  res.status(201).json(form);
});

router.patch("/forms/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const key of ["title", "description", "fields", "slug", "submitLabel", "successMessage", "autoCreateTask", "active"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(formsTable).set(updates).where(eq(formsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/forms/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(formsTable).where(eq(formsTable.id, id));
  res.json({ success: true });
});

router.get("/forms/:id/submissions", async (req, res): Promise<void> => {
  const formId = parseInt(req.params.id);
  const submissions = await db.select().from(formSubmissionsTable)
    .where(eq(formSubmissionsTable.formId, formId))
    .orderBy(desc(formSubmissionsTable.createdAt));
  res.json(submissions);
});

router.get("/forms/public/:slug", async (req, res): Promise<void> => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, req.params.slug));
  if (!form || !form.active) { res.status(404).json({ error: "Form not found" }); return; }
  res.json({
    id: form.id,
    title: form.title,
    description: form.description,
    fields: form.fields,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage,
  });
});

router.post("/forms/public/:slug/submit", async (req, res): Promise<void> => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, req.params.slug));
  if (!form || !form.active) { res.status(404).json({ error: "Form not found" }); return; }

  const { data, submitterEmail, submitterName } = req.body;
  let taskId = undefined;

  if (form.autoCreateTask) {
    const titleField = (form.fields as any[]).find(f => f.type === "text" || f.type === "short_text");
    const taskTitle = titleField ? (data[titleField.id] || `Form: ${form.title}`) : `Form: ${form.title}`;
    const notesLines = (form.fields as any[]).map(f => `**${f.label}:** ${data[f.id] || "N/A"}`);

    const [task] = await db.insert(tasksTable).values({
      title: String(taskTitle),
      projectId: form.projectId,
      notes: notesLines.join("\n"),
      type: "task",
      status: "todo",
      priority: "medium",
      tags: ["form-submission"],
    }).returning();
    taskId = task.id;
  }

  const [submission] = await db.insert(formSubmissionsTable).values({
    formId: form.id,
    data: data || {},
    taskId,
    submitterEmail: submitterEmail || null,
    submitterName: submitterName || null,
  }).returning();

  await db.update(formsTable).set({
    submissionCount: form.submissionCount + 1,
  }).where(eq(formsTable.id, form.id));

  res.status(201).json({
    success: true,
    message: form.successMessage,
    submissionId: submission.id,
    taskId,
  });
});

export default router;
