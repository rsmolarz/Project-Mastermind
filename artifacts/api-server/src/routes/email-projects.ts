import { Router, type IRouter } from "express";
import { db, emailLogsTable, projectsTable, emailRoutesTable } from "@workspace/db";
import { eq, isNull, desc, and, sql } from "drizzle-orm";

const router: IRouter = Router();

interface EmailRecommendation {
  emailId: number;
  subject: string;
  fromAddress: string;
  receivedAt: string;
  snippet: string;
  suggestedProject: {
    id: number;
    name: string;
    confidence: number;
    reason: string;
  } | null;
  suggestedCategory: string;
  status: "pending" | "accepted" | "denied";
}

function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

function categorizeEmail(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();

  if (/invoice|payment|billing|receipt|due|pay|amount/i.test(text)) return "billing";
  if (/proposal|quote|estimate|bid|scope|rfp|rfq/i.test(text)) return "proposals";
  if (/contract|agreement|terms|sign|nda|sow/i.test(text)) return "contracts";
  if (/bug|issue|error|fix|broken|crash|ticket/i.test(text)) return "support";
  if (/feature|request|enhancement|improvement|wishlist/i.test(text)) return "feature-requests";
  if (/meeting|schedule|call|zoom|agenda|standup|sync/i.test(text)) return "meetings";
  if (/report|analytics|metrics|kpi|dashboard|summary/i.test(text)) return "reports";
  if (/design|mockup|wireframe|prototype|figma|ui|ux/i.test(text)) return "design";
  if (/deploy|release|launch|production|staging|ci|cd/i.test(text)) return "devops";
  if (/onboard|welcome|setup|getting started|intro/i.test(text)) return "onboarding";
  if (/review|feedback|approval|sign.?off/i.test(text)) return "reviews";
  if (/update|progress|status|weekly|daily/i.test(text)) return "updates";
  if (/marketing|campaign|newsletter|promo|social/i.test(text)) return "marketing";
  if (/hiring|candidate|interview|resume|application/i.test(text)) return "hiring";
  if (/legal|compliance|audit|regulation|policy/i.test(text)) return "legal";
  return "general";
}

function matchToProject(
  email: { fromAddress: string; subject: string; bodyText: string | null },
  projects: { id: number; name: string; tag: string | null; client: string | null }[],
  routes: { projectId: number; assignedEmail: string | null }[]
): { id: number; name: string; confidence: number; reason: string } | null {
  const subject = email.subject?.toLowerCase() || "";
  const body = email.bodyText?.toLowerCase() || "";
  const fromDomain = extractDomain(email.fromAddress);
  const text = `${subject} ${body}`;

  const tagMatch = email.subject?.match(/\[([A-Z0-9_-]+)\]/);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    const project = projects.find(p => p.tag?.toLowerCase() === tag);
    if (project) return { id: project.id, name: project.name, confidence: 95, reason: `Subject tag [${tagMatch[1]}] matches project tag` };
  }

  for (const route of routes) {
    if (route.assignedEmail && email.fromAddress === route.assignedEmail) {
      const project = projects.find(p => p.id === route.projectId);
      if (project) return { id: project.id, name: project.name, confidence: 90, reason: `Sender matches email route` };
    }
  }

  let bestMatch: { id: number; name: string; confidence: number; reason: string } | null = null;
  let bestScore = 0;

  for (const project of projects) {
    let score = 0;
    let reason = "";

    const pName = project.name.toLowerCase();
    if (text.includes(pName)) {
      score += 60;
      reason = `Project name "${project.name}" found in email`;
    }

    if (project.client) {
      const clientLower = project.client.toLowerCase();
      if (text.includes(clientLower)) {
        score += 50;
        reason = reason ? `${reason}; client "${project.client}" mentioned` : `Client "${project.client}" mentioned in email`;
      }
      if (fromDomain && clientLower.includes(fromDomain.split(".")[0])) {
        score += 40;
        reason = reason ? `${reason}; sender domain matches client` : `Sender domain matches client "${project.client}"`;
      }
    }

    if (project.tag) {
      const tagLower = project.tag.toLowerCase();
      if (text.includes(tagLower)) {
        score += 35;
        reason = reason ? `${reason}; tag "${project.tag}" mentioned` : `Project tag "${project.tag}" found in email`;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { id: project.id, name: project.name, confidence: Math.min(score, 95), reason };
    }
  }

  return bestScore >= 30 ? bestMatch : null;
}

router.get("/email-projects/recommendations", async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const unassignedOnly = req.query.unassigned !== "false";

  const emails = unassignedOnly
    ? await db.select().from(emailLogsTable)
        .where(isNull(emailLogsTable.projectId))
        .orderBy(desc(emailLogsTable.receivedAt))
        .limit(limit)
    : await db.select().from(emailLogsTable)
        .orderBy(desc(emailLogsTable.receivedAt))
        .limit(limit);

  const projects = await db.select().from(projectsTable);
  const routes = await db.select().from(emailRoutesTable);

  const recommendations: EmailRecommendation[] = emails.map(email => {
    const suggestedProject = matchToProject(
      { fromAddress: email.fromAddress, subject: email.subject, bodyText: email.bodyText },
      projects,
      routes,
    );
    const suggestedCategory = categorizeEmail(email.subject, email.bodyText || "");

    return {
      emailId: email.id,
      subject: email.subject,
      fromAddress: email.fromAddress,
      receivedAt: email.receivedAt?.toISOString() || email.createdAt.toISOString(),
      snippet: (email.bodyText || "").substring(0, 200),
      suggestedProject,
      suggestedCategory,
      status: "pending" as const,
    };
  });

  const categorySummary: Record<string, number> = {};
  for (const r of recommendations) {
    categorySummary[r.suggestedCategory] = (categorySummary[r.suggestedCategory] || 0) + 1;
  }

  res.json({
    total: recommendations.length,
    categorySummary,
    recommendations,
  });
});

router.post("/email-projects/accept", async (req, res): Promise<void> => {
  const { emailId, projectId } = req.body;
  if (!emailId || !projectId) {
    res.status(400).json({ error: "emailId and projectId are required" });
    return;
  }

  await db.update(emailLogsTable)
    .set({ projectId })
    .where(eq(emailLogsTable.id, emailId));

  res.json({ success: true, emailId, projectId });
});

router.post("/email-projects/accept-bulk", async (req, res): Promise<void> => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    res.status(400).json({ error: "assignments array is required [{emailId, projectId}]" });
    return;
  }

  let accepted = 0;
  for (const { emailId, projectId } of assignments) {
    if (emailId && projectId) {
      await db.update(emailLogsTable)
        .set({ projectId })
        .where(eq(emailLogsTable.id, emailId));
      accepted++;
    }
  }

  res.json({ success: true, accepted });
});

router.post("/email-projects/deny", async (req, res): Promise<void> => {
  const { emailId } = req.body;
  if (!emailId) {
    res.status(400).json({ error: "emailId is required" });
    return;
  }
  res.json({ success: true, emailId, action: "denied" });
});

router.get("/email-projects/categories", async (_req, res): Promise<void> => {
  const emails = await db.select().from(emailLogsTable);

  const categories: Record<string, { count: number; emails: { id: number; subject: string; from: string }[] }> = {};

  for (const email of emails) {
    const cat = categorizeEmail(email.subject, email.bodyText || "");
    if (!categories[cat]) categories[cat] = { count: 0, emails: [] };
    categories[cat].count++;
    if (categories[cat].emails.length < 5) {
      categories[cat].emails.push({ id: email.id, subject: email.subject, from: email.fromAddress });
    }
  }

  res.json({
    totalEmails: emails.length,
    totalCategories: Object.keys(categories).length,
    categories,
  });
});

router.post("/email-projects/create-from-category", async (req, res): Promise<void> => {
  const { category, projectName, icon, color } = req.body;
  if (!category || !projectName) {
    res.status(400).json({ error: "category and projectName are required" });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    name: projectName,
    icon: icon || "📧",
    color: color || "#6366f1",
    tag: category.toUpperCase(),
  }).returning();

  const emails = await db.select().from(emailLogsTable)
    .where(isNull(emailLogsTable.projectId));

  let assigned = 0;
  for (const email of emails) {
    const emailCat = categorizeEmail(email.subject, email.bodyText || "");
    if (emailCat === category) {
      await db.update(emailLogsTable)
        .set({ projectId: project.id })
        .where(eq(emailLogsTable.id, email.id));
      assigned++;
    }
  }

  res.json({ project, assignedEmails: assigned });
});

export default router;
