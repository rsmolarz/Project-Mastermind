# ProjectOS

## Overview

ProjectOS is a comprehensive project management platform built as a pnpm workspace monorepo using TypeScript. It aims to provide an all-in-one solution for project teams, encompassing task management, time tracking, goal setting, communication, and administrative oversight. The platform integrates advanced AI features for insights, predictions, and automation, enhancing productivity and decision-making.

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
- Developed with React, Vite, and Tailwind CSS.
- UI/UX incorporates Framer Motion for animations, Lucide React for icons, and `react-markdown` for document rendering.
- Key UI features include:
    - **Dashboard:** Provides an AI Briefing, key statistics (in-progress, overdue, hours today, goals on track), needs attention list, project budgets, recent documents, active sprints, and goals summary.
    - **Tasks:** Offers 8 views (Board, List, Table, Calendar, Gallery, Roadmap, Gantt, Triage) with features like drag-and-drop Kanban, AI natural language task creation, URL filtering, filter bars, saved filters, bulk actions, recurring tasks, subtask checklist UI (add/toggle/delete subtasks with progress counter), comment reactions (emoji picker with 👍❤️🎉😄🔥👀💯🚀), file attachments (base64 upload with blocked extensions, max 10MB), task linking across projects (related/blocks/duplicates), one-click duplicate, and archive. Delete now soft-deletes to Trash.
    - **Sprints:** Includes burndown and velocity charts, and sprint stat cards.
    - **Time Tracking:** Features a live timer and detailed time entry management with billing indicators.
    - **Goals & OKRs:** Goal cards with progress tracking and AI Health Check.
    - **Announcements & Standups:** Facilitates team communication with reaction/comment support and AI-generated daily standups.
    - **Portfolio:** Presents an AI Executive Summary and project health overviews.
    - **Documents/Wiki:** Split-pane editor with markdown rendering and AI content generation.
    - **Notification Center:** Real-time in-app notifications.
    - **Messaging Center:** Integrates Twilio for SMS, voice calls, and email via SMS, with comprehensive contact and message history management.
    - **Email Hub:** A 5-tab system for email management, including an inbox, project-specific composition, email routing rules, reminder scheduling with Twilio integration, and email categories with project recommendations (accept/deny).
    - **Workload Management (`/workload`):** Visual capacity planning showing team utilization %, active tasks, story points, overdue count, tasks by project/priority, and load level (overloaded/heavy/optimal/light).
    - **Automations (`/automations`):** Rule engine — "When X happens, do Y". Supports triggers (task_created, task_status_changed, task_assigned, task_completed, task_overdue, sprint_started, sprint_completed) with actions (change_status, change_priority, assign, notify). Rules fire automatically on task create/update. UI supports create, enable/disable, test run, delete. Includes run history log (`automation_runs` table) with stats dashboard (total/successful/failed/avg duration) and expandable run history showing each run's trigger, actions executed, duration, and timestamp.
    - **Intake Forms (`/forms`):** Public form builder that auto-creates tasks. Create forms with custom fields (text, email, number, select, date, checkbox), assign to projects, share public URLs. Submissions auto-generate tasks. Auth-bypassed public endpoint at `/api/forms/public/:slug/submit`.
    - **Milestones (`/milestones`):** Key project checkpoints with due dates, statuses (upcoming, in_progress, completed, missed), color coding, and days-remaining tracking.
    - **Approvals (`/approvals`):** Request/track task approvals. Requester picks an approver, who gets notified. Approver can approve/reject with comments. Filter by status.
    - **Project Updates (`/project-updates`):** Periodic status reports with on_track/at_risk/off_track/completed status, highlights, blockers, and next steps. Filter by project.
    - **Reports & Analytics (`/reports`):** 4-tab analytics dashboard (Overview, Projects, Team, Trends). Overview: KPI cards (total tasks, completion rate, overdue, hours), priority/status/type breakdowns with bar charts. Projects: per-project completion rates and overdue counts. Team: member cards with assigned/completed tasks and hours. Trends: 30-day task creation/completion activity chart. CSV export button.
    - **Tags & Labels (`/tags`):** Create, manage, and categorize custom tags with colors. Tags grouped by category (general, priority, status, type, department, client). Inline delete with color dots.
    - **Project Templates (`/templates`):** 6 built-in presets (Software Sprint, Marketing Campaign, Client Onboarding, Product Launch, Bug Triage, Design Sprint) each with default tasks. Create custom templates with custom task sets. One-click use preset to save template.
    - **My Day (`/my-day`):** Focus mode showing personalized daily view — greeting, today's date, stat cards (in progress, done today, hours tracked), overdue/due today/in progress/coming up task sections with inline done toggling.
    - **Activity Feed (`/activity`):** Global cross-project activity stream grouped by day, showing who did what with action icons and relative timestamps.
    - **Trash & Archive (`/trash`):** Soft-delete with recovery. Two tabs: Trash (restore or permanently delete tasks/projects) and Archived (unarchive completed work). Empty Trash button with confirmation. Tasks and projects have `deletedAt`/`archivedAt` columns — DELETE now soft-deletes, GET filters out deleted/archived items.
    - **Calendar (`/calendar`):** Full Google Calendar integration with month grid and agenda views, event sync, create/edit/delete events (synced to Google Calendar), event detail modals with attendee status, conference links, and integrated reminder creation (in-app, SMS, voice call via Twilio). Supports clicking days to view events, color-coded event labels, and all-day events.
    - **Super Admin (`/admin`):** A comprehensive administrative interface featuring an overview dashboard, an AI Command Center with 60 AI features (Core, Advanced, Predictive), 55 configurable Feature Flags, Task Templates, Custom Fields, Expense Tracking, API & Email Integration settings, and robust Security controls (YubiKey/WebAuthn FIDO2, session-based auth).
    - **Platform Guide (`/guide`):** Comprehensive in-app documentation with left-side navigation covering 19 sections (Getting Started, Dashboard, Tasks, Sprints, Time & Billing, Goals, Portfolio, Documents, Announcements, Standups, Messaging, Email Hub, Email Routing, Reminders, Super Admin, Security, AI Features, Keyboard Shortcuts, API Reference). Includes live project email directory with copy buttons, code examples, tips, and warnings.
    - **Command Palette:** Global search functionality.

**Backend:**
- An Express 5 API server handles all REST endpoints.
- Data validation is performed using Zod (`zod/v4`) and `drizzle-zod`.
- API codegen from an OpenAPI spec is managed by Orval, generating React Query hooks (`api-client-react`) and Zod schemas (`api-zod`).

**Database:**
- PostgreSQL is used as the relational database.
- Drizzle ORM provides the object-relational mapping layer.

**Build System:**
- `esbuild` is used for the API server.
- Vite is used for the frontend development and build process.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express 5
- **Frontend Framework:** React
- **Build Tools:** Vite, esbuild
- **Styling:** Tailwind CSS
- **Animation Library:** Framer Motion
- **Icon Library:** Lucide React
- **Date Utility:** date-fns
- **Markdown Rendering:** react-markdown
- **Validation:** Zod
- **API Codegen:** Orval
- **Messaging/Communication:** Twilio (for SMS, voice, email via SMS dispatch)
- **Calendar Integration:** Google Calendar API (googleapis) via Replit Integration OAuth connector
- **Email Providers (Configurable):** SMTP, SendGrid, Mailgun, AWS SES, Postmark
- **Email Delivery:** SendGrid (`@sendgrid/mail`) for reminder/notification emails
- **Task Scheduling:** node-cron for periodic reminder sweeps (every 30s)
- **Real-time:** WebSocket (`ws`) for live notification broadcasts (authenticated via `pos_session` cookie)
- **Security:** YubiKey, WebAuthn FIDO2 (for multi-factor authentication)
- **Version Control Integration:** GitHub, GitLab (for PR linking)

## Services Architecture

- **`twilio.service.ts`** — SMS sending and voice calls via Twilio API (key-based or auth-token auth)
- **`sendgrid.service.ts`** — Email delivery via SendGrid with HTML templates; graceful fallback to SMS when unconfigured
- **`notification.service.ts`** — Creates in-app notifications and broadcasts via WebSocket in real-time
- **`websocket.ts`** — WebSocket server at `/ws/notifications` with session cookie authentication; per-user connection tracking
- **`lib/session.ts`** — Shared session validation (`pos_session` cookie parsing + DB token verification)
- **Reminder Dispatch Flow:** node-cron sweep (every 30s) → atomic claim (`pending→processing`) → dispatch via notification type (in_app/sms/call/email) → status update (sent/failed)

## Finance API (for Investment Docs app)

External-facing API endpoints for the Investment Docs personal finance app, authenticated via API keys or session cookies.

**Endpoints:**
- `/api/finance/invoices` — Full CRUD, send via email, mark paid/partial, pull unpaid, recurring support
- `/api/finance/portfolios` — Portfolio management with holdings, auto-recalculated totals/gains
- `/api/finance/portfolios/:id/holdings` — CRUD holdings with P&L calculations
- `/api/finance/transactions` — Transaction tracking with categories, filtering, summary stats
- `/api/finance/virtual-cards` — Create/manage Privacy.com virtual cards, sync transactions from Privacy.com

**Database tables:** `invoices`, `invoice_line_items`, `portfolios`, `portfolio_holdings`, `finance_transactions`, `virtual_cards`

## New Feature Database Tables

- `task_dependencies` — Task dependency relationships (finish_to_start, start_to_start, etc.)
- `automations` — Automation rules with triggers, conditions, actions, run counts
- `forms` — Intake form definitions with custom fields, slug-based URLs
- `form_submissions` — Form submission data with optional auto-created task links
- `milestones` — Project milestones with due dates and completion tracking
- `approvals` — Task approval requests/responses between team members
- `project_updates` — Periodic status reports with highlights, blockers, next steps
- `saved_views` — Custom filtered/sorted task views
- `favorites` — Starred/favorited entities (projects, tasks, etc.)
- `project_templates` — Reusable project templates with default tasks and milestones
- `tags` — Custom tags with colors and categories
- `webhooks` — Outgoing webhook configurations with event subscriptions and delivery tracking

## Outgoing Webhooks

Deliver events to external services when things happen in ProjectOS.

**Endpoints:**
- `GET /api/webhooks` — List all webhooks (secrets are masked)
- `POST /api/webhooks` — Create webhook (HTTPS only, no internal/private IPs)
- `PATCH /api/webhooks/:id` — Update webhook
- `DELETE /api/webhooks/:id` — Delete webhook
- `POST /api/webhooks/:id/test` — Send test payload (10s timeout, SSRF-protected)

**Security:** URL validation blocks localhost, private IPs (10.x, 172.16-31.x, 192.168.x), metadata endpoints, and non-HTTPS URLs. Secrets are masked in GET responses.

## Reports & Analytics

**Endpoints:**
- `GET /api/reports/overview` — Full analytics: task counts, completion rate, by priority/status/type, per-project stats, per-member stats, 30-day trend
- `GET /api/reports/export?format=csv` — Export all tasks as CSV
- `POST /api/reports/import` — Bulk import tasks from JSON array

**MotionOS Authentication:** MotionOS app authenticates via `X-API-Key` header or `Bearer` token using `MOTIONOS_API_KEY` secret — no session login needed

**Privacy.com Integration:** `privacy.service.ts` — card CRUD, transaction listing, via `PRIVACY_COM_API_KEY` env secret
**Privacy.com Webhook:** `POST /api/finance/virtual-cards/webhook` — auto-syncs transactions on card activity (auth-bypassed); handles authorization, settlement, decline events; deduplicates by transaction token; updates card spend totals

**Finance API Docs:** `GET /api/finance/docs` — returns full JSON documentation of all finance endpoints, auth methods, models, and request/response formats

## Email-to-Project Recommendations

Scans emails and recommends project assignments with confidence scores. Categorizes emails into 16 types (billing, proposals, contracts, support, feature-requests, meetings, reports, design, devops, onboarding, reviews, updates, marketing, hiring, legal, general).

**Matching strategy** (highest to lowest priority): subject tag `[TAG]` → email route match → project name in content → client name match → domain match → tag mention

**Endpoints:**
- `GET /api/email-projects/recommendations` — Scan unassigned emails and suggest projects (with confidence scores)
- `GET /api/email-projects/categories` — Categorize all emails into types with sample emails
- `POST /api/email-projects/accept` — Accept a recommendation (assigns email to project)
- `POST /api/email-projects/accept-bulk` — Bulk accept recommendations
- `POST /api/email-projects/deny` — Deny a recommendation
- `POST /api/email-projects/create-from-category` — Create a new project from a category and auto-assign matching emails