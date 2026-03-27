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
-   **Email Delivery:** SendGrid (and other configurable SMTP, Mailgun, AWS SES, Postmark)
-   **Email Import:** ImapFlow (IMAP email fetching), Mailparser (email parsing)
-   **Task Scheduling:** node-cron
-   **Real-time:** WebSocket (`ws`)
-   **Security:** YubiKey, WebAuthn FIDO2, API key auth (pos_ keys + MOTIONOS_API_KEY)
-   **Virtual Card Integration:** Privacy.com API

## Email Import System

The Email Hub includes an Import & Scan feature (`/email` > Import & Scan tab) that:
1. Connects to configured SMTP/IMAP provider (auto-maps smtp.gmail.com → imap.gmail.com, etc.)
2. Imports emails via IMAP into `emailLogsTable` with deduplication via `gmailMessageId`
3. Analyzes emails using keyword matching across 20 categories (billing, support, design, meetings, etc.)
4. Creates project headings from selected categories and auto-assigns matching emails

API endpoints: `/api/email-import/status`, `/api/email-import/scan`, `/api/email-import/folders`, `/api/email-import/analyze`, `/api/email-import/create-headings`

## API Key Authentication

User-created API keys (pos_ prefix) are validated in auth middleware via both `Authorization: Bearer` and `X-API-Key` headers. Keys support scopes, expiry, and `lastUsedAt` tracking. The `MOTIONOS_API_KEY` env var remains as a system-level master key.