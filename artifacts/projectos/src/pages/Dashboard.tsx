import { useState, useEffect } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useSprints } from "@/hooks/use-sprints";
import { useDocuments } from "@/hooks/use-documents";
import { useGoals } from "@/hooks/use-goals";
import { useAiChatMutation } from "@/hooks/use-ai";
import { Card, ProgressBar, Badge, Button, RingChart } from "@/components/ui/shared";
import { CheckSquare, Clock, Target, AlertTriangle, Sparkles, ArrowRight, RefreshCw, FileText, Settings, Eye, EyeOff, GripVertical, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence, Reorder } from "framer-motion";

type WidgetKey = "stats" | "attention" | "budgets" | "docs" | "sprints" | "goals";
const WIDGET_LABELS: Record<WidgetKey, string> = {
  stats: "Quick Stats",
  attention: "Needs Attention",
  budgets: "Budgets",
  docs: "Recent Docs",
  sprints: "Active Sprints",
  goals: "Goals",
};
const DEFAULT_ORDER: WidgetKey[] = ["stats", "attention", "budgets", "docs", "sprints", "goals"];
const STORAGE_KEY = "dashboard-widget-config";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: sprints = [] } = useSprints();
  const { data: docs = [] } = useDocuments();
  const { data: goals = [] } = useGoals();
  const aiChat = useAiChatMutation();
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [widgetConfig, setWidgetConfig] = useState<{ order: WidgetKey[]; hidden: WidgetKey[] }>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { order: DEFAULT_ORDER, hidden: [] }; }
    catch { return { order: DEFAULT_ORDER, hidden: [] }; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetConfig));
  }, [widgetConfig]);

  const toggleWidget = (key: WidgetKey) => {
    setWidgetConfig(prev => ({
      ...prev,
      hidden: prev.hidden.includes(key) ? prev.hidden.filter(k => k !== key) : [...prev.hidden, key],
    }));
  };

  const isVisible = (key: WidgetKey) => !widgetConfig.hidden.includes(key);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const overdue = tasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done");

  const refreshBriefing = () => {
    setBriefingLoading(true);
    aiChat.mutate(
      { data: { message: "Give me a daily briefing summary" } },
      {
        onSuccess: (result) => {
          setBriefing(result.reply);
          setBriefingLoading(false);
        },
        onError: () => {
          setBriefing(`You have ${overdue.length} overdue tasks and ${critical.length} critical items. ${tasks.filter(t => t.status === "inprogress").length} tasks are in progress across ${projects.length} projects. Focus on clearing blockers and overdue items first.`);
          setBriefingLoading(false);
        }
      }
    );
  };

  const activeSprints = sprints.filter(s => s.status === "active");

  const healthColor = (h: number) => h >= 80 ? "#10b981" : h >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border shadow-2xl p-8 lg:p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/dashboard-bg.png`} 
            alt="Dashboard background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 border border-primary/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> AI Briefing Ready
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white mb-4 tracking-tight">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Team.</span>
          </h1>
          
          {briefing ? (
            <div className="text-base text-muted-foreground mb-8 leading-relaxed whitespace-pre-wrap bg-primary/5 border border-primary/10 rounded-xl p-4">
              {briefing}
            </div>
          ) : (
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              You have {overdue.length} overdue tasks and {critical.length} critical items needing attention today.
            </p>
          )}
          
          <div className="flex gap-4 flex-wrap">
            <Link href="/tasks">
              <Button size="lg" className="w-full sm:w-auto">View My Tasks</Button>
            </Link>
            <Link href="/time">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">Start Timer</Button>
            </Link>
            <Button size="lg" variant="outline" onClick={refreshBriefing} disabled={briefingLoading} className="gap-2">
              {briefingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Refresh Briefing
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-transparent hover:border-border">
          <Settings className="w-3.5 h-3.5" /> Customize Widgets
        </button>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-card border border-border rounded-2xl p-5 mb-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Dashboard Widgets</h3>
                <button onClick={() => setShowConfig(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {DEFAULT_ORDER.map(key => (
                  <button key={key} onClick={() => toggleWidget(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${isVisible(key) ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-primary/20"}`}>
                    {isVisible(key) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {WIDGET_LABELS[key]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">Click to show/hide widgets. Your preferences are saved automatically.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isVisible("stats") && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "In Progress Tasks", value: stats?.inProgressTasks || 0, icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Overdue Items", value: stats?.overdueTasks || overdue.length, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "Hours Today", value: `${stats?.todayHours || 0}h`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Goals On Track", value: `${stats?.goalsOnTrack || 0}/${stats?.totalGoals || 0}`, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="p-6 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-display font-bold mb-1">{statsLoading ? "-" : stat.value}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </Card>
        ))}
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {isVisible("attention") && <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              Needs Attention
            </h2>
            <Link href="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <Card className="divide-y divide-border">
            {tasksLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
            ) : [...overdue, ...critical].slice(0, 5).map(task => (
              <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Badge color={task.priority === 'critical' ? 'red' : 'yellow'}>{task.priority}</Badge>
                    <span>Due: {task.due ? new Date(task.due).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <Link href="/tasks">
                  <Button variant="outline" size="sm">Open</Button>
                </Link>
              </div>
            ))}
            {!tasksLoading && [...overdue, ...critical].length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>All clear! Nothing urgent.</p>
              </div>
            )}
          </Card>
        </div>}

        {isVisible("budgets") && <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Budgets</h2>
          <Card className="p-5 space-y-6">
            {(stats?.projectBudgets || []).map((pb: any) => {
              const colorClass = pb.percentUsed > 90 ? "bg-rose-500" : pb.percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={pb.projectId}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="text-lg">{pb.projectIcon}</span> {pb.projectName}
                    </div>
                    <span className="text-xs font-mono font-bold">{pb.percentUsed}%</span>
                  </div>
                  <ProgressBar progress={pb.percentUsed} colorClass={colorClass} heightClass="h-2" />
                </div>
              );
            })}
            {(!stats?.projectBudgets || stats.projectBudgets.length === 0) && projects.map(p => (
              <div key={p.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span className="text-lg">{p.icon}</span> {p.name}
                  </div>
                  <span className="text-xs font-mono font-bold">-</span>
                </div>
                <ProgressBar progress={0} colorClass="bg-emerald-500" heightClass="h-2" />
              </div>
            ))}
          </Card>
        </div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isVisible("docs") && <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Recent Docs
            </h2>
            <Link href="/documents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {docs.slice(0, 4).map(doc => (
              <Link key={doc.id} href="/documents" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <span className="text-lg">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {format(new Date(doc.updatedAt), "MMM d")}
                  </div>
                </div>
              </Link>
            ))}
            {docs.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No documents yet</div>
            )}
          </div>
        </Card>}

        {isVisible("sprints") && <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold flex items-center gap-2">Active Sprints</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {activeSprints.length > 0 ? activeSprints.map(sprint => {
              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
              const done = sprintTasks.filter(t => t.status === "done").length;
              const total = sprintTasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={sprint.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{sprint.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{done}/{total}</span>
                  </div>
                  <ProgressBar progress={pct} colorClass="bg-primary" heightClass="h-1.5" />
                </div>
              );
            }) : sprints.slice(0, 3).map(sprint => {
              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
              const done = sprintTasks.filter(t => t.status === "done").length;
              const total = sprintTasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={sprint.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{sprint.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{done}/{total}</span>
                  </div>
                  <ProgressBar progress={pct} colorClass="bg-primary" heightClass="h-1.5" />
                </div>
              );
            })}
            {sprints.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No sprints yet</div>
            )}
          </div>
        </Card>}

        {isVisible("goals") && <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" /> Goals
            </h2>
            <Link href="/goals" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 4).map(goal => {
              const color = goal.status === "on_track" ? "#10b981" : goal.status === "at_risk" ? "#f59e0b" : "#f43f5e";
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <RingChart progress={goal.progress} size={36} strokeWidth={4} color={color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{goal.title}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {goal.status.replace("_", " ")}
                    </div>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No goals yet</div>
            )}
          </div>
        </Card>}
      </div>
    </div>
  );
}
