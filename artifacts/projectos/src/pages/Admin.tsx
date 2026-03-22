import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Brain, Zap, BarChart3, AlertTriangle, Users, DollarSign, Target,
  FileText, Layers, Settings, TrendingUp, Clock, Lightbulb, GitBranch,
  Activity, PieChart, BookOpen, MessageSquare, Gauge, RefreshCw, Eye,
  ChevronRight, Copy, Plus, Trash2, Check, X, Star, Cpu, Sparkles,
  Search, Box, Globe, Workflow, CalendarDays, Table, LayoutGrid, Map,
  Inbox, Receipt, Puzzle, Tag, ListFilter, Network, ArrowLeftRight
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type AdminTab = "overview" | "ai-features" | "templates" | "custom-fields" | "expenses" | "features" | "system";

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

const PLATFORM_FEATURES = [
  { key: "table_view", title: "Table / Spreadsheet View", icon: Table, category: "Views", desc: "Airtable-style spreadsheet with inline editing, sorting, and grouping", status: "ready" },
  { key: "gallery_view", title: "Gallery View", icon: LayoutGrid, category: "Views", desc: "Visual card grid layout for image-heavy tasks or design assets", status: "ready" },
  { key: "roadmap_view", title: "Roadmap View", icon: Map, category: "Views", desc: "Initiative-level timeline view for planning quarters and milestones", status: "ready" },
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
            {tab === "ai-features" && <AIFeaturesTab features={AI_FEATURES} results={aiResults} loading={loadingAi} onRun={runAiFeature} enabled={enabledFeatures} onToggle={toggleFeature} />}
            {tab === "features" && <FeatureFlagsTab features={PLATFORM_FEATURES} enabled={enabledFeatures} onToggle={toggleFeature} />}
            {tab === "templates" && <TemplatesTab templates={templates} setTemplates={setTemplates} show={showNewTemplate} setShow={setShowNewTemplate} />}
            {tab === "custom-fields" && <CustomFieldsTab fields={customFields} setFields={setCustomFields} show={showNewField} setShow={setShowNewField} />}
            {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} show={showNewExpense} setShow={setShowNewExpense} />}
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

function AIFeaturesTab({ features, results, loading, onRun, enabled, onToggle }: {
  features: typeof AI_FEATURES; results: Record<string, any>; loading: string | null;
  onRun: (key: string) => void; enabled: Record<string, boolean>; onToggle: (key: string) => void;
}) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold">AI Command Center</h2>
          <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded-full font-bold uppercase">20 AI Features</span>
        </div>
        <p className="text-sm text-muted-foreground">Intelligent features that no competitor has. Run any analysis instantly, toggle features on/off for your workspace.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          const isExpanded = expandedFeature === f.key;
          const result = results[f.key];
          const isLoading = loading === f.key;
          const isEnabled = enabled[f.key] !== false;

          return (
            <motion.div key={f.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
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
        })}
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
