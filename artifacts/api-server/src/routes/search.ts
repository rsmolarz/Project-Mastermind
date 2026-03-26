import { Router, type IRouter } from "express";
import { ilike, or, desc, isNull } from "drizzle-orm";
import { db, tasksTable, projectsTable, documentsTable, membersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string || "").trim().slice(0, 200);
  if (!q || q.length < 2) {
    res.json({ tasks: [], projects: [], documents: [], members: [], totalResults: 0 });
    return;
  }
  const sanitized = q.replace(/[%_\\]/g, "");
  if (!sanitized) {
    res.json({ tasks: [], projects: [], documents: [], members: [], totalResults: 0 });
    return;
  }
  const pattern = `%${sanitized}%`;

  const [tasks, projects, documents, members] = await Promise.all([
    db.select().from(tasksTable)
      .where(or(ilike(tasksTable.title, pattern), ilike(tasksTable.notes, pattern)))
      .orderBy(desc(tasksTable.createdAt))
      .limit(20),
    db.select().from(projectsTable)
      .where(or(ilike(projectsTable.name, pattern), ilike(projectsTable.description, pattern)))
      .orderBy(desc(projectsTable.createdAt))
      .limit(10),
    db.select().from(documentsTable)
      .where(or(ilike(documentsTable.title, pattern), ilike(documentsTable.content, pattern)))
      .orderBy(desc(documentsTable.createdAt))
      .limit(10),
    db.select().from(membersTable)
      .where(or(ilike(membersTable.name, pattern), ilike(membersTable.role, pattern)))
      .limit(10),
  ]);

  const filteredTasks = tasks.filter(t => !t.deletedAt);
  const filteredProjects = projects.filter(p => !p.deletedAt);

  res.json({
    tasks: filteredTasks,
    projects: filteredProjects,
    documents,
    members,
    totalResults: filteredTasks.length + filteredProjects.length + documents.length + members.length,
  });
});

export default router;
