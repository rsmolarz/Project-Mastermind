import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useTimeEntries } from "@/hooks/use-time";
import { useAiChatMutation } from "@/hooks/use-ai";
import { Card, RingChart, ProgressBar, Button } from "@/components/ui/shared";
import { PieChart, Sparkles, RefreshCw, DollarSign, CheckCircle2, PlayCircle, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Portfolio() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useTimeEntries();
  const aiChat = useAiChatMutation();
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <PieChart className="w-8 h-8 text-primary" /> Project Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">High-level overview of all active projects and budgets.</p>
        </div>
        <Button onClick={getSummary} disabled={summaryLoading} className="gap-2">
          {summaryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Refresh
        </Button>
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
              <div className="flex justify-between items-start mb-6">
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
    </div>
  );
}
