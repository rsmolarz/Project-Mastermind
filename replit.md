# ProjectOS

## Overview

ProjectOS is a comprehensive project management platform built as a pnpm workspace monorepo using TypeScript. It offers an all-in-one solution for project teams, covering task management, time tracking, goal setting, communication, and administrative oversight. The platform integrates advanced AI features for insights, predictions, and automation to enhance productivity and decision-making. Its core vision is to streamline project workflows, improve team collaboration, and leverage AI for smarter project execution.

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
Developed with React, Vite, and Tailwind CSS, incorporating Framer Motion for animations and Lucide React for icons. The UI/UX features a versatile dashboard, multi-view task management (Kanban, Gantt, Calendar, etc.), sprint tracking, time tracking, OKR management, comprehensive communication tools (announcements, standups, messaging), and an Email Hub. Advanced features include workload management, automations with a rule engine, intake forms, milestones, approvals, project updates, and detailed reports & analytics with SVG charts and CSV export. The platform also includes customizable tags, project templates, a personalized "My Day" view, a global activity feed, and soft-delete functionality. Administrative capabilities include a Super Admin interface with an AI Command Center, feature flags, custom fields, expense tracking, API/email settings, and robust permission management with YubiKey/WebAuthn FIDO2 security. Additional features encompass an in-app Platform Guide, global search, user settings, guest access with granular permissions, CSV import/export, customizable dashboard widgets, multi-project tasks, whiteboard with collaborative presence, proofing with annotations, workload heatmaps, and an integrations marketplace.

Further UI features include: Board/View Sharing, Board Grouping, Timeline Support, Sub-Items, Project Descriptions, specialized task views (Chart, Project Brief, Embed), Mind Maps, Notepad, Reminders, AI-powered Documents with templates, an Enhanced Portfolio view, a Favorites Sidebar, Task Templates, Sprint Planning Board, SLA/Due Date Indicators, Cycles for time-boxed work, Task Checklists, a floating Task Tray, a "Pulse" page for real-time team activity, an "Everything View" for cross-project task aggregation, Time Estimate vs Tracked comparison, extended Task Relationship Types, Custom Task IDs, Task Watchers, Comment Assignments, Nested Docs/Sub-pages, Due Date Reminders, Task Priority Colors on Kanban Cards, Spaces/Folders for project organization, an Inbox/Notification Feed, Hill Charts for progress tracking, Check-ins, Message Boards, Doors for external links, Card Covers, Card Voting, Card Aging, Board Backgrounds, Version History for documents, Toggle Blocks, Synced Blocks, Form Routing Rules, Project Blueprints, Cross-Tagging, Project Risk Scoring, Risk Register, Project Budgets, Project Health Dashboard, Report Builder, Conditional Formatting, Sheet Summary Fields, and Cell History.

**AI & Automation (Taskade-inspired features):**
- **AI Agents** (`/ai-agents`): Create custom AI agents with configurable roles (researcher, analyst, writer, support, coordinator, developer, designer, sales, ops), system prompts, model selection (Claude 3.5 Sonnet/Haiku/Opus), temperature control, and 22 built-in tools (web search, task creation, email, reports, etc.). Agents have persistent conversations, usage tracking, and pre-built templates (Project Coordinator, Research Analyst, Content Writer, Support Agent, Sales Assistant, DevOps Engineer). DB tables: `ai_agents`, `ai_agent_conversations`.
- **AI Workflows** (`/ai-workflows`): Multi-step AI automation builder with 8 step types (AI Generate, Summarize, Classify, Extract, Condition, Notification, Email, Delay). Supports 7 trigger types (manual, schedule, webhook, task events, email, forms). Visual step builder with template library (Content Pipeline, Email Auto-Responder, Task Triage, Daily Digest, Meeting Notes Processor, Feedback Analyzer). Rate-limited to 5 AI calls per run, max 20 steps per workflow. DB table: `ai_workflows`.
- **Flowcharts** (`/flowcharts`): Visual flowchart editor with drag-and-drop nodes (Start, Process, Decision, End, I/O, Sub-process), edge connections, zoom controls, color customization, and AI-powered diagram generation from natural language prompts. DB table: `flowcharts`.
- **Org Chart** (`/org-chart`): Organization hierarchy visualization with 3 views (Tree, Grid, List). Auto-builds hierarchy from team members by role (admin → manager → lead → member). Includes department grouping, search/filter, and role-based color coding.
- **AI Schedule** (`/ai-schedule`): Motion/Reclaim.ai-inspired intelligent scheduling with 4 tabs — Daily Planner (auto-plan day with AI), Focus Time Defender (protect deep work blocks with proactive/reactive modes), Smart Habits (recurring routines with streaks, categories, and preset templates), and Settings (work hours, buffer time, lunch break, meeting caps). Features conflict-aware block placement, weekly analytics dashboard (focus/task/habit hours, streak tracking, goal progress), and full CRUD for focus blocks, habits, and schedule preferences. All data scoped per-member. DB tables: `focus_blocks`, `habits`, `schedule_preferences`, `scheduled_blocks`.

**Team & Workflow features:**
- **Retrospectives** (`/retrospectives`): Structured sprint/project retrospectives with 6 formats (Start/Stop/Continue, 4Ls, Mad/Sad/Glad, Went Well/Improve/Action, Sailboat, Starfish). Each retro has typed categories, voting system, action items, and status tracking (open → in_progress → completed). DB tables: `retrospectives`, `retro_items`.
- **Changelog** (`/changelog`): Product release tracking with 7 entry types (feature, improvement, bugfix, breaking, security, performance, deprecation), version tags, draft/published/archived statuses, and tag system. Timeline view grouped by date. DB table: `changelog_entries`.
- **Resource Planning** (`/resource-planning`): Team capacity visualization showing each member's open tasks, overdue count, estimated hours, utilization percentage, and status (available/balanced/busy/overloaded). Includes team summary stats and attention alerts for overloaded members.
- **Workspace Analytics** (`/workspace-analytics`): Team-level productivity dashboard with weekly velocity charts (completed vs created), task status/priority breakdowns, completion rate, average completion time, tracked hours, per-member performance table, and automated bottleneck detection (flags overloaded members and high overdue rates).

**Email features:**
- **Urgent Tasks Email** (tab in Email Hub `/email`): Dedicated tab in the Email Hub dropdown alongside Gmail and Fastmail. Shows all overdue, urgent-priority, and high-priority pending tasks. Allows sending digest emails to any recipient via Resend. Email address: `urgent-tasks@projectos.dev`. Includes sent history sidebar. Backend: `urgent-tasks-email.ts` with endpoints for `/tasks`, `/history`, `/address`, `/send-digest`.

**Backend:**
An Express 5 API server handles REST endpoints with Zod for validation and Drizzle ORM for PostgreSQL. API codegen uses Orval for React Query hooks and Zod schemas. Key services include `twilio.service.ts` for SMS/voice, `sendgrid.service.ts` for email delivery, `notification.service.ts` for in-app notifications and WebSocket broadcasts, and `websocket.ts` for real-time communication. Reminder dispatch is managed by `node-cron`. The backend also supports outgoing webhooks and includes a Finance API for personal finance features like invoices, portfolios, transactions, and virtual cards. An AI-driven system provides email-to-project recommendations.

**Database:**
PostgreSQL with Drizzle ORM.

**Build System:**
`esbuild` for API server and Vite for frontend.

## External Dependencies

-   **Database:** PostgreSQL
-   **ORM:** Drizzle ORM
-   **API Framework:** Express 5
-   **Frontend Framework:** React
-   **Build Tools:** Vite, esbuild
-   **Styling:** Tailwind CSS
-   **Animation Library:** Framer Motion
-   **Icon Library:** Lucide React
-   **Markdown Rendering:** react-markdown
-   **Validation:** Zod
-   **API Codegen:** Orval
-   **Messaging/Communication:** Twilio
-   **Calendar Integration:** Google Calendar API
-   **Email Delivery:** Resend (and other configurable SMTP, Mailgun, AWS SES, Postmark)
-   **Email Import:** ImapFlow (IMAP email fetching), Mailparser (email parsing)
-   **Fastmail:** JMAP API (native fetch, no external library needed)
-   **Task Scheduling:** node-cron
-   **Real-time:** WebSocket (`ws`)
-   **Security:** YubiKey, WebAuthn FIDO2, API key auth (pos_ keys + MOTIONOS_API_KEY)
-   **Virtual Card Integration:** Privacy.com API

## Email Import & Organization System

The Email Hub (`/email`) is a full-featured email management interface with multi-account support:

### Gmail (rsmolarz@rsmolarz.com)
- **Split-panel layout**: Project tree sidebar (w-72) + email list or overview dashboard
- **217K+ emails imported** via IMAP (ImapFlow/Mailparser)
- **99.99%+ assignment rate** via 3,400+ domain-to-project mappings in `domain_project_mappings` table
- **Hierarchical browsing**: Selecting a parent project shows all descendant emails
- **399 projects** in parent/child hierarchy: 13 top-level headings (VIENT=90, STOR=91, MedMoney=92, Beehive=93, DrRyans=94, Kids=95, MarketIneff=96, PersonalFinance=97, Travel=98, Promotions=99, Surfing=100, Education=101, Personal=190)

Key Gmail API endpoints:
- `GET /api/email-import/project-tree` — Project hierarchy with email counts
- `GET /api/email-import/emails-by-project?projectId=X&page=1&limit=50&search=` — Paginated email list
- `POST /api/email-import/domain-mappings/bulk` — Bulk create domain→project mappings
- `POST /api/email-import/assign-by-domain` — Auto-assign unassigned emails by sender domain

### Fastmail (medmoney@fastmail.com)
- **JMAP integration** via Fastmail's REST API (no IMAP needed)
- **Account ID**: u4c7e4051
- **8,700+ emails**, 418 contacts, 7 mailboxes
- **Live inbox** with full email reading, search, and compose
- **Masked Email management** — create/enable/disable/delete masked addresses
- **Contacts viewer** with alphabetical grouping and search
- **Email composition** with identity-based sending via JMAP EmailSubmission

Key Fastmail API endpoints (`artifacts/api-server/src/routes/fastmail.ts`):
- `GET /api/fastmail/session` — Connection status and capabilities
- `GET /api/fastmail/mailboxes` — List all mailboxes with counts
- `GET /api/fastmail/emails?mailboxId=X&search=Y&position=0&limit=50` — Query emails
- `GET /api/fastmail/email/:id` — Full email detail with body
- `POST /api/fastmail/send` — Send email via JMAP EmailSubmission
- `GET /api/fastmail/contacts` — List all contacts (formatted)
- `GET /api/fastmail/masked-emails` — List masked email addresses
- `POST /api/fastmail/masked-emails` — Create new masked email
- `PATCH /api/fastmail/masked-emails/:id` — Update masked email state
- `DELETE /api/fastmail/masked-emails/:id` — Delete masked email
- `POST /api/fastmail/search` — Full-text search across all emails
- `POST /api/fastmail/email/:id/move` — Move email between mailboxes
- `POST /api/fastmail/email/:id/keywords` — Update email flags (read/starred)

### Project Email Routing (Email-to-Project)
- **Masked email per project** — creates a unique Fastmail masked email for any project
- **One-click assignment** — click a project, get a masked email (e.g., `vient.apmnl@fastmail.com` → VIENT project)
- **Sync engine** — polls Fastmail for emails sent to project masked addresses and imports them into `email_logs` with `provider: "fastmail"`
- **Auto-dedup** — uses `gmailMessageId` field with `fastmail:` prefix to prevent duplicate imports
- Stored in `email_routes` table (same table as legacy `@projectos.dev` routes)

Project Email API endpoints:
- `POST /api/fastmail/project-email` — Create masked email for a project (creates on Fastmail + stores route)
- `GET /api/fastmail/project-emails` — List all project email routes with project info
- `DELETE /api/fastmail/project-email/:id` — Remove project email (disables masked email on Fastmail)
- `POST /api/fastmail/sync-to-projects` — Sync all emails from Fastmail to their projects
- `GET /api/fastmail/project-email-stats` — Stats on routed emails

Frontend: `artifacts/projectos/src/pages/FastmailPanel.tsx` with tabs for Inbox, Project Emails, Contacts, Masked Email, and Compose

## API Key Authentication

User-created API keys (pos_ prefix) are validated in auth middleware via both `Authorization: Bearer` and `X-API-Key` headers. Keys support scopes, expiry, and `lastUsedAt` tracking. The `MOTIONOS_API_KEY` env var remains as a system-level master key.