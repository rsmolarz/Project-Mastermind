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
    - **Tasks:** Offers 7 views (Board, List, Table, Calendar, Gallery, Roadmap, Triage) with features like drag-and-drop Kanban, AI natural language task creation, URL filtering, filter bars, saved filters, bulk actions, and recurring tasks.
    - **Sprints:** Includes burndown and velocity charts, and sprint stat cards.
    - **Time Tracking:** Features a live timer and detailed time entry management with billing indicators.
    - **Goals & OKRs:** Goal cards with progress tracking and AI Health Check.
    - **Announcements & Standups:** Facilitates team communication with reaction/comment support and AI-generated daily standups.
    - **Portfolio:** Presents an AI Executive Summary and project health overviews.
    - **Documents/Wiki:** Split-pane editor with markdown rendering and AI content generation.
    - **Notification Center:** Real-time in-app notifications.
    - **Messaging Center:** Integrates Twilio for SMS, voice calls, and email via SMS, with comprehensive contact and message history management.
    - **Email Hub:** A 4-tab system for email management, including an inbox, project-specific composition, email routing rules, and reminder scheduling with Twilio integration.
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

**Privacy.com Integration:** `privacy.service.ts` — card CRUD, transaction listing, via `PRIVACY_COM_API_KEY` env secret