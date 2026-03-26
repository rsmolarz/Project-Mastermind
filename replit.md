# ProjectOS

## Overview

ProjectOS is a comprehensive project management platform built as a pnpm workspace monorepo using TypeScript. It provides an all-in-one solution for project teams, encompassing task management, time tracking, goal setting, communication, and administrative oversight. The platform integrates advanced AI features for insights, predictions, and automation, enhancing productivity and decision-making. Its business vision is to streamline project workflows, improve team collaboration, and leverage AI for smarter project execution.

## User Preferences

- I prefer clear and concise communication.
- I expect the agent to ask for confirmation before implementing significant changes or making architectural decisions.
- Focus on delivering functional, high-quality code.
- Provide explanations for complex decisions or implementations.
- Prioritize security best practices in all development.
- Do not make changes to files within the `lib/` directory without explicit instruction, as these are generated or core libraries.
- For new features, always consider scalability and performance.

## System Architecture

ProjectOS is a monorepo managed with pnpm workspaces, utilizing Node.js 24 and TypeScript 5.9.

**Frontend:**
Developed with React, Vite, and Tailwind CSS. The UI/UX incorporates Framer Motion for animations, Lucide React for icons, and `react-markdown` for document rendering. Key UI features include:
-   **Dashboard:** AI Briefing, statistics, needs attention, budgets, documents, sprints, goals.
-   **Tasks:** 11 views (Board/Kanban, List, Table, Timeline/Gantt, Calendar, Map, Workload, Gallery, Roadmap, Gantt, Triage) with AI natural language creation, drag-and-drop, filtering, bulk actions, recurring tasks, subtasks, comment reactions, file attachments, task linking, duplication, location tagging, soft-delete, custom fields (text/number/select/checkbox/rating/date/url/email with auto-save), and dependency management (blocking/blocked-by with search picker). Enhanced Kanban has swimlanes (project/priority), WIP limits, card age indicators. Timeline has day/week/month zoom with startDate support. Calendar has month/week views with multi-day event spans. Map uses Leaflet/OpenStreetMap with location presets. Workload shows capacity bars and timeline per member.
-   **Sprints:** Burndown and velocity charts.
-   **Time Tracking:** Live timer and detailed entry management.
-   **Goals & OKRs:** Progress tracking with AI Health Check.
-   **Communication:** Announcements, Standups (AI-generated), Notification Center, and Messaging Center (Twilio integration for SMS, voice, email via SMS).
-   **Email Hub:** 5-tab system for email management including inbox, project-specific composition, routing rules, reminder scheduling, and AI-driven category/project recommendations.
-   **Workload Management:** Visual capacity planning for team utilization.
-   **Automations:** Rule engine ("When X happens, do Y") with triggers, actions, and run history.
-   **Intake Forms:** Public form builder creating tasks with custom fields.
-   **Milestones:** Project checkpoints with status and tracking.
-   **Approvals:** Task approval workflows.
-   **Project Updates:** Periodic status reports with emoji reaction system (8 reactions, localStorage-persisted).
-   **Reports & Analytics:** 6-tab dashboard (Overview, Projects, Team, Trends, Burndown, Velocity) with KPIs, breakdowns, SVG charts (burndown with ideal vs actual lines, velocity bar charts with throughput stats, pie charts for status/priority distribution), and CSV export.
-   **Tags & Labels:** Customizable tags with categories and colors.
-   **Project Templates:** Built-in presets and custom template creation.
-   **My Day:** Personalized daily focus view with 7 collapsible customizable sections (Overdue, Due Today, Recently Assigned, In Progress, Coming Up, Later, Recently Completed) and greeting banner with stats.
-   **Activity Feed:** Global cross-project activity stream.
-   **Trash & Archive:** Soft-delete and recovery for tasks/projects.
-   **Calendar:** Full Google Calendar integration for event sync, creation, editing, and reminders.
-   **Super Admin:** Comprehensive interface with AI Command Center, feature flags, custom fields, expense tracking, API/email settings, permission roles management (Admin/Member/Viewer with role assignment and permission matrix), and security controls (YubiKey/WebAuthn FIDO2).
-   **Platform Guide:** In-app documentation.
-   **Command Palette:** Global search.
-   **Search (`/search`):** Dedicated search page across tasks, projects, documents, and members with filter tabs.
-   **Settings (`/settings`):** User preferences — email digest frequency, 8 notification toggles, display settings (default view, timezone, language).
-   **Guest Access (`/guests`):** Invite external collaborators with per-project access control (view_only, comment, edit).
-   **CSV Import/Export:** Import tasks from CSV, export tasks to CSV.
-   **Dashboard Widget Configurability:** Customize Widgets button opens a toggle panel to show/hide dashboard widgets (Quick Stats, Needs Attention, Budgets, Recent Docs, Active Sprints, Goals). Preferences persist in localStorage.
-   **Multi-Project Tasks (Multi-Homing):** Tasks can belong to multiple projects via `task_projects` junction table. Task modal includes a multi-project picker to add/remove project associations.
-   **Workload Capacity Settings:** Per-member `hoursPerDay` and weekly `capacity` settings editable from the Workload page via a Capacity Settings panel. Admin-only endpoint with range validation.
-   **Whiteboard:** Full canvas-based drawing tool with rect/circle/line/arrow/draw/text/sticky tools, undo/redo, color picker, zoom/pan, PNG export, and simulated collaborative presence cursors.
-   **Collaborative Presence:** Documents page shows real-time editing presence avatars in toolbar; Whiteboard shows animated cursors with collaborator names. Both use simulated presence (not real WebSocket multi-cursor).
-   **Proofing & Annotations:** Task attachment images support click-to-place numbered annotation pins with comments and hover tooltips.
-   **Workload Heatmap:** Cards/Heatmap toggle on Workload page showing daily utilization per member in a color-coded grid with week navigation and legend.
-   **Integrations Marketplace:** Directory of 24+ integrations (Slack, GitHub, Figma, Zapier, etc.) with category filters, search, and install toggles.
-   **Board/View Sharing:** Shareable public links for board views via `shared_views` table with token-based access.
-   **Board Grouping:** Group-by dropdown (status, priority, assignee, section) with collapsible sections.
-   **Timeline Support:** Tasks have start date + due date range for timeline/Gantt views.
-   **Sub-Items:** Full nested child tasks via parentTaskId (not just checklist subtasks).
-   **Project Descriptions:** Projects have editable description fields.

**Backend:**
An Express 5 API server handles REST endpoints with Zod for validation and Drizzle ORM for PostgreSQL. API codegen uses Orval for React Query hooks and Zod schemas.

**Database:**
PostgreSQL with Drizzle ORM.

**Build System:**
`esbuild` for API server and Vite for frontend.

**Services Architecture:**
Key services include `twilio.service.ts` for SMS/voice, `sendgrid.service.ts` for email delivery with graceful fallback, `notification.service.ts` for in-app notifications and WebSocket broadcasts, and `websocket.ts` for real-time communication. Reminder dispatch is managed by `node-cron`.

**Finance API (Investment Docs app):**
External API for personal finance features including invoices (CRUD, email, recurring), portfolios (holdings, P&L), transactions (tracking, categories), and virtual cards (Privacy.com integration).

**Outgoing Webhooks:**
System for delivering events to external services with configurable webhooks, security features (URL validation, secret masking), and test payload functionality.

**Reports & Analytics Endpoints:**
API endpoints for analytics overview, CSV export, and bulk task import.

**Email-to-Project Recommendations:**
AI-driven system to scan emails and recommend project assignments based on content analysis, with confidence scores and email categorization.

## External Dependencies

-   **Database:** PostgreSQL
-   **ORM:** Drizzle ORM
-   **API Framework:** Express 5
-   **Frontend Framework:** React
-   **Build Tools:** Vite, esbuild
-   **Styling:** Tailwind CSS
-   **Animation Library:** Framer Motion
-   **Icon Library:** Lucide React
-   **Date Utility:** date-fns
-   **Markdown Rendering:** react-markdown
-   **Validation:** Zod
-   **API Codegen:** Orval
-   **Messaging/Communication:** Twilio (SMS, voice, email via SMS)
-   **Calendar Integration:** Google Calendar API (via Replit Integration OAuth connector)
-   **Email Providers (Configurable):** SMTP, SendGrid, Mailgun, AWS SES, Postmark
-   **Email Delivery:** SendGrid (`@sendgrid/mail`)
-   **Task Scheduling:** node-cron
-   **Real-time:** WebSocket (`ws`)
-   **Security:** YubiKey, WebAuthn FIDO2
-   **Version Control Integration:** GitHub, GitLab
-   **Virtual Card Integration:** Privacy.com API