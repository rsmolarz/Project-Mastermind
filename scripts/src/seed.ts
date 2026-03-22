import { db, projectsTable, membersTable, tasksTable, sprintsTable, timeEntriesTable, goalsTable, announcementsTable, documentsTable } from "@workspace/db";

const now = Date.now();
const ago = (d: number) => new Date(now - d * 86400000);
const fwd = (d: number) => new Date(now + d * 86400000);

async function seed() {
  console.log("Seeding database...");

  await db.delete(timeEntriesTable);
  await db.delete(tasksTable);
  await db.delete(sprintsTable);
  await db.delete(goalsTable);
  await db.delete(announcementsTable);
  await db.delete(documentsTable);
  await db.delete(membersTable);
  await db.delete(projectsTable);

  const [p1, p2, p3] = await db.insert(projectsTable).values([
    { name: "Web Platform", icon: "◈", color: "#6366f1", client: "Acme Corp", budget: 48000, health: 72, phase: "Execution" },
    { name: "Mobile App", icon: "◉", color: "#a78bfa", client: "Beta Inc", budget: 32000, health: 88, phase: "Design" },
    { name: "API Gateway", icon: "◎", color: "#10b981", client: "Gamma LLC", budget: 22000, health: 61, phase: "Build" },
  ]).returning();

  const [m1, m2, m3, m4, m5] = await db.insert(membersTable).values([
    { name: "Alex Rivera", initials: "AR", color: "#6366f1", role: "Frontend", rate: 120, capacity: 40 },
    { name: "Sam Chen", initials: "SC", color: "#22c55e", role: "Backend", rate: 140, capacity: 40 },
    { name: "Jordan Kim", initials: "JK", color: "#a78bfa", role: "Design", rate: 110, capacity: 32 },
    { name: "Morgan Lee", initials: "ML", color: "#f59e0b", role: "DevOps", rate: 130, capacity: 40 },
    { name: "Riley Park", initials: "RP", color: "#38bdf8", role: "QA", rate: 100, capacity: 40 },
  ]).returning();

  await db.insert(tasksTable).values([
    { title: "Redesign hero section with new brand", type: "feature", status: "inprogress", priority: "high", projectId: p1.id, assigneeIds: [m1.id, m3.id], points: 8, due: fwd(3), tags: ["design", "ui"], subtasks: [{ title: "Wireframes", done: true }, { title: "Hi-fi mockup", done: false }], notes: "", sortOrder: 0 },
    { title: "Auth token not refreshing on expiry", type: "bug", status: "todo", priority: "critical", projectId: p1.id, assigneeIds: [m2.id], points: 5, due: fwd(1), tags: ["auth", "backend"], subtasks: [], notes: "", sortOrder: 1 },
    { title: "Set up CI/CD pipeline for staging", type: "task", status: "review", priority: "high", projectId: p1.id, assigneeIds: [m4.id], points: 8, due: fwd(2), tags: ["devops"], subtasks: [{ title: "GitHub Actions", done: true }], notes: "", sortOrder: 2 },
    { title: "Write API documentation for v2 endpoints", type: "task", status: "backlog", priority: "medium", projectId: p1.id, assigneeIds: [m2.id], points: 5, due: fwd(16), tags: ["docs"], subtasks: [], notes: "", sortOrder: 3 },
    { title: "Mobile nav overflow on small screens", type: "bug", status: "done", priority: "high", projectId: p1.id, assigneeIds: [m1.id, m5.id], points: 3, due: ago(2), tags: ["mobile", "bug"], subtasks: [], notes: "", sortOrder: 4 },
    { title: "Dark mode toggle with system preference", type: "feature", status: "todo", priority: "medium", projectId: p1.id, assigneeIds: [m3.id], points: 5, due: fwd(5), tags: ["ui", "frontend"], subtasks: [], notes: "", sortOrder: 5 },
    { title: "User onboarding flow — welcome screens", type: "story", status: "inprogress", priority: "high", projectId: p2.id, assigneeIds: [m1.id, m3.id], points: 13, due: fwd(4), tags: ["onboarding", "ux"], subtasks: [{ title: "Screen designs", done: true }, { title: "Animations", done: false }], notes: "", sortOrder: 6 },
    { title: "Push notification system (iOS + Android)", type: "feature", status: "backlog", priority: "medium", projectId: p2.id, assigneeIds: [m2.id, m4.id], points: 13, due: fwd(19), tags: ["notifications"], subtasks: [], notes: "", sortOrder: 7 },
    { title: "Rate limiting middleware for all endpoints", type: "task", status: "todo", priority: "critical", projectId: p3.id, assigneeIds: [m2.id], points: 5, due: fwd(2), tags: ["security", "api"], subtasks: [], notes: "", sortOrder: 8 },
    { title: "API versioning strategy and implementation", type: "task", status: "inprogress", priority: "high", projectId: p3.id, assigneeIds: [m4.id, m2.id], points: 8, due: fwd(5), tags: ["architecture"], subtasks: [], notes: "", sortOrder: 9 },
    { title: "Performance audit and Core Web Vitals fixes", type: "task", status: "backlog", priority: "high", projectId: p1.id, assigneeIds: [m1.id, m4.id], points: 8, due: fwd(14), tags: ["perf"], subtasks: [], notes: "", sortOrder: 10 },
    { title: "Search autocomplete lag on slow connections", type: "bug", status: "todo", priority: "medium", projectId: p1.id, assigneeIds: [m1.id], points: 3, due: fwd(4), tags: ["search", "ux"], subtasks: [], notes: "", sortOrder: 11 },
  ]);

  await db.insert(sprintsTable).values([
    { name: "Sprint 12", projectId: p1.id, startDate: ago(6), endDate: fwd(8), goal: "UI redesign + bug fixes", status: "active" },
    { name: "Sprint 13", projectId: p1.id, startDate: fwd(9), endDate: fwd(22), goal: "Perf + docs + QA pass", status: "planned" },
    { name: "Sprint 5", projectId: p2.id, startDate: ago(6), endDate: fwd(8), goal: "Onboarding flow launch", status: "active" },
    { name: "Sprint 3", projectId: p3.id, startDate: ago(3), endDate: fwd(11), goal: "Rate limiting + versioning", status: "active" },
  ]);

  const members = [m1, m2, m3, m4, m5];
  const projects = [p1, p2, p3];
  const descs = ["Hero redesign work", "Auth debugging", "CI/CD setup", "API docs", "Onboarding design", "Code review", "Sprint planning", "Client call", "Perf profiling", "Testing"];
  const timeEntryValues = [];
  for (let d = 13; d >= 0; d--) {
    const day = ago(d);
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const m = members[Math.floor(Math.random() * members.length)];
      const p = projects[Math.floor(Math.random() * projects.length)];
      const hrs = (Math.floor(Math.random() * 8) + 2) / 2;
      timeEntryValues.push({
        memberId: m.id,
        projectId: p.id,
        description: descs[Math.floor(Math.random() * descs.length)],
        hours: hrs,
        date: day,
        billable: Math.random() > 0.15,
        rate: m.rate,
        amount: hrs * m.rate,
      });
    }
  }
  await db.insert(timeEntriesTable).values(timeEntryValues);

  await db.insert(goalsTable).values([
    {
      title: "Launch Web Platform v2", status: "on_track", progress: 68, due: fwd(22), ownerId: m1.id, projectId: p1.id,
      keyResults: [
        { id: 1, title: "Lighthouse score >= 90", progress: 72, target: 90, current: 65, unit: "pts" },
        { id: 2, title: "Page load < 1.2s", progress: 55, target: 1.2, current: 1.8, unit: "sec" },
        { id: 3, title: "Ship 3 major features", progress: 67, target: 3, current: 2, unit: "feats" },
      ],
    },
    {
      title: "Q2 Revenue Target", status: "at_risk", progress: 42, due: fwd(45), ownerId: m4.id, projectId: null,
      keyResults: [
        { id: 4, title: "Invoice $200k billable", progress: 38, target: 200000, current: 76000, unit: "$" },
        { id: 5, title: "Close 2 new contracts", progress: 50, target: 2, current: 1, unit: "deals" },
      ],
    },
    {
      title: "Zero Critical Bugs in Prod", status: "on_track", progress: 80, due: fwd(14), ownerId: m5.id, projectId: p1.id,
      keyResults: [
        { id: 6, title: "Resolve all P1 bugs", progress: 75, target: 8, current: 6, unit: "bugs" },
        { id: 7, title: "Test coverage > 80%", progress: 85, target: 80, current: 68, unit: "%" },
      ],
    },
  ]);

  await db.insert(announcementsTable).values([
    {
      title: "Sprint 12 kick-off", content: "Sprint 12 is live! Focus: hero redesign, auth fix, CI/CD. Daily standups at 9am. Let's ship it!", authorId: m1.id, projectId: p1.id, pinned: true,
      reactions: { "🎉": 3, "✅": 5, "🔥": 2 }, comments: [{ authorId: m2.id, text: "Ready to go!", timestamp: ago(6).toISOString() }],
    },
    {
      title: "New client — Gamma LLC signed", content: "Gamma LLC signed for the API Gateway project. $22k budget, 3-month timeline. Morgan leads. Kickoff Thursday.", authorId: m4.id, projectId: p3.id, pinned: false,
      reactions: { "🎊": 4, "💰": 6 }, comments: [],
    },
    {
      title: "Performance budget enforced Monday", content: "Starting Monday, PRs will be blocked if they exceed our JS performance budget (200kb). Please audit your bundles this week.", authorId: m1.id, projectId: p1.id, pinned: true,
      reactions: { "⚡": 4, "🙌": 3 }, comments: [],
    },
  ]);

  await db.insert(documentsTable).values([
    {
      title: "Web Platform v2 — PRD", icon: "📋", projectId: p1.id, authorId: m1.id, pinned: true, tags: ["product"],
      content: "# Web Platform v2 — PRD\n\nThe v2 platform focuses on performance, accessibility, and developer experience.\n\n## Goals\n- Reduce page load by 40%\n- Achieve WCAG 2.1 AA compliance\n\n## Acceptance Criteria\n- [ ] Lighthouse score >= 90\n- [x] All images have alt text\n- [ ] Keyboard-only auth flow",
      versions: [{ timestamp: ago(5).toISOString(), authorId: m1.id, label: "Draft" }, { timestamp: ago(1).toISOString(), authorId: m3.id, label: "Revised" }],
    },
    {
      title: "Sprint 12 Retrospective", icon: "🔄", projectId: p1.id, authorId: m2.id, pinned: false, tags: ["agile"],
      content: "# Sprint 12 Retrospective\n\n## What Went Well\n- CI/CD pipeline live — saves 3hrs per deploy\n- Mobile nav bug fixed in < 1 day\n\n## What Didn't Go Well\n- Auth token issue blocked frontend 2 days\n\n## Action Items\n- [ ] Add auth integration tests\n- [x] Schedule architecture review",
      versions: [{ timestamp: ago(2).toISOString(), authorId: m2.id, label: "Post-sprint" }],
    },
    {
      title: "API Gateway Architecture ADR", icon: "⚙️", projectId: p3.id, authorId: m4.id, pinned: true, tags: ["engineering"],
      content: "# API Gateway — Architecture Decision\n\nWe'll use Kong as our API gateway on Kubernetes.\n\n## Rate Limiting Config\n- Per consumer: 100/minute\n- Algorithm: sliding-window\n\n## Consequences\n- Single point for auth — simplifies all services\n- Single point of failure — needs HA setup",
      versions: [{ timestamp: ago(7).toISOString(), authorId: m4.id, label: "Draft" }, { timestamp: ago(3).toISOString(), authorId: m2.id, label: "Rate limiting added" }],
    },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
