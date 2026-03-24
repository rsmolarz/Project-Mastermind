import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Home, CheckSquare, Clock, Target, FileText, PieChart,
  Megaphone, ClipboardList, Repeat, MessageSquare, Mail, Shield,
  ChevronDown, ChevronRight, Sparkles, Search, Hexagon, Bell,
  Route, Calendar, Zap, Lock, Key, Phone, Globe, Settings,
  ArrowRight, Copy, Check, AlertTriangle, Tag, Users, Layers,
  BarChart3, Timer, Send, Inbox, MapPin, Play, Pause
} from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-secondary/50 border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function Section({ id, icon: Icon, iconColor, title, children, defaultOpen = false }: {
  id: string; icon: any; iconColor: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <h2 className="text-base font-bold flex-1">{title}</h2>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{num}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold mb-1">{title}</h4>
        <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 px-3 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <span className="text-xs text-amber-200/80">{children}</span>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 px-3 py-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
      <span className="text-xs text-rose-200/80">{children}</span>
    </div>
  );
}

const navSections = [
  { id: "getting-started", label: "Getting Started", icon: Hexagon },
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "tasks", label: "Tasks (7 Views)", icon: CheckSquare },
  { id: "sprints", label: "Sprints", icon: Repeat },
  { id: "time", label: "Time & Billing", icon: Clock },
  { id: "goals", label: "Goals & OKRs", icon: Target },
  { id: "portfolio", label: "Portfolio", icon: PieChart },
  { id: "documents", label: "Documents & Wiki", icon: FileText },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "standups", label: "Daily Standups", icon: ClipboardList },
  { id: "messaging", label: "Messaging Center", icon: MessageSquare },
  { id: "email-hub", label: "Email Hub", icon: Mail },
  { id: "email-routing", label: "Email Routing", icon: Route },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "admin", label: "Super Admin", icon: Shield },
  { id: "security", label: "Security & Auth", icon: Lock },
  { id: "ai", label: "AI Features", icon: Sparkles },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Settings },
  { id: "api", label: "API Reference", icon: Globe },
];

export default function Guide() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const { data: emailRoutes = [] } = useQuery({
    queryKey: ["email-routes"],
    queryFn: () => apiFetch("/email-routing/routes"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects"),
  });

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="h-full flex">
      <div className="w-56 shrink-0 border-r border-border bg-card/50 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Platform Guide
          </h2>
        </div>
        <div className="p-2 space-y-0.5">
          {navSections.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeSection === s.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <s.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              ProjectOS Platform Guide
            </h1>
            <p className="text-muted-foreground mt-2">Complete instructions for every feature in the platform. Click any section to expand.</p>
          </div>

          <Section id="getting-started" icon={Hexagon} iconColor="bg-gradient-to-br from-primary to-accent" title="Getting Started" defaultOpen>
            <p className="text-sm text-muted-foreground">Welcome to ProjectOS, your all-in-one project management platform. Here's how to get oriented:</p>

            <Step num={1} title="Log in with your password">
              When you first visit the platform, you'll see the authentication gate. Enter the master password to unlock the workspace. Your session is remembered so you won't need to re-enter it.
            </Step>
            <Step num={2} title="Explore the sidebar navigation">
              The left sidebar organizes everything into sections: <strong>Workspace</strong> (Dashboard, My Tasks, Overdue), <strong>Active Projects</strong> (click any to filter tasks), <strong>Tools</strong> (Docs, Time, Sprints, Messaging, Email Hub), <strong>Insights</strong> (Portfolio, Goals, Standups, Announcements), and <strong>Admin</strong> (Super Admin panel).
            </Step>
            <Step num={3} title="Use keyboard shortcuts">
              Press <strong>Cmd+K</strong> (or Ctrl+K) to open the Command Palette for quick navigation. Press <strong>Cmd+I</strong> to open the AI Assistant chat drawer.
            </Step>
            <Step num={4} title="Check your Dashboard daily">
              The Dashboard shows an AI-generated briefing, stat cards (in-progress tasks, overdue items, hours today, goals on track), needs-attention items, project budgets, and summaries of docs, sprints, and goals.
            </Step>

            <Tip>Each project has a unique color dot in the sidebar. The number badge shows open tasks for that project.</Tip>
          </Section>

          <Section id="dashboard" icon={Home} iconColor="bg-blue-500" title="Dashboard">
            <p className="text-sm text-muted-foreground">Your daily command center at <code className="text-primary bg-primary/10 px-1 rounded">/</code></p>

            <div className="space-y-3">
              <h4 className="text-sm font-bold">What You'll See:</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: "AI Briefing Banner", desc: "A personalized AI-generated summary of your project status. Click 'Refresh Briefing' to regenerate it anytime." },
                  { title: "4 Stat Cards", desc: "In-Progress tasks count, Overdue items, Hours tracked today, and Goals on track percentage — all updated in real-time." },
                  { title: "Needs Attention List", desc: "Items requiring immediate action — overdue tasks, at-risk goals, and low-health projects bubble up here automatically." },
                  { title: "Project Budgets", desc: "Visual breakdown of budget utilization per project with progress bars and dollar amounts." },
                  { title: "Recent Documents", desc: "Quick access to the latest docs and wiki pages you've created or edited." },
                  { title: "Active Sprints & Goals", desc: "Current sprint status and goal progress summaries so you always know where things stand." },
                ].map((item, i) => (
                  <div key={i} className="bg-background border border-border rounded-xl p-3">
                    <h5 className="text-xs font-bold mb-1">{item.title}</h5>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="tasks" icon={CheckSquare} iconColor="bg-emerald-500" title="Tasks — 7 Different Views">
            <p className="text-sm text-muted-foreground">The task system at <code className="text-primary bg-primary/10 px-1 rounded">/tasks</code> offers 7 ways to view and manage your work:</p>

            <div className="space-y-3">
              {[
                { view: "Board (Kanban)", desc: "Drag and drop tasks between columns: Backlog → Todo → In Progress → Review → Done. Each card shows priority, assignees, points, and due date. Best for visual workflow management." },
                { view: "List", desc: "Collapsible groups organized by status. Click any group header to expand/collapse. Shows all task details in a compact list format. Best for scanning many tasks quickly." },
                { view: "Table (Spreadsheet)", desc: "Full spreadsheet view with columns for ID (WEB-001, MOB-002), title, status, priority, assignee, points, and due date. Best for data-heavy analysis and bulk updates." },
                { view: "Calendar", desc: "Monthly calendar grid showing tasks on their due dates. Navigate between months with arrow buttons. Tasks appear as colored pills on their due date. Best for deadline planning." },
                { view: "Gallery", desc: "Visual card grid showing each task as a rich card with project color, assignee avatars, and status badges. Best for visual thinkers who prefer a Pinterest-style layout." },
                { view: "Roadmap", desc: "Horizontal timeline bars showing task durations across a project timeline. Each project gets its own swim lane. Best for long-term planning and seeing overlaps." },
                { view: "Triage", desc: "Inbox-style view split into sections: Unassigned tasks, Backlog items, and tasks with No Due Date. Best for weekly grooming and making sure nothing falls through the cracks." },
              ].map((item, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-3 flex gap-3">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <h5 className="text-xs font-bold">{item.view}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-bold mt-2">Task Features:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>AI Task Creation:</strong> Type a natural language description and AI creates structured tasks</span></div>
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>Task Detail Modal:</strong> Click any task to see Details, Comments, and Activity tabs</span></div>
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>URL Filtering:</strong> Use <code>?projectId=1</code> or <code>?filter=overdue</code> in the URL</span></div>
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>Bulk Actions:</strong> Select multiple tasks and change status, priority, or delete them all at once</span></div>
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>Recurring Tasks:</strong> Set tasks to repeat daily, weekly, or on custom schedules</span></div>
              <div className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" /><span><strong>Subtasks:</strong> Break tasks into smaller actionable items with checkboxes</span></div>
            </div>

            <Tip>Click a project name in the sidebar to instantly filter tasks to that project. The badge shows how many open tasks remain.</Tip>
          </Section>

          <Section id="sprints" icon={Repeat} iconColor="bg-violet-500" title="Sprints">
            <p className="text-sm text-muted-foreground">Agile sprint management at <code className="text-primary bg-primary/10 px-1 rounded">/sprints</code></p>

            <Step num={1} title="View your burndown chart">
              The burndown chart shows ideal vs actual progress lines. The ideal line is a straight diagonal from total points to zero. The actual line shows your real daily progress.
            </Step>
            <Step num={2} title="Track velocity">
              The velocity chart shows committed vs completed story points per sprint. Use this to improve estimation accuracy over time.
            </Step>
            <Step num={3} title="Check stat cards">
              See Total Points, Completed Points, In Progress count, and Average Velocity at a glance. These update in real-time as tasks are moved.
            </Step>
            <Step num={4} title="Manage sprints">
              Create sprints with start/end dates and goals. Assign tasks to sprints from the task board. Track each sprint's progress with visual progress bars.
            </Step>
          </Section>

          <Section id="time" icon={Clock} iconColor="bg-cyan-500" title="Time & Billing">
            <p className="text-sm text-muted-foreground">Track time and revenue at <code className="text-primary bg-primary/10 px-1 rounded">/time</code></p>

            <Step num={1} title="Start the live timer">
              Click the play button to start tracking time. Enter a description and select the project. The timer runs in real-time and you can stop it to log the entry automatically.
            </Step>
            <Step num={2} title="View time entries">
              Entries are grouped by day with sticky date headers. Today's entries show a "TODAY" badge. Each entry shows description, project, hours, and billable status.
            </Step>
            <Step num={3} title="Track billable metrics">
              The stat cards show: Today's total hours, This Week's revenue, Billable hours count, and Billable percentage. Toggle entries between billable and non-billable.
            </Step>
            <Step num={4} title="Set billing rates">
              Each team member has a billing rate set in their profile. Time entries automatically calculate revenue based on hours x rate when marked as billable.
            </Step>

            <Tip>Mark time entries as billable to see revenue calculations. Non-billable time still counts toward total hours but not revenue.</Tip>
          </Section>

          <Section id="goals" icon={Target} iconColor="bg-amber-500" title="Goals & OKRs">
            <p className="text-sm text-muted-foreground">Set and track objectives at <code className="text-primary bg-primary/10 px-1 rounded">/goals</code></p>

            <Step num={1} title="Create goals">
              Each goal has a title, owner, target project, status (On Track / At Risk / Behind), and due date. Goals represent high-level objectives.
            </Step>
            <Step num={2} title="Add key results">
              Under each goal, define measurable key results with progress bars (0-100%). Key results make goals concrete and trackable.
            </Step>
            <Step num={3} title="Use AI Health Check">
              Click the AI Health Check button on any goal to get an automated analysis of its progress, risks, and recommended actions.
            </Step>
            <Step num={4} title="Monitor progress visually">
              Each goal card has a donut chart showing overall completion. The progress is calculated from the average of all key result percentages.
            </Step>
          </Section>

          <Section id="portfolio" icon={PieChart} iconColor="bg-rose-500" title="Portfolio">
            <p className="text-sm text-muted-foreground">Executive project overview at <code className="text-primary bg-primary/10 px-1 rounded">/portfolio</code></p>

            <Step num={1} title="Read the AI Executive Summary">
              Click "Refresh" to generate a fresh AI-powered overview of all projects, their health, and risks. This is designed for stakeholder reporting.
            </Step>
            <Step num={2} title="Check project health cards">
              Each project shows a health donut chart (0-100%), current phase, client name, and budget utilization bar. Colors indicate health: green (good), yellow (at risk), red (critical).
            </Step>
            <Step num={3} title="Review financials">
              The 4-stat grid shows Tasks Done, Total Spent, Budget Left, and In Progress count across all projects combined.
            </Step>
          </Section>

          <Section id="documents" icon={FileText} iconColor="bg-indigo-500" title="Documents & Wiki">
            <p className="text-sm text-muted-foreground">Knowledge base at <code className="text-primary bg-primary/10 px-1 rounded">/documents</code></p>

            <Step num={1} title="Browse documents">
              The left pane shows all documents. Click any document to view it in the right pane with full markdown rendering.
            </Step>
            <Step num={2} title="Create and edit">
              Click "New Document" to create. Switch to edit mode to write in markdown. Your documents auto-save.
            </Step>
            <Step num={3} title="Use AI generation">
              Click the "Generate" button and the AI will create content for your document based on the title and existing content context.
            </Step>
            <Step num={4} title="Organize with tags and pins">
              Add tags to categorize documents. Pin important ones so they appear at the top of the list.
            </Step>
          </Section>

          <Section id="announcements" icon={Megaphone} iconColor="bg-orange-500" title="Announcements">
            <p className="text-sm text-muted-foreground">Team communications at <code className="text-primary bg-primary/10 px-1 rounded">/announcements</code></p>

            <Step num={1} title="Post announcements">
              Create announcements with a title, content, and optional project association. Pin important announcements to keep them at the top.
            </Step>
            <Step num={2} title="React and comment">
              React to announcements with emoji reactions. Leave threaded comments for discussion.
            </Step>
          </Section>

          <Section id="standups" icon={ClipboardList} iconColor="bg-teal-500" title="Daily Standups">
            <p className="text-sm text-muted-foreground">AI-generated standups at <code className="text-primary bg-primary/10 px-1 rounded">/standups</code></p>

            <Step num={1} title="Generate standups">
              Click "Generate All" to create AI-powered standup reports for every team member based on their recent task activity, time entries, and project involvement.
            </Step>
            <Step num={2} title="Individual generation">
              Click the generate button on any team member's card to create just their standup. Each standup includes: what they did yesterday, what they're doing today, and blockers.
            </Step>

            <Tip>Standups are generated from real data — task status changes, time entries, and comments. The more your team uses the platform, the better the standups.</Tip>
          </Section>

          <Section id="messaging" icon={MessageSquare} iconColor="bg-green-500" title="Messaging Center (Twilio)">
            <p className="text-sm text-muted-foreground">Full communication hub at <code className="text-primary bg-primary/10 px-1 rounded">/messaging</code></p>

            <Step num={1} title="Send SMS messages">
              Select the SMS channel, enter a phone number (with country code, e.g. +1234567890), type your message, and click Send. Messages are sent via your Twilio phone number.
            </Step>
            <Step num={2} title="Make voice calls">
              Select the Voice channel, enter a phone number, type the message (it will be spoken via text-to-speech), and click Call. The recipient hears an AI-generated voice reading your message.
            </Step>
            <Step num={3} title="Manage contacts">
              Create contacts with name, phone, email, company, and role. Search contacts and click to quick-fill the recipient field when composing messages.
            </Step>
            <Step num={4} title="View message history">
              The History tab shows all sent/received messages with channel filtering (SMS, Voice, Email). Click any entry to see full details.
            </Step>
            <Step num={5} title="Check Twilio live data">
              The Twilio Live tab shows raw message and call data directly from your Twilio account — useful for debugging delivery issues.
            </Step>
            <Step num={6} title="Review settings">
              The Settings tab shows your Twilio account info, registered phone numbers with capabilities (SMS, MMS, Voice), and webhook URLs for inbound handling.
            </Step>

            <Warning>SMS and voice calls are sent through Twilio and incur charges. Make sure your Twilio account has sufficient balance.</Warning>
          </Section>

          <Section id="email-hub" icon={Mail} iconColor="bg-violet-500" title="Email Hub">
            <p className="text-sm text-muted-foreground">Email management at <code className="text-primary bg-primary/10 px-1 rounded">/email</code></p>

            <Step num={1} title="Check the inbox">
              The Email Inbox tab shows all emails — both inbound and outbound. Use the search bar and direction filters (All / Inbound / Outbound) to find specific emails. Click any email to see the full content, sender, recipient, provider, and routing info.
            </Step>
            <Step num={2} title="Compose & send to project">
              Switch to the Compose tab. Select a project from the dropdown, fill in from/to addresses, subject, and message body, then click "Send to Project". The email is logged and associated with that project for tracking.
            </Step>
            <Step num={3} title="View stats">
              The 5 stat cards at the top show: Total Emails, Inbound count, Outbound count, Active Routes, and Pending Reminders.
            </Step>

            <div className="bg-background border border-border rounded-xl p-4">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Project Email Addresses
              </h4>
              <p className="text-xs text-muted-foreground mb-3">Each project has custom email addresses for routing. Send to any of these addresses and the email will be automatically associated with the correct project:</p>
              <div className="space-y-2">
                {projects.map((p: any) => {
                  const projectRoutes = emailRoutes.filter((r: any) => r.projectId === p.id);
                  return (
                    <div key={p.id} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-bold">{p.name}</span>
                        {p.tag && <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">[{p.tag}]</code>}
                      </div>
                      <div className="space-y-1">
                        {projectRoutes.length > 0 ? projectRoutes.map((r: any) => (
                          <div key={r.id} className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <code className="text-xs font-mono text-emerald-400">{r.assignedEmail}</code>
                            <CopyButton text={r.assignedEmail} />
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.isActive ? "text-emerald-400 bg-emerald-400/10" : "text-gray-400 bg-gray-400/10"}`}>
                              {r.isActive ? "active" : "paused"}
                            </span>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground">No email routes configured</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section id="email-routing" icon={Route} iconColor="bg-amber-500" title="Email Routing — How It Works">
            <p className="text-sm text-muted-foreground">Automatically route inbound emails to the correct project using two methods:</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  Method 1: Subject Tag Routing
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Include a project tag in square brackets in the email subject line. The system extracts the tag and matches it to the correct project.
                </p>
                <div className="space-y-2">
                  {projects.filter((p: any) => p.tag).map((p: any) => (
                    <div key={p.id}>
                      <p className="text-[10px] text-muted-foreground mb-1">{p.name}:</p>
                      <CodeBlock code={`Subject: [${p.tag}] Bug report for login page`} />
                    </div>
                  ))}
                </div>
                <Tip>Tag matching is case-insensitive. [WEBPLAT], [webplat], and [WebPlat] all work.</Tip>
              </div>

              <div className="bg-background border border-border rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-violet-400" />
                  Method 2: Email Address Routing
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Send to a project's assigned email address. The system matches the "to" address against your email routes and auto-assigns the email.
                </p>
                <div className="space-y-2">
                  {emailRoutes.slice(0, 4).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <code className="font-mono text-emerald-400">{r.assignedEmail}</code>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{r.projectName}</span>
                    </div>
                  ))}
                </div>
                <Tip>If both tag and email match, the subject tag takes priority.</Tip>
              </div>
            </div>

            <h4 className="text-sm font-bold">Managing Routes:</h4>
            <Step num={1} title="Add a route">
              Go to Email Hub → Email Routes tab. Select a project, type the email address, and click "Add Route". The email is normalized to lowercase automatically.
            </Step>
            <Step num={2} title="Pause/activate routes">
              Hover over any route and click the pause/play button to toggle it. Paused routes won't match inbound emails.
            </Step>
            <Step num={3} title="Delete routes">
              Hover over a route and click the trash icon. Confirm the deletion. The route is permanently removed.
            </Step>

            <h4 className="text-sm font-bold">Inbound Webhook:</h4>
            <p className="text-xs text-muted-foreground mb-2">Configure your email provider (SendGrid, AWS SES, etc.) to forward inbound emails to the webhook endpoint:</p>
            <CodeBlock label="Inbound webhook URL" code={`POST /api/email-routing/inbound\n\nBody (JSON):\n{\n  "from": "sender@example.com",\n  "to": "webplatform@projectos.dev",\n  "subject": "[WEBPLAT] Bug report",\n  "text": "Found a bug on the login page...",\n  "html": "<p>Found a bug...</p>"\n}`} />

            <Warning>Set the EMAIL_WEBHOOK_SECRET environment variable to secure the inbound webhook. When set, all inbound requests must include a matching x-webhook-secret header.</Warning>
          </Section>

          <Section id="reminders" icon={Bell} iconColor="bg-rose-500" title="Reminders">
            <p className="text-sm text-muted-foreground">Schedule notifications via multiple channels:</p>

            <Step num={1} title="Create a reminder">
              Go to Email Hub → Reminders tab → click "New Reminder". Fill in the title, message, scheduled date/time, notification type, and optionally link to a project.
            </Step>
            <Step num={2} title="Choose notification type">
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-2"><Bell className="w-3 h-3 text-amber-400" /><span><strong>In-App:</strong> Creates a notification in the Notification Center (bell icon). No phone number needed.</span></div>
                <div className="flex items-center gap-2"><MessageSquare className="w-3 h-3 text-emerald-400" /><span><strong>SMS:</strong> Sends an SMS via Twilio to the specified phone number.</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-blue-400" /><span><strong>Voice Call:</strong> Makes a call via Twilio and reads the reminder using text-to-speech.</span></div>
                <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-violet-400" /><span><strong>Email (via SMS):</strong> Sends the reminder as an SMS message to the target phone.</span></div>
              </div>
            </Step>
            <Step num={3} title="Monitor status">
              Each reminder shows its status: <strong>Pending</strong> (waiting to fire), <strong>Sent</strong> (successfully delivered), <strong>Failed</strong> (delivery error), or <strong>Cancelled</strong> (manually stopped).
            </Step>
            <Step num={4} title="Send now or cancel">
              Hover over any pending reminder to see action buttons. Click the play icon to send immediately, or the X icon to cancel it.
            </Step>

            <Tip>Reminders are checked every 30 seconds. The system uses an atomic claim mechanism to prevent duplicate sends even under high load.</Tip>
          </Section>

          <Section id="admin" icon={Shield} iconColor="bg-gradient-to-br from-violet-500 to-indigo-500" title="Super Admin Panel">
            <p className="text-sm text-muted-foreground">Full platform control at <code className="text-primary bg-primary/10 px-1 rounded">/admin</code> — 9 tabs:</p>

            <div className="space-y-2">
              {[
                { tab: "Overview", desc: "8 stat cards covering projects, tasks, members, sprints, goals, budget, and health. Status/priority breakdowns, team workload chart, and financial summary." },
                { tab: "AI Command Center", desc: "60 AI analysis features split into Core (20), Advanced (20), and Predictive (20) categories. Click 'Run' to execute any analysis and see rich results with insights, recommendations, and risk assessments." },
                { tab: "Feature Flags", desc: "55 platform feature toggles organized by category (Views, Tasks, Data, Agile, Integration, Security, Finance, etc.). Toggle any feature on/off to customize the platform." },
                { tab: "Task Templates", desc: "Pre-built templates for bugs, PRDs, features, and custom task types. Each template defines default status, priority, points, tags, subtask templates, and notes." },
                { tab: "Custom Fields", desc: "Create project-specific fields: text, number, URL, checkbox, rating, select, date, email. Fields appear on tasks and can be required." },
                { tab: "Expense Tracking", desc: "Log, approve, and delete expenses by category (software, hardware, travel, etc.). Each expense is linked to a project and team member." },
                { tab: "API & Email", desc: "API key management (create, revoke, regenerate keys with scoped permissions and expiry dates). Email system configuration for SMTP, SendGrid, Mailgun, SES, or Postmark with test email functionality." },
                { tab: "Security", desc: "Password protection setup/removal, YubiKey/WebAuthn FIDO2 hardware key registration, session management, and security credential overview." },
                { tab: "System Config", desc: "Authentication settings, webhook configuration, API options, and integration management." },
              ].map((item, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-3 flex gap-3">
                  <div className="w-5 h-5 rounded-md bg-violet-500/10 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <h5 className="text-xs font-bold">{item.tab}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="security" icon={Lock} iconColor="bg-red-500" title="Security & Authentication">
            <p className="text-sm text-muted-foreground">ProjectOS uses session-based authentication with two methods:</p>

            <Step num={1} title="Password Protection">
              Set up a master password from Admin → Security tab. Once configured, all users must enter the password to access the platform. The session cookie lasts 24 hours.
            </Step>
            <Step num={2} title="YubiKey / WebAuthn">
              Register a hardware security key (YubiKey, built-in fingerprint, etc.) for passwordless authentication. Go to Admin → Security → click "Register New Key" and follow the browser prompts.
            </Step>
            <Step num={3} title="API Key Authentication">
              For programmatic access, generate API keys from Admin → API & Email tab. Include the key as a Bearer token in the Authorization header.
            </Step>

            <CodeBlock label="API authentication example" code={`# With API key\ncurl -H "Authorization: Bearer pos_abc123..." /api/projects\n\n# With session cookie (after login)\ncurl -b cookies.txt /api/projects`} />

            <Warning>Never share your API keys or password. The webhook endpoints (/messaging/webhook/* and /email-routing/inbound) bypass authentication but use provider-specific validation.</Warning>
          </Section>

          <Section id="ai" icon={Sparkles} iconColor="bg-gradient-to-br from-amber-400 to-orange-500" title="AI Features">
            <p className="text-sm text-muted-foreground">AI is integrated throughout the platform:</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { where: "AI Chat (Cmd+I)", what: "Ask natural language questions about your projects, tasks, team, budgets, and more. The AI assistant analyzes your data in real-time." },
                { where: "Dashboard Briefing", what: "AI-generated daily summary of project status, risks, and action items. Click 'Refresh Briefing' to regenerate." },
                { where: "AI Task Creation", what: "Type a description like 'Create a login page for the mobile app' and AI structures it into a task with title, priority, type, and points." },
                { where: "Admin AI Center", what: "60 specialized AI analysis features: risk prediction, sprint planning, budget forecasting, priority optimization, team sentiment, and more." },
                { where: "Goal Health Check", what: "AI analyzes each goal's progress, key results, and timeline to provide health assessments and recommendations." },
                { where: "Portfolio Summary", what: "AI executive summary of all project health, budget utilization, and strategic recommendations." },
                { where: "Document Generation", what: "AI writes document content based on title and context. Useful for generating meeting notes, specs, and guides." },
                { where: "Standup Generation", what: "AI creates daily standup reports from task activity, time entries, and project status for each team member." },
              ].map((item, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-3">
                  <h5 className="text-xs font-bold text-primary mb-1">{item.where}</h5>
                  <p className="text-[11px] text-muted-foreground">{item.what}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="shortcuts" icon={Settings} iconColor="bg-gray-500" title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-3">
              {[
                { keys: "Cmd + K", action: "Open Command Palette — search and navigate to any page, task, or document" },
                { keys: "Cmd + I", action: "Open AI Assistant chat drawer" },
                { keys: "Escape", action: "Close modals, drawers, and the command palette" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3">
                  <kbd className="text-xs font-mono font-bold bg-secondary px-2 py-1 rounded border border-border text-primary whitespace-nowrap">{item.keys}</kbd>
                  <span className="text-xs text-muted-foreground">{item.action}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="api" icon={Globe} iconColor="bg-blue-600" title="API Reference">
            <p className="text-sm text-muted-foreground">All API endpoints are available at <code className="text-primary bg-primary/10 px-1 rounded">/api</code>. Authentication required (cookie or API key).</p>

            <div className="space-y-3">
              {[
                { group: "Projects", endpoints: "GET/POST /projects, PATCH/DELETE /projects/:id — Manage projects with name, icon, color, client, budget, health, phase, tag" },
                { group: "Tasks", endpoints: "GET/POST /tasks, GET/PATCH/DELETE /tasks/:id, POST /tasks/reorder, POST /tasks/bulk — Full CRUD with ordering and bulk operations" },
                { group: "Members", endpoints: "GET/POST /members, PATCH /members/:id — Team member management with roles and billing rates" },
                { group: "Sprints", endpoints: "GET/POST /sprints, PATCH /sprints/:id — Sprint creation and management" },
                { group: "Time Entries", endpoints: "GET/POST /time-entries, PATCH/DELETE /time-entries/:id — Time tracking with billable/rate calculations" },
                { group: "Goals", endpoints: "GET/POST /goals, PATCH /goals/:id — OKR management with key results" },
                { group: "Documents", endpoints: "GET/POST /documents, GET/PATCH/DELETE /documents/:id — Wiki and document management" },
                { group: "Notifications", endpoints: "GET/POST /notifications, PATCH /:id/read, POST /mark-all-read — Notification system" },
                { group: "Messaging", endpoints: "POST /messaging/sms, POST /messaging/call — Send SMS and make voice calls via Twilio" },
                { group: "Reminders", endpoints: "GET/POST /reminders, PATCH/DELETE /reminders/:id, POST /reminders/:id/send-now — Schedule and dispatch reminders" },
                { group: "Email Routing", endpoints: "GET/POST /email-routing/routes, GET /email-routing/logs, POST /email-routing/send-to-project, POST /email-routing/inbound" },
                { group: "Admin", endpoints: "GET /admin/stats, POST /admin/ai/analyze — Admin dashboard stats and AI analysis" },
                { group: "Security", endpoints: "POST /security/password/setup, POST /security/password/login, WebAuthn registration/authentication — Auth management" },
                { group: "API Keys", endpoints: "GET/POST /api-keys, PATCH/DELETE /api-keys/:id, POST /api-keys/:id/regenerate — API key management" },
              ].map((item, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-3">
                  <h5 className="text-xs font-bold text-primary">{item.group}</h5>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1">{item.endpoints}</p>
                </div>
              ))}
            </div>

            <CodeBlock label="Example: Create a task via API" code={`curl -X POST /api/tasks \\\n  -H "Authorization: Bearer pos_your_api_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "Fix login bug",\n    "type": "bug",\n    "status": "todo",\n    "priority": "high",\n    "projectId": 1,\n    "points": 3\n  }'`} />
          </Section>

          <div className="h-20" />
        </div>
      </div>
    </div>
  );
}
