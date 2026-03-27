import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Brain, Zap, BarChart3, AlertTriangle, Users, DollarSign, Target,
  FileText, Layers, Settings, TrendingUp, Clock, Lightbulb, GitBranch,
  Activity, PieChart, BookOpen, MessageSquare, Gauge, RefreshCw, Eye,
  ChevronRight, Copy, Plus, Trash2, Check, X, Star, Cpu, Sparkles,
  Search, Box, Globe, Workflow, CalendarDays, Table, LayoutGrid, Map,
  Inbox, Receipt, Puzzle, Tag, ListFilter, Network, ArrowLeftRight,
  Flame, Tags, Split, ScrollText, Crosshair, Radar, Timer, Radio,
  ShieldAlert, Milestone, Wrench, Megaphone, UserCheck, Heart, Hash,
  Grip, Import, Database, Lock, SunMoon, Keyboard, Mail,
  GitPullRequest, Link2, FolderArchive, Palette, UserPlus,
  Repeat, MailPlus, Gamepad2, GraduationCap, Handshake, BrainCircuit,
  ClipboardCheck, Trophy, Calculator, Shapes, ShieldCheck, Focus,
  GitCompareArrows, Pickaxe, Telescope, Binary, Shuffle, Fingerprint,
  History, Bookmark, GanttChart, Megaphone as MegaphoneIcon, Rows3,
  Store, BookMarked, CircleDot, SquareStack, Cog, Scale
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

import { SecurityManagement } from "@/components/AuthGate";

type AdminTab = "overview" | "ai-features" | "templates" | "custom-fields" | "expenses" | "features" | "api-email" | "security" | "system" | "roles";

const AI_FEATURES = [
  { key: "risk_prediction", title: "Risk Prediction", icon: AlertTriangle, color: "#ef4444", desc: "Flag at-risk tasks, overdue items, and blocked work before they escalate" },
  { key: "sprint_planning", title: "Sprint Planning", icon: Target, color: "#6366f1", desc: "AI-suggested assignments based on capacity, velocity, and skill match" },
  { key: "budget_forecast", title: "Budget Forecast", icon: DollarSign, color: "#22c55e", desc: "Predict future spend based on burn rate and historical data" },
  { key: "priority_suggestion", title: "Priority Optimizer", icon: TrendingUp, color: "#f59e0b", desc: "Auto-suggest priority changes based on deadlines and dependencies" },
  { key: "duplicate_detection", title: "Duplicate Detection", icon: Copy, color: "#8b5cf6", desc: "Find similar and duplicate tasks across projects" },
  { key: "sentiment_analysis", title: "Team Sentiment", icon: Users, color: "#ec4899", desc: "Analyze team morale from workload, blockers, and completion rates" },
  { key: "scope_creep", title: "Scope Creep Detection", icon: Layers, color: "#f97316", desc: "Alert when new tasks are added beyond the sprint commitment" },
  { key: "bottleneck_detection", title: "Bottleneck Detection", icon: Activity, color: "#e11d48", desc: "Identify workflow bottlenecks — review queues, overloaded members" },
  { key: "time_estimation", title: "Time Estimation", icon: Clock, color: "#0ea5e9", desc: "Predict task completion time from historical point-to-hours ratio" },
  { key: "quality_score", title: "Quality Score", icon: Star, color: "#eab308", desc: "Rate project quality by docs, subtasks, and completion rates" },
  { key: "workload_balancer", title: "Workload Balancer", icon: ArrowLeftRight, color: "#14b8a6", desc: "Suggest task redistribution to equalize team workload" },
  { key: "dependency_mapping", title: "Dependency Mapper", icon: GitBranch, color: "#a78bfa", desc: "Auto-detect task dependencies and critical path chains" },
  { key: "retrospective", title: "Retro Insights", icon: BookOpen, color: "#f472b6", desc: "Analyze sprint patterns and generate retrospective talking points" },
  { key: "progress_report", title: "Progress Reports", icon: BarChart3, color: "#3b82f6", desc: "Auto-generate weekly/monthly status reports for stakeholders" },
  { key: "smart_scheduling", title: "Smart Scheduling", icon: CalendarDays, color: "#06b6d4", desc: "Auto-assign due dates based on story points and capacity" },
  { key: "resource_optimization", title: "Resource Optimizer", icon: Gauge, color: "#84cc16", desc: "Optimize team utilization rates and identify underused capacity" },
  { key: "knowledge_graph", title: "Knowledge Graph", icon: Network, color: "#7c3aed", desc: "Map connections between projects, tasks, goals, sprints, and team" },
  { key: "client_report", title: "Client Report Gen", icon: FileText, color: "#0d9488", desc: "Generate client-facing reports with budget, progress, and highlights" },
  { key: "standup_questions", title: "Smart Standups", icon: MessageSquare, color: "#d946ef", desc: "Generate targeted standup questions based on each member's work" },
  { key: "capacity_planning", title: "Capacity Planning", icon: PieChart, color: "#64748b", desc: "Forecast future capacity needs based on project pipeline" },
];

const AI_FEATURES_2 = [
  { key: "auto_tagger", title: "Auto-Tagger", icon: Tags, color: "#14b8a6", desc: "Auto-suggest tags for untagged tasks using NLP keyword analysis" },
  { key: "task_decomposer", title: "Task Decomposer", icon: Split, color: "#8b5cf6", desc: "Break down epics into subtasks with estimated points" },
  { key: "release_notes", title: "Release Notes Gen", icon: ScrollText, color: "#22c55e", desc: "Auto-generate release notes from completed tasks and PRs" },
  { key: "sprint_velocity_predictor", title: "Velocity Predictor", icon: Crosshair, color: "#f97316", desc: "Predict next sprint velocity from historical trends" },
  { key: "skill_matcher", title: "Skill Matcher", icon: UserCheck, color: "#3b82f6", desc: "Match unassigned tasks to best-fit team members by role & capacity" },
  { key: "burnout_detector", title: "Burnout Detector", icon: Flame, color: "#ef4444", desc: "Detect burnout risk from overdue, blocked, and overtime signals" },
  { key: "task_aging", title: "Task Aging Analyzer", icon: Timer, color: "#a78bfa", desc: "Identify stale tasks that need reassignment or closure" },
  { key: "communication_gaps", title: "Communication Gap Detector", icon: Radio, color: "#ec4899", desc: "Find siloed team members and cross-project collaboration gaps" },
  { key: "effort_impact_matrix", title: "Effort vs Impact Matrix", icon: Radar, color: "#06b6d4", desc: "Quadrant analysis: quick wins, major projects, fill-ins, thankless" },
  { key: "deadline_risk", title: "Deadline Risk Analyzer", icon: ShieldAlert, color: "#e11d48", desc: "Predict deadline misses based on estimated days vs days remaining" },
  { key: "resource_conflicts", title: "Resource Conflict Detector", icon: Grip, color: "#f59e0b", desc: "Find scheduling conflicts when multiple tasks overlap for one member" },
  { key: "tech_debt_scorer", title: "Tech Debt Scorer", icon: Wrench, color: "#64748b", desc: "Score technical debt per project from bugs, stale items, and tags" },
  { key: "milestone_tracker", title: "Milestone Tracker", icon: Milestone, color: "#6366f1", desc: "Predict milestone completion with confidence levels" },
  { key: "velocity_optimizer", title: "Velocity Optimizer", icon: TrendingUp, color: "#84cc16", desc: "Analyze points-per-hour efficiency per team member" },
  { key: "cross_project_deps", title: "Cross-Project Dependencies", icon: GitBranch, color: "#7c3aed", desc: "Map shared resources across projects and flag contention risks" },
  { key: "meeting_agenda", title: "Meeting Agenda Generator", icon: Megaphone, color: "#0d9488", desc: "Auto-generate standup, sprint review, and retro agendas" },
  { key: "customer_impact", title: "Customer Impact Analyzer", icon: Heart, color: "#f472b6", desc: "Assess customer-facing impact of each open task" },
  { key: "project_health_deep", title: "Deep Project Health", icon: Activity, color: "#0ea5e9", desc: "Composite health score from budget, tasks, and risk factors" },
  { key: "automation_suggestions", title: "Automation Suggestions", icon: Workflow, color: "#d946ef", desc: "AI-suggested if-then workflow automations based on patterns" },
  { key: "csv_preview", title: "Data Import/Export", icon: Database, color: "#38bdf8", desc: "Preview CSV import/export structure for all data types" },
];

const AI_FEATURES_3 = [
  { key: "context_switcher", title: "Context Switcher", icon: Shuffle, color: "#6366f1", desc: "Predict which task each member should work on next based on urgency and patterns" },
  { key: "email_drafter", title: "Email Drafter", icon: MailPlus, color: "#22c55e", desc: "Auto-draft stakeholder update emails from live project data" },
  { key: "retro_facilitator", title: "Retro Facilitator", icon: Gamepad2, color: "#f97316", desc: "Generate retrospective exercises tailored to sprint performance" },
  { key: "onboarding_planner", title: "Onboarding Planner", icon: GraduationCap, color: "#8b5cf6", desc: "Create personalized 3-week onboarding plans for new team members" },
  { key: "pair_programming", title: "Pair Programming Optimizer", icon: Handshake, color: "#ec4899", desc: "Suggest optimal pair programming matches based on skills and projects" },
  { key: "knowledge_decay", title: "Knowledge Decay Detector", icon: BrainCircuit, color: "#ef4444", desc: "Identify outdated docs, stale decisions, and knowledge gaps" },
  { key: "decision_logger", title: "Decision Logger", icon: ClipboardCheck, color: "#0ea5e9", desc: "Auto-capture decision rationale from task transitions and status changes" },
  { key: "competitive_velocity", title: "Competitive Benchmark", icon: Trophy, color: "#f59e0b", desc: "Compare team velocity against industry benchmarks and averages" },
  { key: "cost_per_feature", title: "Cost-Per-Feature", icon: Calculator, color: "#14b8a6", desc: "Calculate true cost of each feature from hours, rates, and scope" },
  { key: "sprint_themes", title: "Sprint Theme Detector", icon: Shapes, color: "#a78bfa", desc: "Identify natural themes and patterns in sprint work (bug fixing, feature, etc.)" },
  { key: "blocker_predictor", title: "Blocker Predictor", icon: ShieldCheck, color: "#e11d48", desc: "Predict which tasks will become blocked before they actually do" },
  { key: "meeting_roi", title: "Meeting ROI Calculator", icon: Scale, color: "#64748b", desc: "Calculate meeting costs vs output based on attendee rates and duration" },
  { key: "priority_decay", title: "Priority Decay Analyzer", icon: Repeat, color: "#d946ef", desc: "Identify high-priority tasks that have been stale and repeatedly ignored" },
  { key: "team_growth", title: "Team Growth Tracker", icon: TrendingUp, color: "#84cc16", desc: "Track individual skill growth from task complexity and project breadth" },
  { key: "handoff_analyzer", title: "Handoff Risk Analyzer", icon: GitCompareArrows, color: "#06b6d4", desc: "Identify risky task handoffs between team members with different roles" },
  { key: "focus_time", title: "Focus Time Optimizer", icon: Focus, color: "#3b82f6", desc: "Suggest optimal focus time blocks and deep work schedules per member" },
  { key: "dependency_chain_risk", title: "Dependency Chain Risk", icon: GitBranch, color: "#7c3aed", desc: "Identify risky dependency chains and bottleneck stages per project" },
  { key: "workflow_patterns", title: "Workflow Pattern Mining", icon: Pickaxe, color: "#f472b6", desc: "Discover common workflow patterns, bottlenecks, and ownership gaps" },
  { key: "project_similarity", title: "Project Similarity Finder", icon: Telescope, color: "#0d9488", desc: "Find similar projects for estimation based on tags, size, and scope" },
  { key: "sprint_themes_2", title: "Predictive Analytics", icon: Binary, color: "#38bdf8", desc: "ML-style predictions combining velocity, burnout, and deadline signals" },
];

const PLATFORM_FEATURES = [
  { key: "table_view", title: "Table / Spreadsheet View", icon: Table, category: "Views", desc: "Airtable-style spreadsheet with inline editing, sorting, and grouping", status: "ready" },
  { key: "gallery_view", title: "Gallery View", icon: LayoutGrid, category: "Views", desc: "Visual card grid layout for image-heavy tasks or design assets", status: "ready" },
  { key: "roadmap_view", title: "Roadmap View", icon: Map, category: "Views", desc: "Initiative-level timeline view for planning quarters and milestones", status: "ready" },
  { key: "mind_map", title: "Mind Map View", icon: Network, category: "Views", desc: "Visual mind map of task relationships and project hierarchy", status: "ready" },
  { key: "whiteboard", title: "Whiteboard / Canvas", icon: Palette, category: "Views", desc: "Freeform drawing canvas for brainstorming and planning", status: "ready" },
  { key: "triage_inbox", title: "Triage Inbox", icon: Inbox, category: "Tasks", desc: "Incoming unclassified issues — assign, prioritize, or dismiss", status: "ready" },
  { key: "task_templates", title: "Task Templates", icon: FileText, category: "Tasks", desc: "Predefined templates for bugs, PRDs, features, and more", status: "ready" },
  { key: "custom_fields", title: "Custom Fields", icon: Tag, category: "Data", desc: "Add text, number, URL, checkbox, rating fields to any project", status: "ready" },
  { key: "unique_ids", title: "Unique Task IDs", icon: Puzzle, category: "Tasks", desc: "Auto-generated prefix IDs like TAS-001, BUG-042 per project", status: "ready" },
  { key: "expense_tracking", title: "Expense Tracking", icon: Receipt, category: "Finance", desc: "Log non-time expenses, track categories, approve/reject", status: "ready" },
  { key: "cycle_time", title: "Cycle/Lead Time Metrics", icon: Activity, category: "Agile", desc: "Track how long tasks take from creation to completion", status: "ready" },
  { key: "custom_statuses", title: "Custom Statuses per Project", icon: ListFilter, category: "Tasks", desc: "Define custom workflow stages per project (e.g., QA, Staging)", status: "ready" },
  { key: "multi_project", title: "Multi-Project Membership", icon: Layers, category: "Tasks", desc: "Tasks can belong to multiple projects simultaneously", status: "ready" },
  { key: "epic_board", title: "Epics Board", icon: Box, category: "Agile", desc: "First-class epic view grouping related tasks and stories", status: "ready" },
  { key: "webhook_api", title: "Webhook/API Support", icon: Globe, category: "Integration", desc: "Public REST API and webhook endpoints for integrations", status: "ready" },
  { key: "automations", title: "Workflow Automations", icon: Workflow, category: "System", desc: "If-then rules — auto-assign, move, notify on status change", status: "ready" },
  { key: "formula_fields", title: "Formula Fields", icon: Hash, category: "Data", desc: "Computed fields using formulas across task properties", status: "ready" },
  { key: "linked_records", title: "Linked Records / Relations", icon: Link2, category: "Data", desc: "Database-style relations linking tasks, goals, and projects", status: "ready" },
  { key: "rollup_fields", title: "Rollup Fields", icon: FolderArchive, category: "Data", desc: "Aggregate data from linked records (sum, count, average)", status: "ready" },
  { key: "email_to_task", title: "Email-to-Task", icon: Mail, category: "Integration", desc: "Create tasks from incoming emails with auto-parsing", status: "ready" },
  { key: "github_linking", title: "GitHub/GitLab PR Linking", icon: GitPullRequest, category: "Integration", desc: "Auto-link PRs and commits to tasks, update status on merge", status: "ready" },
  { key: "critical_path", title: "Critical Path Analysis", icon: GitBranch, category: "Agile", desc: "Identify the longest chain of dependent tasks", status: "ready" },
  { key: "baseline_comparison", title: "Baseline Comparison", icon: BarChart3, category: "Agile", desc: "Compare current progress against original sprint plan", status: "ready" },
  { key: "role_permissions", title: "Role-Based Permissions", icon: Lock, category: "Security", desc: "Admin, Manager, Member, Guest roles with granular access", status: "ready" },
  { key: "guest_access", title: "Guest / Client Access", icon: UserPlus, category: "Security", desc: "Invite external users with view-only or limited access", status: "ready" },
  { key: "sso_saml", title: "SSO / SAML", icon: Shield, category: "Security", desc: "Enterprise single sign-on with SAML 2.0 and OAuth", status: "ready" },
  { key: "dark_light_mode", title: "Dark / Light Mode", icon: SunMoon, category: "UX", desc: "System-aware theme switching with custom accent colors", status: "ready" },
  { key: "keyboard_nav", title: "Full Keyboard Navigation", icon: Keyboard, category: "UX", desc: "Navigate entire app without mouse — Vim-style shortcuts", status: "ready" },
  { key: "csv_import", title: "CSV / Excel Import", icon: Import, category: "Data", desc: "Bulk import tasks, members, and time entries from spreadsheets", status: "ready" },
  { key: "digest_emails", title: "Daily/Weekly Digest Emails", icon: Mail, category: "Notifications", desc: "Scheduled email digests with task summaries and highlights", status: "ready" },
  { key: "realtime_presence", title: "Real-Time Presence", icon: Radio, category: "Collaboration", desc: "See who's online and what they're working on in real-time", status: "ready" },
  { key: "video_proofing", title: "Video/Image Proofing", icon: Eye, category: "Design", desc: "Annotate images and videos with timestamped feedback", status: "ready" },
  { key: "time_blocking", title: "Time Blocking", icon: Clock, category: "Time", desc: "Block calendar time for tasks with Google Calendar sync", status: "ready" },
  { key: "white_label", title: "White-Label Portal", icon: Palette, category: "Enterprise", desc: "Custom branding, logos, and domain for client portals", status: "ready" },
  { key: "resource_forecast", title: "Resource Forecasting", icon: TrendingUp, category: "Resource", desc: "Predict future resource needs based on project pipeline", status: "ready" },
  { key: "gantt_chart", title: "Gantt Chart View", icon: GanttChart, category: "Views", desc: "Interactive Gantt chart with task dependencies and critical path highlighting", status: "ready" },
  { key: "database_views", title: "Database Views (Notion-style)", icon: Rows3, category: "Views", desc: "Create multiple views of the same data — table, board, calendar, gallery", status: "ready" },
  { key: "synced_blocks", title: "Synced Blocks / Components", icon: Repeat, category: "Collaboration", desc: "Reusable content blocks that update everywhere when edited once", status: "ready" },
  { key: "sub_pages", title: "Sub-Pages / Nested Docs", icon: BookMarked, category: "Documents", desc: "Infinitely nested pages within documents — tree-style wiki structure", status: "ready" },
  { key: "template_marketplace", title: "Template Marketplace", icon: Store, category: "Enterprise", desc: "Browse and install community-built project templates and workflows", status: "ready" },
  { key: "version_history", title: "Version History UI", icon: History, category: "Documents", desc: "Visual diff viewer for document revisions with restore capability", status: "ready" },
  { key: "favorites", title: "Favorites / Bookmarks", icon: Bookmark, category: "UX", desc: "Pin frequently accessed tasks, projects, and documents to quick-access bar", status: "ready" },
  { key: "audit_log", title: "Audit Log", icon: Fingerprint, category: "Security", desc: "Complete audit trail of all user actions with timestamps and IP addresses", status: "ready" },
  { key: "data_retention", title: "Data Retention Policies", icon: Database, category: "Security", desc: "Configure auto-delete rules for old tasks, logs, and attachments", status: "ready" },
  { key: "workspace_analytics", title: "Workspace Analytics", icon: BarChart3, category: "Analytics", desc: "Organization-wide dashboard with adoption, engagement, and productivity metrics", status: "ready" },
  { key: "activity_feed", title: "Global Activity Feed", icon: Activity, category: "Collaboration", desc: "Real-time feed of all workspace changes — task updates, comments, and completions", status: "ready" },
  { key: "task_dependencies", title: "Task Dependencies Graph", icon: GitBranch, category: "Tasks", desc: "Visual dependency graph with drag-to-link and circular dependency detection", status: "ready" },
  { key: "custom_emoji", title: "Custom Emoji / Icons", icon: CircleDot, category: "UX", desc: "Upload custom emoji and icons for projects, statuses, and reactions", status: "ready" },
  { key: "checklist_templates", title: "Checklist Templates", icon: ClipboardCheck, category: "Tasks", desc: "Reusable checklist templates for QA, deployment, and onboarding processes", status: "ready" },
  { key: "integration_marketplace", title: "Integration Marketplace", icon: SquareStack, category: "Integration", desc: "Browse and install 100+ integrations — Slack, GitHub, Jira, Figma, and more", status: "ready" },
  { key: "mobile_push", title: "Mobile Push Notifications", icon: Megaphone, category: "Notifications", desc: "Configure push notification rules for mobile app users", status: "ready" },
  { key: "api_rate_limiting", title: "API Rate Limiting", icon: Cog, category: "Integration", desc: "Configure rate limits per API key with usage analytics and alerts", status: "ready" },
  { key: "contract_management", title: "Contract Management", icon: FileText, category: "Finance", desc: "Track client contracts, SOWs, and renewal dates with budget linking", status: "ready" },
  { key: "custom_themes", title: "Custom Theme Builder", icon: Palette, category: "UX", desc: "Create custom color schemes with live preview and team sharing", status: "ready" },
];

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [adminStats, setAdminStats] = useState<any>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("admin_features") || "{}"); } catch { return {}; }
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewField, setShowNewField] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/stats`).then(r => r.json()).then(setAdminStats);
    fetch(`${API}/task-templates`).then(r => r.json()).then(setTemplates);
    fetch(`${API}/custom-fields`).then(r => r.json()).then(setCustomFields);
    fetch(`${API}/expenses`).then(r => r.json()).then(setExpenses);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_features", JSON.stringify(enabledFeatures));
  }, [enabledFeatures]);

  const runAiFeature = async (key: string) => {
    setLoadingAi(key);
    try {
      const r = await fetch(`${API}/admin/ai/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: key }),
      });
      const data = await r.json();
      setAiResults(prev => ({ ...prev, [key]: data }));
    } catch (e) { console.error(e); }
    setLoadingAi(null);
  };

  const toggleFeature = (key: string) => {
    setEnabledFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "ai-features", label: "AI Command Center", icon: Brain },
    { key: "features", label: "Feature Flags", icon: Zap },
    { key: "templates", label: "Task Templates", icon: FileText },
    { key: "custom-fields", label: "Custom Fields", icon: Tag },
    { key: "expenses", label: "Expense Tracking", icon: Receipt },
    { key: "api-email", label: "API & Email", icon: Globe },
    { key: "roles", label: "Permission Roles", icon: Users },
    { key: "security", label: "Security", icon: ShieldCheck },
    { key: "system", label: "System Config", icon: Settings },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Super Admin</h1>
            <p className="text-sm text-muted-foreground">System configuration, AI features, and platform management</p>
          </div>
          <div className="ml-auto px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-bold uppercase tracking-wide">
            Admin Only
          </div>
        </div>

        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

            {tab === "overview" && <OverviewTab stats={adminStats} />}
            {tab === "ai-features" && <AIFeaturesTab features={AI_FEATURES} features2={AI_FEATURES_2} features3={AI_FEATURES_3} results={aiResults} loading={loadingAi} onRun={runAiFeature} enabled={enabledFeatures} onToggle={toggleFeature} />}
            {tab === "features" && <FeatureFlagsTab features={PLATFORM_FEATURES} enabled={enabledFeatures} onToggle={toggleFeature} />}
            {tab === "templates" && <TemplatesTab templates={templates} setTemplates={setTemplates} show={showNewTemplate} setShow={setShowNewTemplate} />}
            {tab === "custom-fields" && <CustomFieldsTab fields={customFields} setFields={setCustomFields} show={showNewField} setShow={setShowNewField} />}
            {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} show={showNewExpense} setShow={setShowNewExpense} />}
            {tab === "api-email" && <ApiEmailTab />}
            {tab === "roles" && <RolesTab />}
            {tab === "security" && <SecurityManagement />}
            {tab === "system" && <SystemTab />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: any }) {
  if (!stats) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>;

  const cards = [
    { label: "Total Tasks", value: stats.counts.tasks, icon: Layers, color: "#6366f1" },
    { label: "Projects", value: stats.counts.projects, icon: Box, color: "#22c55e" },
    { label: "Team Members", value: stats.counts.members, icon: Users, color: "#f59e0b" },
    { label: "Sprints", value: stats.counts.sprints, icon: Zap, color: "#8b5cf6" },
    { label: "Total Revenue", value: `$${Math.round(stats.finance.totalRevenue).toLocaleString()}`, icon: DollarSign, color: "#22c55e" },
    { label: "Budget Total", value: `$${Math.round(stats.finance.totalBudget).toLocaleString()}`, icon: TrendingUp, color: "#3b82f6" },
    { label: "Profit Margin", value: `${stats.finance.profitMargin}%`, icon: PieChart, color: "#14b8a6" },
    { label: "Completion Rate", value: `${stats.completionRate}%`, icon: Check, color: "#84cc16" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}20` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: c.color }} />
                </div>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => {
              const total = (Object.values(stats.statusBreakdown) as number[]).reduce((s, v) => s + v, 0);
              const pct = total > 0 ? Math.round((count as number) / total * 100) : 0;
              const colors: Record<string, string> = { backlog: "#64748b", todo: "#3b82f6", inprogress: "#f59e0b", review: "#8b5cf6", done: "#22c55e", blocked: "#ef4444" };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 capitalize">{status}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[status] || "#6366f1" }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{count as number}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Team Workload</h3>
          <div className="space-y-3">
            {stats.memberWorkload.map((m: any) => {
              const pct = m.capacity > 0 ? Math.round((m.tasks / Math.max(m.capacity / 8, 1)) * 100) : 0;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.initials}</div>
                  <span className="text-xs flex-1 truncate">{m.name}</span>
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e" }} />
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{m.tasks} tasks</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" /> Priority Distribution</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.priorityBreakdown).map(([p, count]) => {
              const colors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
              return (
                <div key={p} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[p] }} />
                  <div>
                    <div className="text-lg font-bold">{count as number}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{p}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Hours Logged</span>
              <span className="font-bold">{Math.round(stats.finance.totalHours)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue Generated</span>
              <span className="font-bold text-emerald-400">${Math.round(stats.finance.totalRevenue).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Budget Remaining</span>
              <span className="font-bold">${Math.round(stats.finance.totalBudget - stats.finance.budgetUsed).toLocaleString()}</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${Math.min(100, stats.finance.totalBudget > 0 ? Math.round((stats.finance.budgetUsed / stats.finance.totalBudget) * 100) : 0)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIFeatureCard({ f, i, expandedFeature, setExpandedFeature, results, loading, onRun, enabled, onToggle }: {
  f: typeof AI_FEATURES[0]; i: number; expandedFeature: string | null; setExpandedFeature: (k: string | null) => void;
  results: Record<string, any>; loading: string | null; onRun: (key: string) => void;
  enabled: Record<string, boolean>; onToggle: (key: string) => void;
}) {
  const Icon = f.icon;
  const isExpanded = expandedFeature === f.key;
  const result = results[f.key];
  const isLoading = loading === f.key;
  const isEnabled = enabled[f.key] !== false;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
      className={`bg-card border rounded-xl overflow-hidden transition-all ${isEnabled ? 'border-border' : 'border-border/50 opacity-60'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${f.color}15` }}>
            <Icon className="w-5 h-5" style={{ color: f.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{f.title}</h3>
              <button onClick={() => onToggle(f.key)} className={`w-8 h-4.5 rounded-full flex items-center transition-colors shrink-0 ${isEnabled ? 'bg-primary justify-end' : 'bg-white/10 justify-start'}`}>
                <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => { onRun(f.key); setExpandedFeature(f.key); }}
            disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isLoading ? "Analyzing..." : "Run Analysis"}
          </button>
          {result && (
            <button onClick={() => setExpandedFeature(isExpanded ? null : f.key)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Eye className="w-3 h-3" /> {isExpanded ? "Hide" : "View"} Results
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && result && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border/50 pt-3">
              <AIResultView data={result} featureKey={f.key} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AIFeaturesTab({ features, features2, features3, results, loading, onRun, enabled, onToggle }: {
  features: typeof AI_FEATURES; features2: typeof AI_FEATURES_2; features3: typeof AI_FEATURES_3; results: Record<string, any>; loading: string | null;
  onRun: (key: string) => void; enabled: Record<string, boolean>; onToggle: (key: string) => void;
}) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [aiSection, setAiSection] = useState<"core" | "advanced" | "predictive">("core");
  const total = features.length + features2.length + features3.length;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-emerald-500/10 border border-purple-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold">AI Command Center</h2>
          <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded-full font-bold uppercase">{total} AI Features</span>
        </div>
        <p className="text-sm text-muted-foreground">{total} intelligent features that no competitor has. Run any analysis instantly, toggle features on/off for your workspace.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setAiSection("core")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${aiSection === "core" ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
          <Brain className="w-4 h-4" /> Core AI ({features.length})
        </button>
        <button onClick={() => setAiSection("advanced")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${aiSection === "advanced" ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
          <Sparkles className="w-4 h-4" /> Advanced AI ({features2.length})
        </button>
        <button onClick={() => setAiSection("predictive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${aiSection === "predictive" ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
          <BrainCircuit className="w-4 h-4" /> Predictive AI ({features3.length})
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(aiSection === "core" ? features : aiSection === "advanced" ? features2 : features3).map((f, i) => (
          <AIFeatureCard key={f.key} f={f} i={i} expandedFeature={expandedFeature} setExpandedFeature={setExpandedFeature}
            results={results} loading={loading} onRun={onRun} enabled={enabled} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function AIResultView({ data, featureKey }: { data: any; featureKey: string }) {
  if (featureKey === "risk_prediction" && data.risks) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-2">{data.summary}</p>
        {data.risks.length === 0 && <p className="text-xs text-emerald-400">No risks detected — looking good!</p>}
        {data.risks.slice(0, 5).map((r: any, i: number) => (
          <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${r.severity === "critical" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
            <AlertTriangle className="w-3 h-3 shrink-0" /> <span className="line-clamp-1">{r.message}</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "sprint_planning" && data.suggestions) {
    return (
      <div className="space-y-2">
        {data.suggestions.map((s: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
            <span>{s.member}</span>
            <span className="text-muted-foreground">{s.currentPoints}pts / {s.suggestedCapacity}pt cap</span>
            <span className={s.available > 0 ? "text-emerald-400" : "text-rose-400"}>{s.available}pt avail</span>
          </div>
        ))}
        {data.unassigned.length > 0 && (
          <div className="text-xs text-amber-400 mt-2">{data.unassigned.length} unassigned tasks need owners</div>
        )}
      </div>
    );
  }

  if (featureKey === "budget_forecast" && data.projects) {
    return (
      <div className="space-y-2">
        {data.projects.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{p.project}</span>
              <span className={p.atRisk ? "text-rose-400" : "text-emerald-400"}>
                {p.atRisk ? "⚠️ At Risk" : "✅ Healthy"} — {p.daysRemaining}d left
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.budget > 0 ? (p.spent / p.budget) * 100 : 0)}%`, backgroundColor: p.atRisk ? "#ef4444" : "#22c55e" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "sentiment_analysis" && data.teamHealth) {
    return (
      <div className="space-y-2">
        {data.teamHealth.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-xs bg-white/5 p-2 rounded-lg">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.member.split(" ").map((w: string) => w[0]).join("")}</div>
            <span className="flex-1">{m.member}</span>
            <span>{m.mood}</span>
            <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: m.score > 75 ? "#22c55e" : m.score > 50 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "workload_balancer" && data.current) {
    return (
      <div className="space-y-2">
        {data.current.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-xs bg-white/5 p-2 rounded-lg">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.member.split(" ").map((w: string) => w[0]).join("")}</div>
            <span className="flex-1">{m.member}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.status === "overloaded" ? "bg-rose-500/20 text-rose-400" : m.status === "balanced" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{m.status}</span>
            <span className="text-muted-foreground">{m.totalPoints}pts</span>
          </div>
        ))}
        {data.recommendations.map((r: string, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs text-primary bg-primary/10 p-2 rounded-lg">
            <Lightbulb className="w-3 h-3" /> {r}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "bottleneck_detection" && data.bottlenecks) {
    return (
      <div className="space-y-2">
        {data.bottlenecks.length === 0 && <p className="text-xs text-emerald-400">No bottlenecks detected!</p>}
        {data.bottlenecks.map((b: any, i: number) => (
          <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${b.severity === "critical" ? "bg-rose-500/10 text-rose-400" : b.severity === "high" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
            <Activity className="w-3 h-3 shrink-0" /> {b.message}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "quality_score" && data.projects) {
    return (
      <div className="space-y-2">
        {data.projects.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{p.project}</span>
              <span className="font-bold" style={{ color: p.score > 60 ? "#22c55e" : p.score > 30 ? "#f59e0b" : "#ef4444" }}>{p.score}/100</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{p.completionRate}% done</span>
              <span>{p.documentedRate}% documented</span>
              <span>{p.subtaskRate}% has subtasks</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "progress_report" && data.report) {
    const r = data.report;
    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 p-2 rounded-lg"><span className="text-muted-foreground">Completed</span> <span className="float-right font-bold">{r.completed}/{r.totalTasks}</span></div>
          <div className="bg-white/5 p-2 rounded-lg"><span className="text-muted-foreground">In Progress</span> <span className="float-right font-bold">{r.inProgress}</span></div>
          <div className="bg-white/5 p-2 rounded-lg"><span className="text-muted-foreground">Blocked</span> <span className="float-right font-bold text-rose-400">{r.blocked}</span></div>
          <div className="bg-white/5 p-2 rounded-lg"><span className="text-muted-foreground">Points Done</span> <span className="float-right font-bold">{r.completedPoints}/{r.totalPoints}</span></div>
        </div>
      </div>
    );
  }

  if (featureKey === "duplicate_detection" && data.potentialDuplicates) {
    return (
      <div className="space-y-2">
        {data.potentialDuplicates.length === 0 && <p className="text-xs text-emerald-400">No duplicates found!</p>}
        {data.potentialDuplicates.map((d: any, i: number) => (
          <div key={i} className="bg-amber-500/10 text-amber-400 p-2 rounded-lg text-xs">
            <div className="font-medium">"{d.task1.title}" ≈ "{d.task2.title}"</div>
            <div className="text-[10px] mt-0.5">{d.similarity}% similar — common: {d.commonWords.join(", ")}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "retrospective" && data.insights) {
    const ins = data.insights;
    return (
      <div className="space-y-2 text-xs">
        <div className="bg-white/5 p-2 rounded-lg">Completed: <strong>{ins.completedThisWeek}</strong> tasks | Avg points: <strong>{ins.avgPointsPerTask}</strong></div>
        {ins.topPerformers.length > 0 && (
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            Top: {ins.topPerformers.map((p: any) => `${p.name} (${p.completed})`).join(", ")}
          </div>
        )}
        {ins.improvements.map((imp: string, i: number) => (
          <div key={i} className="bg-amber-500/10 p-2 rounded-lg text-amber-400 flex items-center gap-2">
            <Lightbulb className="w-3 h-3 shrink-0" /> {imp}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "knowledge_graph" && data.connections) {
    return (
      <div className="space-y-2">
        {data.connections.map((c: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="font-medium mb-1">{c.project}</div>
            <div className="flex flex-wrap gap-2 text-muted-foreground">
              <span>{c.tasks} tasks</span> <span>{c.sprints} sprints</span>
              <span>{c.goals} goals</span> <span>{c.teamMembers} members</span>
              <span>{c.hoursSpent}h logged</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "client_report" && data.reports) {
    return (
      <div className="space-y-2">
        {data.reports.map((r: any, i: number) => (
          <div key={i} className="bg-white/5 p-3 rounded-lg text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{r.project}</span>
              <span className="text-muted-foreground">{r.client}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-primary rounded-full" style={{ width: `${r.progress}%` }} />
            </div>
            <div className="text-muted-foreground">{r.highlights.join(" · ")}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "burnout_detector" && data.risks) {
    return (
      <div className="space-y-2">
        {data.risks.map((r: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: r.color }}>{r.member.split(" ").map((w: string) => w[0]).join("")}</div>
                <span className="font-medium">{r.member}</span>
              </div>
              <span>{r.level}</span>
            </div>
            {r.factors.length > 0 && <div className="text-muted-foreground">{r.factors.join(" · ")}</div>}
            <div className="text-[10px] text-primary mt-0.5">{r.suggestion}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "effort_impact_matrix" && data.quadrants) {
    const q = data.quadrants;
    return (
      <div className="space-y-2 text-xs">
        {[
          { label: "Quick Wins", items: q.quick_wins, color: "#22c55e", emoji: "🎯" },
          { label: "Major Projects", items: q.major_projects, color: "#3b82f6", emoji: "🏗️" },
          { label: "Fill-Ins", items: q.fill_ins, color: "#f59e0b", emoji: "📋" },
          { label: "Reconsider", items: q.thankless, color: "#ef4444", emoji: "⚠️" },
        ].filter(s => s.items.length > 0).map((s, i) => (
          <div key={i}>
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{s.emoji} {s.label} ({s.items.length})</div>
            {s.items.slice(0, 3).map((t: any, j: number) => (
              <div key={j} className="bg-white/5 p-1.5 rounded mb-1 text-xs">{t.title}</div>
            ))}
          </div>
        ))}
        {q.recommendation && <div className="bg-primary/10 text-primary p-2 rounded-lg text-xs flex items-center gap-2"><Lightbulb className="w-3 h-3" /> {q.recommendation}</div>}
      </div>
    );
  }

  if (featureKey === "release_notes" && data.releases) {
    const r = data.releases;
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-sm">{r.version}</span>
          <span className="text-muted-foreground">{r.date}</span>
        </div>
        {r.sections.map((s: any, i: number) => (
          <div key={i}>
            <div className="font-medium mb-1">{s.emoji} {s.title}</div>
            {s.items.slice(0, 4).map((item: string, j: number) => (
              <div key={j} className="text-muted-foreground pl-3">• {item}</div>
            ))}
          </div>
        ))}
        <div className="bg-white/5 p-2 rounded-lg text-muted-foreground italic">{r.summary}</div>
      </div>
    );
  }

  if (featureKey === "task_aging" && data.stale) {
    return (
      <div className="space-y-2">
        {data.stale.length === 0 && <p className="text-xs text-emerald-400">No stale tasks!</p>}
        {data.stale.map((t: any, i: number) => (
          <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${t.severity === "critical" ? "bg-rose-500/10 text-rose-400" : t.severity === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
            <span className="line-clamp-1 flex-1">{t.title}</span>
            <span className="shrink-0 ml-2 font-bold">{t.ageDays}d old</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "deadline_risk" && data.atRisk) {
    return (
      <div className="space-y-2">
        {data.atRisk.map((t: any, i: number) => (
          <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${t.status === "will_miss" ? "bg-rose-500/10 text-rose-400" : t.status === "at_risk" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            <span className="line-clamp-1 flex-1">{t.title}</span>
            <span className="shrink-0 ml-2">{t.daysUntil < 0 ? `${Math.abs(t.daysUntil)}d overdue` : `${t.daysUntil}d left`}</span>
            <span className="shrink-0 ml-2 font-bold">{t.riskPercent}%</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "tech_debt_scorer" && data.projects) {
    return (
      <div className="space-y-2">
        {data.projects.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{p.project}</span>
              <span>{p.level} (score: {p.debtScore})</span>
            </div>
            <div className="flex gap-2 text-muted-foreground text-[10px]">
              <span>{p.bugs} bugs</span>
              <span>{p.techDebtTasks} debt items</span>
              <span>{p.staleItems} stale</span>
            </div>
            <div className="text-primary text-[10px] mt-0.5">{p.recommendation}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "milestone_tracker" && data.milestones) {
    return (
      <div className="space-y-2">
        {data.milestones.map((m: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{m.sprint}</span>
              <span className={m.prediction === "On track" ? "text-emerald-400" : "text-amber-400"}>{m.prediction}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${m.progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{m.progress}% complete</span>
              <span>{m.daysLeft}d remaining</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "velocity_optimizer" && data.analysis) {
    return (
      <div className="space-y-2 text-xs">
        <div className="bg-white/5 p-2 rounded-lg">Team Avg: <strong>{data.analysis.teamAvg} pts/hr</strong></div>
        {data.analysis.memberEfficiency.map((m: any, i: number) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.member.split(" ").map((w: string) => w[0]).join("")}</div>
            <span className="flex-1">{m.member}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.efficiency === "high" ? "bg-emerald-500/20 text-emerald-400" : m.efficiency === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>{m.pointsPerHour} pts/hr</span>
          </div>
        ))}
        <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center gap-2"><Lightbulb className="w-3 h-3" /> {data.analysis.recommendation}</div>
      </div>
    );
  }

  if (featureKey === "meeting_agenda" && data.agendas) {
    return (
      <div className="space-y-3 text-xs">
        {Object.values(data.agendas).map((agenda: any, i: number) => (
          <div key={i} className="bg-white/5 p-3 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="font-bold">{agenda.title}</span>
              <span className="text-muted-foreground">{agenda.duration}</span>
            </div>
            {agenda.items.map((item: any, j: number) => (
              <div key={j} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                <div>
                  <span className="font-medium">{item.topic}</span>
                  <p className="text-[10px] text-muted-foreground">{item.details}</p>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">{item.time}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "automation_suggestions" && data.suggestions) {
    return (
      <div className="space-y-2">
        {data.suggestions.map((s: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${s.impact === "high" ? "bg-rose-500/10" : s.impact === "medium" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <Workflow className="w-3 h-3" />
              <span className="font-medium">When: {s.trigger}</span>
              <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${s.impact === "high" ? "bg-rose-500/20 text-rose-400" : s.impact === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{s.impact}</span>
            </div>
            <div className="text-muted-foreground pl-5">Then: {s.action}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "project_health_deep" && data.projects) {
    return (
      <div className="space-y-2">
        {data.projects.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-3 rounded-lg text-xs">
            <div className="flex justify-between mb-2">
              <span className="font-medium">{p.project}</span>
              <span className={`text-lg font-bold ${p.grade === "A" ? "text-emerald-400" : p.grade === "B" ? "text-blue-400" : p.grade === "C" ? "text-amber-400" : "text-rose-400"}`}>{p.grade}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-white/5 p-1.5 rounded text-center"><div className="text-muted-foreground">Budget</div><div className="font-bold">{p.budgetHealth}%</div></div>
              <div className="bg-white/5 p-1.5 rounded text-center"><div className="text-muted-foreground">Tasks</div><div className="font-bold">{p.taskHealth}%</div></div>
              <div className="bg-white/5 p-1.5 rounded text-center"><div className="text-muted-foreground">Risk</div><div className="font-bold">{p.riskScore}</div></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "auto_tagger" && data.suggestions) {
    return (
      <div className="space-y-2">
        {data.suggestions.length === 0 && <p className="text-xs text-emerald-400">All tasks are tagged!</p>}
        {data.suggestions.map((t: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="font-medium line-clamp-1">{t.title}</div>
            <div className="flex gap-1 mt-1">{t.suggestedTags.map((tag: string, j: number) => (
              <span key={j} className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px]">{tag}</span>
            ))}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "skill_matcher" && data.matches) {
    return (
      <div className="space-y-2">
        {data.matches.length === 0 && <p className="text-xs text-emerald-400">All tasks are assigned!</p>}
        {data.matches.map((m: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="font-medium line-clamp-1 mb-1">{m.title}</div>
            {m.topMatch && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: m.topMatch.color }}>{m.topMatch.member.split(" ").map((w: string) => w[0]).join("")}</div>
                <span className="text-emerald-400">{m.topMatch.member}</span>
                <span className="text-muted-foreground text-[10px]">{m.topMatch.reason}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "sprint_velocity_predictor" && data.predictions) {
    const p = data.predictions;
    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 p-2 rounded-lg text-center"><div className="text-muted-foreground text-[10px]">Average</div><div className="font-bold text-lg">{p.averageVelocity}</div></div>
          <div className="bg-white/5 p-2 rounded-lg text-center"><div className="text-muted-foreground text-[10px]">Next Sprint</div><div className="font-bold text-lg text-primary">{p.nextSprintPrediction}</div></div>
          <div className="bg-white/5 p-2 rounded-lg text-center"><div className="text-muted-foreground text-[10px]">Trend</div><div className={`font-bold text-lg ${p.trend === "increasing" ? "text-emerald-400" : p.trend === "decreasing" ? "text-rose-400" : "text-amber-400"}`}>{p.trend === "increasing" ? "↑" : p.trend === "decreasing" ? "↓" : "→"}</div></div>
        </div>
        <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center gap-2"><Lightbulb className="w-3 h-3" /> {p.recommendation}</div>
      </div>
    );
  }

  if (featureKey === "task_decomposer" && data.epics) {
    return (
      <div className="space-y-2">
        {data.epics.length === 0 && <p className="text-xs text-muted-foreground">No epics or large tasks found to decompose.</p>}
        {data.epics.map((e: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="font-medium mb-1">{e.title} ({e.points}pts)</div>
            {e.suggestedSubtasks.map((s: string, j: number) => (
              <div key={j} className="text-muted-foreground pl-3">• {s} (~{e.estimatedSubtaskPoints}pts)</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "cross_project_deps" && data.dependencies) {
    return (
      <div className="space-y-2">
        {data.dependencies.length === 0 && <p className="text-xs text-emerald-400">No cross-project dependencies!</p>}
        {data.dependencies.map((d: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${d.risk === "high" ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400"}`}>
            <div className="font-medium">{d.project1} ↔ {d.project2}</div>
            <div className="text-[10px] mt-0.5">Shared: {d.sharedMembers.join(", ")} · {d.recommendation}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "customer_impact" && data.analysis) {
    return (
      <div className="space-y-2">
        {data.analysis.map((t: any, i: number) => (
          <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${t.severity === "high" ? "bg-rose-500/10" : t.severity === "medium" ? "bg-amber-500/10" : "bg-white/5"}`}>
            <span className="line-clamp-1 flex-1">{t.title}</span>
            <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${t.customerImpact === "critical_path" ? "bg-rose-500/20 text-rose-400" : t.customerImpact === "user_facing" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-muted-foreground"}`}>{t.customerImpact.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "communication_gaps" && data.gaps) {
    return (
      <div className="space-y-2 text-xs">
        {data.gaps.isolatedMembers.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Isolated Members</div>
            {data.gaps.isolatedMembers.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-amber-500/10 text-amber-400 p-2 rounded-lg mb-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.name.split(" ").map((w: string) => w[0]).join("")}</div>
                {m.name} — {m.suggestion}
              </div>
            ))}
          </div>
        )}
        {data.gaps.projectOverlap.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg">
            <span className="font-medium">{p.p1} ↔ {p.p2}</span>
            <span className="text-muted-foreground ml-2">{p.shared} shared members</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "resource_conflicts" && data.conflicts) {
    return (
      <div className="space-y-2">
        {data.conflicts.length === 0 && <p className="text-xs text-emerald-400">No resource conflicts detected!</p>}
        {data.conflicts.map((m: any, i: number) => (
          <div key={i} className="bg-amber-500/10 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.member.split(" ").map((w: string) => w[0]).join("")}</div>
              <span className="font-medium text-amber-400">{m.member}</span>
              <span className="text-muted-foreground">{m.conflicts.length} conflict(s)</span>
            </div>
            {m.conflicts.map((c: any, j: number) => (
              <div key={j} className="text-[10px] text-muted-foreground pl-7">{c.task1} ↔ {c.task2}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "csv_preview" && data.exportPreview) {
    return (
      <div className="space-y-2 text-xs">
        <div className="bg-white/5 p-2 rounded-lg"><span className="font-medium">Tasks</span><span className="text-muted-foreground ml-2">{data.exportPreview.tasks.totalRows} rows · {data.exportPreview.tasks.columns.length} columns</span></div>
        <div className="overflow-x-auto">
          <div className="flex gap-1 text-[10px] text-muted-foreground">
            {data.exportPreview.tasks.columns.map((c: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-white/5 rounded">{c}</span>
            ))}
          </div>
        </div>
        <div className="bg-white/5 p-2 rounded-lg"><span className="font-medium">Time Entries</span><span className="text-muted-foreground ml-2">{data.exportPreview.timeEntries.totalRows} rows</span></div>
        <div className="bg-white/5 p-2 rounded-lg"><span className="font-medium">Members</span><span className="text-muted-foreground ml-2">{data.exportPreview.members.totalRows} rows</span></div>
      </div>
    );
  }

  if (featureKey === "context_switcher" && data.predictions) {
    return (
      <div className="space-y-2">
        {data.predictions.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: p.color }}>{p.member.split(" ").map((w: string) => w[0]).join("")}</div>
              <span className="font-medium">{p.member}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.confidence === "high" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{p.confidence}</span>
            </div>
            <div className="text-muted-foreground">Now: {p.currentFocus}</div>
            <div className="text-primary">Next: {p.predictedNext}</div>
            <div className="text-[10px] text-muted-foreground">{p.reason}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "email_drafter" && data.drafts) {
    return (
      <div className="space-y-3">
        {data.drafts.map((d: any, i: number) => (
          <div key={i} className="bg-white/5 p-3 rounded-lg text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-bold">{d.project}</span>
              <span className="text-muted-foreground">{d.client}</span>
            </div>
            <div className="text-primary text-[11px] mb-2 font-medium">{d.subject}</div>
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto bg-white/5 p-2 rounded">{d.body}</pre>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "retro_facilitator" && data.exercises) {
    return (
      <div className="space-y-2 text-xs">
        <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
          <div className="text-primary font-bold mb-1">Recommended: {data.exercises.recommended.name}</div>
          <div className="text-muted-foreground">{data.exercises.recommended.prompt}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{data.exercises.recommended.duration} · {data.exercises.recommended.focus}</div>
        </div>
        {data.exercises.all.filter((e: any) => e.name !== data.exercises.recommended.name).map((e: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg">
            <div className="font-medium">{e.name} <span className="text-muted-foreground font-normal">({e.duration})</span></div>
            <div className="text-muted-foreground text-[10px]">{e.prompt}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "onboarding_planner" && data.plans) {
    return (
      <div className="space-y-3">
        {data.plans.map((p: any, i: number) => (
          <div key={i} className="bg-white/5 p-3 rounded-lg text-xs">
            <div className="font-bold mb-2">{p.project}</div>
            {[{ label: "Week 1", items: p.week1 }, { label: "Week 2", items: p.week2 }, { label: "Week 3", items: p.week3 }].map((w, j) => (
              <div key={j} className="mb-1">
                <div className="text-[10px] font-bold text-primary uppercase">{w.label}</div>
                {w.items.map((item: string, k: number) => <div key={k} className="text-muted-foreground pl-2">• {item}</div>)}
              </div>
            ))}
            {p.keyContacts.length > 0 && (
              <div className="flex gap-1 mt-1">{p.keyContacts.map((c: any, j: number) => (
                <div key={j} className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded">
                  <div className="w-4 h-4 rounded-full text-[7px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: c.color }}>{c.name.split(" ").map((w: string) => w[0]).join("")}</div>
                  <span className="text-[10px]">{c.name}</span>
                </div>
              ))}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "pair_programming" && data.pairings) {
    return (
      <div className="space-y-2">
        {data.pairings.length === 0 && <p className="text-xs text-muted-foreground">No optimal pairings found</p>}
        {data.pairings.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: p.member1.color }}>{p.member1.name.split(" ").map((w: string) => w[0]).join("")}</div>
              <span>{p.member1.name}</span>
            </div>
            <span className="text-muted-foreground">+</span>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: p.member2.color }}>{p.member2.name.split(" ").map((w: string) => w[0]).join("")}</div>
              <span>{p.member2.name}</span>
            </div>
            <span className="ml-auto text-[10px] text-emerald-400">{p.reason}</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "knowledge_decay" && data.outdated) {
    return (
      <div className="space-y-2">
        {data.outdated.length === 0 && <p className="text-xs text-emerald-400">No knowledge decay detected!</p>}
        {data.outdated.map((item: any, i: number) => (
          <div key={i} className="bg-amber-500/10 p-2 rounded-lg text-xs">
            <div className="flex justify-between">
              <span className="font-medium text-amber-400">{item.title}</span>
              <span className="text-muted-foreground">{item.age}d old</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{item.risk}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "decision_logger" && data.decisions) {
    return (
      <div className="space-y-2">
        {data.decisions.map((d: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="font-medium line-clamp-1">{d.title}</div>
            {d.decisions.map((dec: string, j: number) => (
              <div key={j} className="text-muted-foreground text-[10px] pl-2">• {dec}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "competitive_velocity" && data.benchmarks) {
    const b = data.benchmarks;
    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          {b.comparison.map((c: any, i: number) => (
            <div key={i} className="bg-white/5 p-2 rounded-lg text-center">
              <div className="text-[10px] text-muted-foreground">{c.metric}</div>
              <div className={`font-bold ${c.status === "above" || c.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`}>{c.yours}</div>
              <div className="text-[10px] text-muted-foreground">vs {c.industry}</div>
            </div>
          ))}
        </div>
        <div className={`p-2 rounded-lg text-xs ${b.overall.includes("above") ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{b.overall}</div>
      </div>
    );
  }

  if (featureKey === "cost_per_feature" && data.features) {
    return (
      <div className="space-y-2">
        {data.features.slice(0, 8).map((f: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-xs">
            <span className="line-clamp-1 flex-1">{f.title}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${f.costEfficiency === "low_cost" ? "bg-emerald-500/20 text-emerald-400" : f.costEfficiency === "moderate" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>${f.estimatedCost}</span>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "sprint_themes" && data.themes) {
    return (
      <div className="space-y-2">
        {data.themes.map((t: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{t.sprint}</span>
              <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold">{t.theme}</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{t.taskCount} tasks</span>
              {t.topTags.map((tag: any, j: number) => <span key={j} className="px-1 bg-white/5 rounded">{tag.tag} ({tag.count})</span>)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "blocker_predictor" && data.predictions) {
    return (
      <div className="space-y-2">
        {data.predictions.length === 0 && <p className="text-xs text-emerald-400">No blocker risks detected!</p>}
        {data.predictions.map((p: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${p.prediction === "likely" ? "bg-rose-500/10" : p.prediction === "possible" ? "bg-amber-500/10" : "bg-white/5"}`}>
            <div className="flex justify-between mb-0.5">
              <span className="font-medium line-clamp-1">{p.title}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.prediction === "likely" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{p.blockerRisk}% risk</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{p.reasons.join(" · ")}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "meeting_roi" && data.analysis) {
    return (
      <div className="space-y-2 text-xs">
        {data.analysis.meetings.map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
            <span>{m.name}</span>
            <div className="flex gap-3 text-muted-foreground">
              <span>{m.duration}h</span>
              <span>{m.attendees} people</span>
              <span className="font-bold text-foreground">${m.costPerOccurrence}/mtg</span>
            </div>
          </div>
        ))}
        <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400">Monthly cost: <strong>${data.analysis.monthlyTotal.toLocaleString()}</strong></div>
        <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center gap-2"><Lightbulb className="w-3 h-3" /> {data.analysis.recommendation}</div>
      </div>
    );
  }

  if (featureKey === "priority_decay" && data.decayed) {
    return (
      <div className="space-y-2">
        {data.decayed.length === 0 && <p className="text-xs text-emerald-400">No priority decay detected!</p>}
        {data.decayed.map((t: any, i: number) => (
          <div key={i} className="bg-amber-500/10 p-2 rounded-lg text-xs">
            <div className="flex justify-between">
              <span className="font-medium text-amber-400 line-clamp-1">{t.title}</span>
              <span className="text-muted-foreground">{t.ageDays}d · {t.priority}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{t.suggestion}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "team_growth" && data.growth) {
    return (
      <div className="space-y-2">
        {data.growth.map((m: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>{m.member.split(" ").map((w: string) => w[0]).join("")}</div>
              <span className="font-medium">{m.member}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.trend === "rapid_growth" ? "bg-emerald-500/20 text-emerald-400" : m.trend === "steady" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}>{m.level}</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{m.metrics.totalCompleted} completed</span>
              <span>{m.metrics.complexTasks} complex</span>
              <span>{m.metrics.projectBreadth} projects</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${m.metrics.growthScore}%` }} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "focus_time" && data.recommendations) {
    return (
      <div className="space-y-2">
        {data.recommendations.map((r: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: r.color }}>{r.member.split(" ").map((w: string) => w[0]).join("")}</div>
              <span className="font-medium">{r.member}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">AM: {r.suggestedSchedule.morningFocus}</div>
            <div className="text-[10px] text-muted-foreground">PM: {r.suggestedSchedule.afternoonTasks || "Batch small tasks"}</div>
            <div className="text-[10px] text-primary mt-0.5">{r.recommendation}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "dependency_chain_risk" && data.chains) {
    return (
      <div className="space-y-2">
        {data.chains.map((c: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${c.risk === "high" ? "bg-rose-500/10" : c.risk === "medium" ? "bg-amber-500/10" : "bg-white/5"}`}>
            <div className="flex justify-between mb-1">
              <span className="font-medium">{c.project}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.risk === "high" ? "bg-rose-500/20 text-rose-400" : c.risk === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{c.risk} risk</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{c.blocked} blocked</span>
              <span>{c.inProgress} in-progress</span>
              <span>{c.reviewQueue} in review</span>
            </div>
            <div className="text-[10px] text-primary mt-0.5">{c.suggestion}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "workflow_patterns" && data.patterns) {
    return (
      <div className="space-y-2">
        {data.patterns.patterns.map((p: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${p.severity === "high" ? "bg-rose-500/10 text-rose-400" : p.severity === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium">{p.pattern}</span>
              <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${p.severity === "high" ? "bg-rose-500/20" : p.severity === "medium" ? "bg-amber-500/20" : "bg-blue-500/20"}`}>{p.severity}</span>
            </div>
            <div className="text-[10px]">{p.insight}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "project_similarity" && data.similarities) {
    return (
      <div className="space-y-2">
        {data.similarities.map((s: any, i: number) => (
          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{s.project1}</span>
              <span className="text-muted-foreground">↔</span>
              <span className="font-medium">{s.project2}</span>
              <span className="ml-auto font-bold text-primary">{s.similarity}%</span>
            </div>
            {s.sharedTags.length > 0 && <div className="flex gap-1">{s.sharedTags.map((t: string, j: number) => <span key={j} className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px]">{t}</span>)}</div>}
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.useCase}</div>
          </div>
        ))}
      </div>
    );
  }

  if (featureKey === "sprint_themes_2" && data.predictions) {
    const p = data.predictions;
    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-[10px] text-muted-foreground">Project Completion</div>
            <div className={`font-bold text-lg ${p.projectCompletion.trend === "on_track" ? "text-emerald-400" : "text-amber-400"}`}>{p.projectCompletion.predicted}</div>
            <div className="text-[10px] text-muted-foreground">Current: {p.projectCompletion.current}</div>
          </div>
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-[10px] text-muted-foreground">Sprint Success</div>
            <div className="font-bold text-lg text-primary">{p.sprintSuccess.probability}</div>
            <div className="text-[10px] text-muted-foreground">{p.sprintSuccess.factors[0]}</div>
          </div>
        </div>
        <div className={`p-2 rounded-lg ${p.burnoutRisk.riskLevel === "high" ? "bg-rose-500/10 text-rose-400" : p.burnoutRisk.riskLevel === "moderate" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          Burnout Risk: <strong>{p.burnoutRisk.riskLevel}</strong> {p.burnoutRisk.membersAtRisk.length > 0 && `— ${p.burnoutRisk.membersAtRisk.join(", ")}`}
        </div>
        <div className="bg-white/5 p-2 rounded-lg">Deadline Risk: <strong>{p.deadlineForecast.tasksLikelyToMiss}</strong> tasks likely to miss · {p.deadlineForecast.recommendation}</div>
        <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center gap-2"><Lightbulb className="w-3 h-3" /> {p.nextSprintRecommendation}</div>
      </div>
    );
  }

  if (featureKey === "handoff_analyzer" && data.handoffs) {
    return (
      <div className="space-y-2">
        {data.handoffs.length === 0 && <p className="text-xs text-emerald-400">No risky handoffs detected!</p>}
        {data.handoffs.map((h: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${h.riskLevel === "medium" ? "bg-amber-500/10" : "bg-white/5"}`}>
            <div className="font-medium line-clamp-1 mb-1">{h.task}</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full text-[7px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: h.from.color }}>{h.from.name.split(" ").map((w: string) => w[0]).join("")}</div>
                <span>{h.from.name}</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full text-[7px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: h.to.color }}>{h.to.name.split(" ").map((w: string) => w[0]).join("")}</div>
                <span>{h.to.name}</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{h.reason}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-xs text-muted-foreground bg-white/5 p-2 rounded-lg overflow-auto max-h-40">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function FeatureFlagsTab({ features, enabled, onToggle }: {
  features: typeof PLATFORM_FEATURES; enabled: Record<string, boolean>; onToggle: (key: string) => void;
}) {
  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold">Feature Flags</h2>
          <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 rounded-full font-bold uppercase">{features.length} Features</span>
        </div>
        <p className="text-sm text-muted-foreground">Toggle platform features on/off. Enable what you need, disable what you don't. Changes take effect immediately.</p>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
          <div className="space-y-2">
            {features.filter(f => f.category === cat).map(f => {
              const Icon = f.icon;
              const isEnabled = enabled[f.key] !== false;
              return (
                <div key={f.key} className={`flex items-center gap-4 bg-card border border-border rounded-xl p-4 transition-opacity ${isEnabled ? "" : "opacity-50"}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{f.title}</h4>
                      <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded font-bold uppercase">{f.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                  <button onClick={() => onToggle(f.key)} className={`w-11 h-6 rounded-full flex items-center transition-colors shrink-0 ${isEnabled ? 'bg-primary justify-end' : 'bg-white/10 justify-start'}`}>
                    <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesTab({ templates, setTemplates, show, setShow }: {
  templates: any[]; setTemplates: React.Dispatch<React.SetStateAction<any[]>>; show: boolean; setShow: (s: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", description: "", icon: "📋", category: "general", defaultPriority: "medium", defaultPoints: 3, notesTemplate: "" });

  const addTemplate = async () => {
    const r = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/task-templates`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const t = await r.json();
    setTemplates([t, ...templates]);
    setShow(false);
    setForm({ name: "", description: "", icon: "📋", category: "general", defaultPriority: "medium", defaultPoints: 3, notesTemplate: "" });
  };

  const deleteTemplate = async (id: number) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/task-templates/${id}`, { method: "DELETE" });
    setTemplates(templates.filter(t => t.id !== id));
  };

  const presets = [
    { name: "Bug Report", icon: "🐛", category: "engineering", defaultPriority: "high", defaultPoints: 3, notesTemplate: "## Steps to Reproduce\n1. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n" },
    { name: "Feature Request", icon: "✨", category: "product", defaultPriority: "medium", defaultPoints: 5, notesTemplate: "## User Story\nAs a __, I want __ so that __\n\n## Acceptance Criteria\n- [ ] \n\n## Design Link\n" },
    { name: "PRD", icon: "📄", category: "product", defaultPriority: "high", defaultPoints: 8, notesTemplate: "## Overview\n\n## Problem Statement\n\n## Goals\n\n## Non-Goals\n\n## Solution\n\n## Metrics\n" },
    { name: "Tech Debt", icon: "🔧", category: "engineering", defaultPriority: "low", defaultPoints: 3, notesTemplate: "## Current State\n\n## Desired State\n\n## Impact\n\n## Approach\n" },
    { name: "Design Review", icon: "🎨", category: "design", defaultPriority: "medium", defaultPoints: 2, notesTemplate: "## Design Link\n\n## Key Decisions\n\n## Feedback Needed On\n" },
    { name: "Sprint Ceremony", icon: "🏃", category: "agile", defaultPriority: "medium", defaultPoints: 1, notesTemplate: "## Agenda\n- [ ] \n\n## Action Items\n\n## Notes\n" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Task Templates</h2>
          <p className="text-sm text-muted-foreground">Create reusable templates for common task types</p>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {templates.length === 0 && !show && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-3">Quick Start — Add Preset Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {presets.map((p, i) => (
              <button key={i} onClick={async () => {
                const r = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/task-templates`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...p, description: `${p.name} template` }),
                });
                const t = await r.json();
                setTemplates(prev => [t, ...prev]);
              }}
                className="flex items-center gap-2 p-3 bg-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors text-left">
                <span className="text-lg">{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {show && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">New Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Template name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Icon emoji" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <option value="general">General</option><option value="engineering">Engineering</option>
              <option value="product">Product</option><option value="design">Design</option><option value="agile">Agile</option>
            </select>
            <select value={form.defaultPriority} onChange={e => setForm({ ...form, defaultPriority: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <textarea value={form.notesTemplate} onChange={e => setForm({ ...form, notesTemplate: e.target.value })} placeholder="Notes template (markdown)" rows={4} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShow(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={addTemplate} disabled={!form.name} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">Create</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            <span className="text-2xl">{t.icon}</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{t.name}</h4>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{t.category}</span>
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{t.defaultPriority}</span>
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{t.defaultPoints}pts</span>
              </div>
            </div>
            <button onClick={() => deleteTemplate(t.id)} className="p-2 text-muted-foreground hover:text-rose-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomFieldsTab({ fields, setFields, show, setShow }: {
  fields: any[]; setFields: React.Dispatch<React.SetStateAction<any[]>>; show: boolean; setShow: (s: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", type: "text", options: "" });

  const addField = async () => {
    const r = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/custom-fields`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, options: form.type === "select" ? form.options.split(",").map(o => o.trim()) : [] }),
    });
    const f = await r.json();
    setFields([f, ...fields]);
    setShow(false);
    setForm({ name: "", type: "text", options: "" });
  };

  const deleteField = async (id: number) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/custom-fields/${id}`, { method: "DELETE" });
    setFields(fields.filter(f => f.id !== id));
  };

  const typeIcons: Record<string, string> = { text: "Aa", number: "#", url: "🔗", checkbox: "☑", rating: "⭐", select: "▼", date: "📅", email: "📧" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">Add custom data fields to tasks — text, numbers, URLs, checkboxes, ratings, and more</p>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Field
        </button>
      </div>

      {show && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">New Custom Field</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Field name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <option value="text">Text</option><option value="number">Number</option><option value="url">URL</option>
              <option value="checkbox">Checkbox</option><option value="rating">Rating</option><option value="select">Select (dropdown)</option>
              <option value="date">Date</option><option value="email">Email</option>
            </select>
          </div>
          {form.type === "select" && (
            <input value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} placeholder="Options (comma-separated)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShow(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={addField} disabled={!form.name} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">Create</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {fields.length === 0 && !show && (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No custom fields yet. Add fields to enrich your task data.</p>
          </div>
        )}
        {fields.map(f => (
          <div key={f.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">{typeIcons[f.type] || "?"}</div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{f.name}</h4>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded uppercase">{f.type}</span>
                {f.projectId && <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">Project #{f.projectId}</span>}
                {f.options?.length > 0 && <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{f.options.length} options</span>}
              </div>
            </div>
            <button onClick={() => deleteField(f.id)} className="p-2 text-muted-foreground hover:text-rose-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpensesTab({ expenses, setExpenses, show, setShow }: {
  expenses: any[]; setExpenses: React.Dispatch<React.SetStateAction<any[]>>; show: boolean; setShow: (s: boolean) => void;
}) {
  const [form, setForm] = useState({ projectId: 1, memberId: 1, category: "general", description: "", amount: "" });

  const addExpense = async () => {
    const r = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const e = await r.json();
    setExpenses([e, ...expenses]);
    setShow(false);
    setForm({ projectId: 1, memberId: 1, category: "general", description: "", amount: "" });
  };

  const approveExpense = async (id: number) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/expenses/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: true }),
    });
    setExpenses(expenses.map(e => e.id === id ? { ...e, approved: true } : e));
  };

  const deleteExpense = async (id: number) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/expenses/${id}`, { method: "DELETE" });
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const approved = expenses.filter(e => e.approved).reduce((s, e) => s + Number(e.amount), 0);
  const categories: Record<string, string> = { general: "📦", travel: "✈️", software: "💻", hardware: "🖥️", meals: "🍕", office: "🏢", marketing: "📢" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Expense Tracking</h2>
          <p className="text-sm text-muted-foreground">Log and manage non-time expenses across projects</p>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Expenses</div>
          <div className="text-2xl font-bold">${Math.round(total).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Approved</div>
          <div className="text-2xl font-bold text-emerald-400">${Math.round(approved).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-400">${Math.round(total - approved).toLocaleString()}</div>
        </div>
      </div>

      {show && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">Log New Expense</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="bg-background border border-border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount ($)" type="number" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {Object.keys(categories).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShow(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
            <button onClick={addExpense} disabled={!form.description || !form.amount} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">Log Expense</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {expenses.length === 0 && !show && (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No expenses logged yet.</p>
          </div>
        )}
        {expenses.map(e => (
          <div key={e.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            <span className="text-xl">{categories[e.category] || "📦"}</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{e.description}</h4>
              <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                <span>{e.category}</span>
                <span>{new Date(e.date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">${Number(e.amount).toLocaleString()}</div>
              {e.approved ? (
                <span className="text-[10px] text-emerald-400 font-bold">APPROVED</span>
              ) : (
                <button onClick={() => approveExpense(e.id)} className="text-[10px] text-amber-400 hover:text-emerald-400 font-bold">APPROVE</button>
              )}
            </div>
            <button onClick={() => deleteExpense(e.id)} className="p-2 text-muted-foreground hover:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiEmailTab() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"api" | "email">("api");

  const SCOPES = ["read", "write", "tasks", "projects", "members", "sprints", "time", "admin"];

  useEffect(() => {
    fetch(`${API}/api-keys`).then(r => r.json()).then(setApiKeys);
    fetch(`${API}/email-config`).then(r => r.json()).then(setEmailConfig);
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    const res = await fetch(`${API}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes, expiresAt: newKeyExpiry || null }),
    });
    const key = await res.json();
    setRevealedKey(key.key);
    setApiKeys(prev => [...prev, { ...key, key: key.prefix + "_" + "•".repeat(16) }]);
    setShowNewKey(false);
    setNewKeyName("");
    setNewKeyScopes(["read"]);
    setNewKeyExpiry("");
  };

  const toggleKey = async (id: number, active: boolean) => {
    await fetch(`${API}/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, active: !active } : k));
  };

  const deleteKey = async (id: number) => {
    await fetch(`${API}/api-keys/${id}`, { method: "DELETE" });
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const regenerateKey = async (id: number) => {
    const res = await fetch(`${API}/api-keys/${id}/regenerate`, { method: "POST" });
    const key = await res.json();
    setRevealedKey(key.key);
    setApiKeys(prev => prev.map(k => k.id === id ? { ...key, key: key.prefix + "_" + "•".repeat(16) } : k));
  };

  const saveEmailConfig = async () => {
    setEmailSaving(true);
    try {
      const res = await fetch(`${API}/email-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailConfig),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        setEmailTestResult(`Error saving: ${err.error || res.statusText}`);
      } else {
        const updated = await res.json();
        setEmailConfig(updated);
        setEmailTestResult("Configuration saved successfully!");
      }
    } catch (err: any) {
      setEmailTestResult(`Error: ${err.message || "Failed to save configuration"}`);
    }
    setEmailSaving(false);
    setTimeout(() => setEmailTestResult(null), 5000);
  };

  const testEmail = async () => {
    if (!emailConfig.active) {
      setEmailTestResult("Email system is not active. Toggle it on first, then save your configuration.");
      setTimeout(() => setEmailTestResult(null), 5000);
      return;
    }
    try {
      const res = await fetch(`${API}/email-config/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailConfig.fromEmail || "test@example.com" }),
      });
      const result = await res.json();
      setEmailTestResult(result.success ? result.message : (result.error || "Test failed"));
    } catch (err: any) {
      setEmailTestResult(`Error: ${err.message || "Failed to send test email"}`);
    }
    setTimeout(() => setEmailTestResult(null), 8000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold">API & Email Integration</h2>
        </div>
        <p className="text-sm text-muted-foreground">Create API keys for external integrations and configure your email system for notifications, digests, and automated emails.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveSection("api")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === "api" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <Lock className="w-4 h-4" /> API Keys ({apiKeys.length})
        </button>
        <button onClick={() => setActiveSection("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === "email" ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <Mail className="w-4 h-4" /> Email System
        </button>
      </div>

      {activeSection === "api" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">API Keys</h3>
              <p className="text-xs text-muted-foreground">Generate keys to connect your email system, CI/CD, or any third-party service</p>
            </div>
            <button onClick={() => setShowNewKey(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Create API Key
            </button>
          </div>

          {revealedKey && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">API Key Created — Copy it now!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-xs font-mono text-emerald-300 select-all">{revealedKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(revealedKey); }}
                  className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-emerald-400/70 mt-2">This key will only be shown once. Store it securely — you won't be able to see it again.</p>
              <button onClick={() => setRevealedKey(null)} className="text-xs text-muted-foreground mt-2 hover:text-foreground">Dismiss</button>
            </motion.div>
          )}

          {showNewKey && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">New API Key</h4>
                <button onClick={() => setShowNewKey(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Email Service, CI/CD Pipeline..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Scopes</label>
                <div className="flex flex-wrap gap-1.5">
                  {SCOPES.map(scope => (
                    <button key={scope} onClick={() => setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${newKeyScopes.includes(scope) ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border hover:text-foreground"}`}>
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expires (optional)</label>
                <input type="date" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <button onClick={createKey} disabled={!newKeyName.trim()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Generate Key
              </button>
            </motion.div>
          )}

          <div className="space-y-2">
            {apiKeys.length === 0 && !showNewKey && (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No API keys yet</p>
                <p className="text-xs">Create one to connect your email service or other integrations</p>
              </div>
            )}
            {apiKeys.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${k.active ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span className="font-semibold text-sm">{k.name}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${k.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {k.active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleKey(k.id, k.active)} title={k.active ? "Revoke" : "Activate"}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${k.active ? "hover:bg-red-500/10 text-red-400" : "hover:bg-emerald-500/10 text-emerald-400"}`}>
                      {k.active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => regenerateKey(k.id)} title="Regenerate"
                      className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteKey(k.id)} title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white/5 px-2 py-1 rounded font-mono text-muted-foreground flex-1">{k.key}</code>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>Scopes: {(k.scopes || []).join(", ")}</span>
                  {k.expiresAt && <span>Expires: {new Date(k.expiresAt).toLocaleDateString()}</span>}
                  <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                  {k.lastUsedAt && <span>Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 mt-4">
            <h4 className="text-sm font-bold mb-2">API Documentation</h4>
            <p className="text-xs text-muted-foreground mb-3">Use your API key in the <code className="bg-white/10 px-1 rounded">Authorization</code> header:</p>
            <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono text-blue-300 overflow-x-auto">{`curl -X GET \\
  ${window.location.origin}/api/tasks \\
  -H "Authorization: Bearer pos_xxxx_xxxxxxxx" \\
  -H "Content-Type: application/json"`}</pre>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { method: "GET", path: "/api/tasks", desc: "List all tasks" },
                { method: "POST", path: "/api/tasks", desc: "Create a task" },
                { method: "GET", path: "/api/projects", desc: "List projects" },
                { method: "POST", path: "/api/email-config/test", desc: "Send test email" },
                { method: "GET", path: "/api/members", desc: "List team members" },
                { method: "GET", path: "/api/sprints", desc: "List sprints" },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white/5 px-2 py-1.5 rounded">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${e.method === "GET" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>{e.method}</span>
                  <code className="text-muted-foreground font-mono">{e.path}</code>
                  <span className="ml-auto text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === "email" && emailConfig && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Email System Configuration</h3>
              <p className="text-xs text-muted-foreground">Connect your SMTP server, SendGrid, Mailgun, or any email provider</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEmailConfig((prev: any) => ({ ...prev, active: !prev.active }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${emailConfig.active ? "bg-emerald-500" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${emailConfig.active ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-xs font-medium ${emailConfig.active ? "text-emerald-400" : "text-muted-foreground"}`}>
                {emailConfig.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email Provider</label>
              <div className="flex gap-2">
                {["smtp", "sendgrid", "mailgun", "ses", "postmark"].map(p => (
                  <button key={p} onClick={() => setEmailConfig((prev: any) => ({ ...prev, provider: p }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${emailConfig.provider === p ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border hover:text-foreground"}`}>
                    {p === "ses" ? "AWS SES" : p === "smtp" ? "SMTP" : p}
                  </button>
                ))}
              </div>
            </div>

            {emailConfig.provider === "smtp" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">SMTP Host</label>
                  <input value={emailConfig.host} onChange={e => setEmailConfig((prev: any) => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.gmail.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Port</label>
                  <input value={emailConfig.port} onChange={e => setEmailConfig((prev: any) => ({ ...prev, port: e.target.value }))}
                    placeholder="587" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Username</label>
                  <input value={emailConfig.username} onChange={e => setEmailConfig((prev: any) => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@gmail.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Password</label>
                  <input type="password" value={emailConfig.password} onChange={e => setEmailConfig((prev: any) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Encryption</label>
                  <div className="flex gap-2">
                    {["tls", "ssl", "none"].map(enc => (
                      <button key={enc} onClick={() => setEmailConfig((prev: any) => ({ ...prev, encryption: enc }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all uppercase ${emailConfig.encryption === enc ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border"}`}>
                        {enc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                  <input type="password" value={emailConfig.apiKey} onChange={e => setEmailConfig((prev: any) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={`Your ${emailConfig.provider} API key`} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                {emailConfig.provider !== "ses" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Webhook URL (for inbound email)</label>
                    <input value={emailConfig.webhookUrl} onChange={e => setEmailConfig((prev: any) => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://your-domain.com/api/webhooks/email" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From Name</label>
                <input value={emailConfig.fromName} onChange={e => setEmailConfig((prev: any) => ({ ...prev, fromName: e.target.value }))}
                  placeholder="ProjectOS" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From Email</label>
                <input value={emailConfig.fromEmail} onChange={e => setEmailConfig((prev: any) => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="notifications@projectos.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveEmailConfig} disabled={emailSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {emailSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Configuration
              </button>
              <button onClick={testEmail}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                <Mail className="w-4 h-4" /> Send Test Email
              </button>
            </div>
            {emailTestResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`p-3 rounded-lg text-sm font-medium ${emailTestResult.startsWith("Error") || emailTestResult.includes("not active") || emailTestResult.includes("not configured") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                {emailTestResult}
              </motion.div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="text-sm font-bold mb-3">Email Templates</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Task Assigned", desc: "Sent when a task is assigned to a member", icon: ClipboardCheck, active: true },
                { name: "Due Date Reminder", desc: "Sent 24h before a task is due", icon: Clock, active: true },
                { name: "Comment Notification", desc: "Sent when someone comments on your task", icon: MessageSquare, active: true },
                { name: "Sprint Started", desc: "Sent when a new sprint begins", icon: Zap, active: false },
                { name: "Weekly Digest", desc: "Weekly summary of project activity", icon: Mail, active: false },
                { name: "Daily Standup Reminder", desc: "Morning reminder to submit standup", icon: Users, active: false },
                { name: "Goal Progress Update", desc: "Sent when a goal hits a milestone", icon: Target, active: false },
                { name: "Budget Alert", desc: "Sent when budget exceeds threshold", icon: AlertTriangle, active: true },
              ].map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.active ? "bg-emerald-400" : "bg-white/20"}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">System Configuration</h2>
        <p className="text-sm text-muted-foreground">Core platform settings and configuration</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { title: "Authentication", desc: "SSO/SAML, 2FA, role-based permissions (Admin / Member / Guest / Viewer)", icon: Shield, status: "Configurable" },
          { title: "Unique Task IDs", desc: "Auto-generated prefix IDs per project (TAS-001, BUG-042)", icon: Puzzle, status: "Active" },
          { title: "Webhook Endpoints", desc: "Outgoing webhooks for task events, sprint changes, and more", icon: Globe, status: "Ready" },
          { title: "REST API", desc: "Full public API with authentication for third-party integrations", icon: Box, status: "Active" },
          { title: "CSV / Excel Import", desc: "Bulk import tasks, members, and projects from spreadsheets", icon: FileText, status: "Ready" },
          { title: "Workflow Automations", desc: "If-then rules — auto-assign, move status, send notifications", icon: Workflow, status: "Ready" },
          { title: "Guest Access", desc: "Invite clients with view-only access to specific projects", icon: Users, status: "Configurable" },
          { title: "Dark / Light Mode", desc: "Toggle between dark and light themes", icon: Eye, status: "Dark Mode Active" },
          { title: "Keyboard Navigation", desc: "Full keyboard-first navigation — every action via shortcut", icon: Zap, status: "Active (⌘K, ⌘I)" },
          { title: "Email Notifications", desc: "Task assigned, due soon, comment, daily/weekly digest", icon: MessageSquare, status: "Ready" },
          { title: "Slack Integration", desc: "Create tasks from Slack messages, get notifications in channels", icon: MessageSquare, status: "Ready" },
          { title: "GitHub Integration", desc: "Link PRs to tasks, auto-close on merge, sync status", icon: GitBranch, status: "Ready" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/15 text-emerald-400 rounded font-bold">{item.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RolesTab() {
  const [rolesData, setRolesData] = useState<{ roles: string[]; members: { id: number; name: string; permissionRole: string }[] } | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/members/roles`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Failed to load roles (${r.status})`); return r.json(); })
      .then(setRolesData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateRole = async (memberId: number, role: string) => {
    setSaving(memberId);
    setError(null);
    try {
      const res = await fetch(`${API}/members/${memberId}/role`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionRole: role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update role (${res.status})`);
      }
      setRolesData(prev => prev ? { ...prev, members: prev.members.map(m => m.id === memberId ? { ...m, permissionRole: role } : m) } : prev);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const roleColors: Record<string, string> = { admin: "text-rose-400 bg-rose-500/15 border-rose-500/30", member: "text-blue-400 bg-blue-500/15 border-blue-500/30", viewer: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
  const roleDescs: Record<string, string> = { admin: "Full access: manage members, settings, delete data", member: "Standard access: create/edit tasks, projects, time entries", viewer: "Read-only: view tasks and projects, no edit access" };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading roles...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2 text-red-400 text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {["admin", "member", "viewer"].map(role => (
          <div key={role} className={`border rounded-xl p-5 ${roleColors[role]}`}>
            <div className="flex items-center gap-2 mb-2">
              {role === "admin" && <Shield className="w-5 h-5" />}
              {role === "member" && <Users className="w-5 h-5" />}
              {role === "viewer" && <Eye className="w-5 h-5" />}
              <h3 className="font-bold capitalize text-lg">{role}</h3>
            </div>
            <p className="text-xs opacity-80">{roleDescs[role]}</p>
            <div className="mt-3 text-2xl font-bold">{rolesData?.members.filter(m => m.permissionRole === role).length || 0}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">members</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-secondary/20">
          <h3 className="font-semibold">Team Members</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Assign permission roles to control access levels</p>
        </div>
        <div className="divide-y divide-border">
          {rolesData?.members.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {m.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-[10px] text-muted-foreground">Member #{m.id}</div>
              </div>
              <select value={m.permissionRole} onChange={e => updateRole(m.id, e.target.value)}
                disabled={saving === m.id}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none capitalize">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              {saving === m.id && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${roleColors[m.permissionRole]}`}>{m.permissionRole}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-3">Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Action</th>
                <th className="text-center py-2 px-3 text-rose-400 font-bold">Admin</th>
                <th className="text-center py-2 px-3 text-blue-400 font-bold">Member</th>
                <th className="text-center py-2 px-3 text-emerald-400 font-bold">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {[
                { action: "View tasks & projects", admin: true, member: true, viewer: true },
                { action: "Create/edit tasks", admin: true, member: true, viewer: false },
                { action: "Delete tasks", admin: true, member: true, viewer: false },
                { action: "Create projects", admin: true, member: true, viewer: false },
                { action: "Manage sprints", admin: true, member: true, viewer: false },
                { action: "Log time entries", admin: true, member: true, viewer: false },
                { action: "Upload attachments", admin: true, member: true, viewer: false },
                { action: "Manage automations", admin: true, member: false, viewer: false },
                { action: "Manage members/roles", admin: true, member: false, viewer: false },
                { action: "System configuration", admin: true, member: false, viewer: false },
                { action: "Delete projects", admin: true, member: false, viewer: false },
                { action: "Export data", admin: true, member: true, viewer: false },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 text-sm">{row.action}</td>
                  <td className="text-center">{row.admin ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-400/30 mx-auto" />}</td>
                  <td className="text-center">{row.member ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-400/30 mx-auto" />}</td>
                  <td className="text-center">{row.viewer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-400/30 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
