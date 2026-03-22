# Workspace

## Overview

ProjectOS — a comprehensive project management platform built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (API server), Vite (frontend)
- **UI**: Framer Motion, Lucide React icons, date-fns, react-markdown

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all REST endpoints)
│   └── projectos/          # React + Vite frontend (ProjectOS UI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- **Dashboard**: Welcome banner with AI Briefing "Refresh" button, 4 stat cards (in-progress, overdue, hours today, goals on track), needs attention list, project budgets (real data from API), bottom row with Recent Docs, Active Sprints, Goals summary cards
- **Tasks (Board/List/Calendar)**: Board/List/Calendar view toggle, Kanban with drag-and-drop columns (Backlog/To Do/In Progress/Review/Done/Blocked), List view with collapsible status groups and bulk select checkboxes, Calendar view (monthly grid with tasks on due dates), AI natural language task creation, task detail modal with Details/Comments/Activity tabs, URL query-based filtering (`?projectId=N`, `?filter=overdue`), filter bar (status/priority dropdowns), saved filters (localStorage), bulk actions (multi-select, bulk move/priority/delete), recurring tasks (daily/weekly/biweekly/monthly)
- **Sprints**: Burndown chart (ideal vs actual lines), Velocity chart (completed vs committed per sprint), stat cards (Total Points, Completed, In Progress, Avg Velocity), All Sprints list with progress bars
- **Time Tracking**: Live timer (start/stop), 4 stat cards (Today hours, This Week revenue, Billable hours, Billable %), day-grouped time entries with sticky date headers and "TODAY" badge, billable indicator column
- **Goals & OKRs**: Goal cards with progress donut charts, key results with progress bars, AI Health Check
- **Announcements**: Cards with reactions, comments, pinned indicators, new post modal
- **Standups**: AI-generated daily standups per team member, "Generate All" button, individual generate buttons, morning welcome banner
- **Portfolio**: AI Executive Summary with "Refresh" button, project health cards with donut charts, 4-stat grid (Tasks Done, Spent, Budget Left, In Progress), budget utilization bars
- **Documents/Wiki**: Split-pane layout, markdown rendering, edit mode, AI "Generate" button for content generation
- **Notification Center**: Bell icon with unread count badge, dropdown with notification items (types: task, warning, comment, info), mark as read, mark all read
- **Task Comments**: Threaded comments on tasks with author avatars and timestamps
- **Activity Log**: Per-task activity timeline showing task created/updated/deleted/comment events
- **AI Chat**: Right-side drawer (Cmd+I), keyword-matching AI assistant for project insights
- **Command Palette**: Cmd+K global search across pages, tasks, docs
- **Sidebar**: Workspace section (Dashboard, My Tasks with badge, Overdue with count badge), Active Projects with task count badges, Tools section (Docs, Time, Sprints), Insights section (Portfolio, Goals, Standups, Announcements), Team Online avatars, AI Assistant button

## Pages & Routes

- `/` — Dashboard
- `/tasks` — Tasks (Board/List/Calendar), supports `?projectId=N` and `?filter=overdue`
- `/sprints` — Sprint management with burndown + velocity charts
- `/time` — Time & Billing
- `/goals` — Goals & OKRs
- `/announcements` — Announcements
- `/standups` — Daily Standups
- `/portfolio` — Project Portfolio
- `/documents` — Documents & Wiki

## Database Tables

- `projects` — id, name, icon, color, client, budget, health, phase
- `members` — id, name, initials, color, role, rate, capacity
- `tasks` — id, title, type, status, priority, projectId, sprintId, assigneeIds (JSONB), points, due, tags (JSONB), subtasks (JSONB), notes, sortOrder, recurrence (JSONB), createdAt
- `sprints` — id, name, projectId, startDate, endDate, goal, status
- `time_entries` — id, memberId, projectId, description, hours, date, billable, rate, amount
- `goals` — id, title, status, progress, due, ownerId, projectId, keyResults (JSONB)
- `announcements` — id, title, content, authorId, projectId, pinned, reactions (JSONB), comments (JSONB)
- `documents` — id, title, icon, projectId, authorId, content, tags (JSONB), pinned, versions (JSONB)
- `task_comments` — id, taskId, authorId, content, parentId, createdAt
- `activity_log` — id, entityType, entityId, action, details (JSONB), actorId, createdAt
- `notifications` — id, userId, type, title, message, link, read, createdAt

## API Routes (mounted at /api)

- `GET/POST /projects`, `PATCH/DELETE /projects/:id`
- `GET/POST /members`, `PATCH /members/:id`
- `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks/reorder`, `POST /tasks/bulk`
- `GET/POST /sprints`, `PATCH /sprints/:id`
- `GET/POST /time-entries`, `PATCH/DELETE /time-entries/:id`
- `GET/POST /goals`, `PATCH /goals/:id`
- `GET/POST /announcements`, `PATCH /announcements/:id`, `POST /announcements/:id/react`, `POST /announcements/:id/comments`
- `GET/POST /documents`, `GET/PATCH/DELETE /documents/:id`
- `GET /dashboard/stats`
- `POST /ai/chat`
- `GET/POST /task-comments`, `DELETE /task-comments/:id`
- `GET/POST /activity`
- `GET/POST /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read`, `DELETE /notifications/:id`

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed` — seed database with sample data
- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/projectos run dev` — start frontend dev server

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files emitted during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/` use `@workspace/api-zod` for validation and `@workspace/db` for persistence.

### `artifacts/projectos` (`@workspace/projectos`)

React + Vite frontend. Pages in `src/pages/`, hooks in `src/hooks/`, shared UI in `src/components/ui/shared.tsx`. Uses `@workspace/api-client-react` for API communication. Manual hooks in `src/hooks/` for new endpoints (notifications, task-comments, activity, bulk-tasks).

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Schema files in `src/schema/`.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval config. Codegen produces output into `lib/api-client-react` and `lib/api-zod`.

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.
