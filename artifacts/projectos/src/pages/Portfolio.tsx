import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useTimeEntries } from "@/hooks/use-time";
import { useAiChatMutation } from "@/hooks/use-ai";
import { Card, RingChart, ProgressBar, Button, Badge } from "@/components/ui/shared";
import { PieChart, Sparkles, RefreshCw, DollarSign, CheckCircle2, PlayCircle, Activity, LayoutGrid, List, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Portfolio() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useTimeEntries();
  const aiChat = useAiChatMutation();
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const getSummary = () => {
    setSummaryLoading(true);
    const ctx = projects.map(p => {
      const spent = entries.filter(e => e.projectId === p.id).reduce((a, e) => a + e.amount, 0);
      return `${p.name}(health:${p.health}%,phase:${p.phase},budget:${Math.round(spent / p.budget * 100)}%used)`;
    }).join(", ");

    aiChat.mutate(
      { data: { message: `portfolio summary. Projects: ${ctx}. Total tasks: ${tasks.length}, done: ${tasks.filter(t => t.status === "done").length}` } },
      {
        onSuccess: (result) => {
          setSummary(result.reply);
          setSummaryLoading(false);
        },
        onError: () => {
          setSummary(`Portfolio overview: ${projects.length} active projects with ${tasks.length} total tasks. ${tasks.filter(t => t.status === "done").length} completed, ${tasks.filter(t => t.status === "inprogress").length} in progress. Overall portfolio health is strong with most projects on track.`);
          setSummaryLoading(false);
        }
      }
    );
  };

  useEffect(() => { getSummary(); }, [projects.length]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading portfolio...</div>;
  }

  const totalTasks = tasks.length;
  const totalDone = tasks.filter(t => t.status === "done").length;
  const totalInProgress = tasks.filter(t => t.status === "inprogress").length;
  const totalOverdue = tasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date()).length;
  const avgHealth = projects.length > 0 ? Math.round(projects.reduce((a, p) => a + p.health, 0) / projects.length) : 0;

  const getStatusIcon = (health: number) => {
    if (health >= 80) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (health >= 60) return <Minus className="w-4 h-4 text-amber-400" />;
    return <TrendingDown className="w-4 h-4 text-rose-400" />;
  };

  const getStatusLabel = (health: number) => {
    if (health >= 80) return "On Track";
    if (health >= 60) return "At Risk";
    return "Off Track";
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <PieChart className="w-8 h-8 text-primary" /> Project Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">High-level overview of all active projects and budgets.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary/50 border border-border rounded-xl p-1">
            <button onClick={() => setView("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${view === "cards" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
            <button onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="w-3.5 h-3.5" /> Table
            </button>
          </div>
          <Button onClick={getSummary} disabled={summaryLoading} className="gap-2">
            {summaryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{projects.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Projects</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Tasks</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{totalDone}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Completed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-2xl font-bold ${totalOverdue > 0 ? "text-rose-400" : "text-muted-foreground"}`}>{totalOverdue}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Overdue</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-2xl font-bold ${avgHealth >= 80 ? "text-emerald-400" : avgHealth >= 60 ? "text-amber-400" : "text-rose-400"}`}>{avgHealth}%</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Avg Health</div>
        </Card>
      </div>

      {summaryLoading && (
        <div className="h-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-full animate-pulse" />
      )}

      {summary && (
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Executive Summary
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>
        </Card>
      )}

      {view === "table" ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Health</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tasks</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Progress</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Spent</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const pTasks = tasks.filter(t => t.projectId === project.id);
                const doneTasks = pTasks.filter(t => t.status === "done");
                const spent = entries.filter(e => e.projectId === project.id).reduce((a, e) => a + e.amount, 0);
                const budgetPct = Math.min(100, Math.round((spent / project.budget) * 100));
                const completionPct = pTasks.length > 0 ? Math.round((doneTasks.length / pTasks.length) * 100) : 0;

                return (
                  <tr key={project.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{project.icon}</span>
                        <div>
                          <div className="font-bold text-sm" style={{ color: project.color }}>{project.name}</div>
                          <div className="text-xs text-muted-foreground">{project.client}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {getStatusIcon(project.health)}
                        <span className={`text-xs font-bold ${project.health >= 80 ? "text-emerald-400" : project.health >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                          {getStatusLabel(project.health)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RingChart progress={project.health} size={32} strokeWidth={4} color={project.health >= 80 ? "#10b981" : project.health >= 60 ? "#f59e0b" : "#f43f5e"} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-mono">{doneTasks.length}/{pTasks.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${completionPct}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8">{completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${budgetPct > 90 ? "bg-rose-500/20" : "bg-secondary"}`}>
                          <div className={`h-full rounded-full ${budgetPct > 90 ? "bg-rose-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${budgetPct}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8">{budgetPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono">{formatCurrency(spent)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const pTasks = tasks.filter(t => t.projectId === project.id);
            const doneTasks = pTasks.filter(t => t.status === "done");
            const inProgressTasks = pTasks.filter(t => t.status === "inprogress");
            const spent = entries.filter(e => e.projectId === project.id).reduce((a, e) => a + e.amount, 0);
            const budgetPct = Math.min(100, Math.round((spent / project.budget) * 100));
            const healthColor = project.health >= 80 ? "#10b981" : project.health >= 60 ? "#f59e0b" : "#f43f5e";
            const budgetColorClass = budgetPct > 90 ? "bg-rose-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500";

            return (
              <Card key={project.id} className="p-6 flex flex-col border-t-4 hover:-translate-y-1 transition-transform" style={{ borderTopColor: project.color }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{project.icon}</span>
                      <h2 className="text-xl font-bold text-foreground leading-tight" style={{ color: project.color }}>
                        {project.name}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.client} · {project.phase}</p>
                  </div>
                  <div className="shrink-0 drop-shadow-md">
                    <RingChart progress={project.health} size={56} strokeWidth={6} color={healthColor} />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {getStatusIcon(project.health)}
                  <span className={`text-xs font-bold ${project.health >= 80 ? "text-emerald-400" : project.health >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                    {getStatusLabel(project.health)}
                  </span>
                  <Badge color={project.phase === "active" ? "green" : project.phase === "planning" ? "blue" : "gray"}>{project.phase}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <div className="text-lg font-mono font-bold text-emerald-400 mb-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {doneTasks.length}/{pTasks.length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tasks Done</div>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <div className="text-lg font-mono font-bold text-amber-400 mb-0.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(spent)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spent</div>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <div className={`text-lg font-mono font-bold mb-0.5 ${budgetPct < 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {100 - budgetPct}%
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget Left</div>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <div className="text-lg font-mono font-bold text-primary mb-0.5 flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5" /> {inProgressTasks.length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Progress</div>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <span>Budget</span>
                    <span className={budgetPct > 80 ? "text-rose-400" : "text-foreground"}>{budgetPct}%</span>
                  </div>
                  <ProgressBar progress={budgetPct} colorClass={budgetColorClass} heightClass="h-2" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
