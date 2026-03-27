import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useTimeEntries } from "@/hooks/use-time";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Badge, ProgressBar } from "@/components/ui/shared";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, PieChart, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsPage() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useTimeEntries();
  const { data: members = [] } = useMembers();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const projectBudgets = useMemo(() => {
    return projects.map((p: any) => {
      const pTasks = tasks.filter((t: any) => t.projectId === p.id);
      const pEntries = entries.filter((e: any) => e.projectId === p.id);
      const spent = pEntries.reduce((a: number, e: any) => a + e.amount, 0);
      const totalHours = pEntries.reduce((a: number, e: any) => a + e.hours, 0);
      const budgetPct = p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0;
      const doneTaskPct = pTasks.length > 0 ? Math.round((pTasks.filter((t: any) => t.status === "done").length / pTasks.length) * 100) : 0;
      const burnRate = pEntries.length > 0 ? spent / Math.max(1, new Set(pEntries.map((e: any) => e.date?.slice(0, 7))).size) : 0;
      const remaining = Math.max(0, p.budget - spent);
      const monthsLeft = burnRate > 0 ? remaining / burnRate : Infinity;
      const efficiency = doneTaskPct > 0 && budgetPct > 0 ? Math.round((doneTaskPct / budgetPct) * 100) : 100;
      const hourlyRate = totalHours > 0 ? spent / totalHours : 0;
      return { ...p, spent, budgetPct, doneTaskPct, burnRate, remaining, monthsLeft, efficiency, totalHours, hourlyRate, taskCount: pTasks.length };
    });
  }, [projects, tasks, entries]);

  const totalBudget = projects.reduce((a: number, p: any) => a + p.budget, 0);
  const totalSpent = projectBudgets.reduce((a: number, p: any) => a + p.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetProjects = projectBudgets.filter((p: any) => p.budgetPct > 100);

  const selected = selectedProject ? projectBudgets.find((p: any) => p.id === selectedProject) : null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Budgets & Profitability</h1>
            <p className="text-sm text-muted-foreground">Track project budgets, burn rate, and ROI</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-primary">{formatCurrency(totalBudget)}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Total Budget</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-amber-400">{formatCurrency(totalSpent)}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Total Spent</div></Card>
        <Card className="p-4 text-center"><div className={`text-2xl font-bold ${totalRemaining > 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(totalRemaining)}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Remaining</div></Card>
        <Card className="p-4 text-center"><div className={`text-2xl font-bold ${overBudgetProjects.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>{overBudgetProjects.length}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Over Budget</div></Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Project</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Budget</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Spent</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Burn %</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Efficiency</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase text-muted-foreground">Burn Rate</th>
                </tr>
              </thead>
              <tbody>
                {projectBudgets.map((p: any) => (
                  <tr key={p.id} onClick={() => setSelectedProject(p.id)} className={`border-b border-border/50 cursor-pointer transition-colors ${selectedProject === p.id ? "bg-primary/5" : "hover:bg-white/5"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.icon}</span>
                        <div>
                          <div className="font-bold text-sm" style={{ color: p.color }}>{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.taskCount} tasks</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">{formatCurrency(p.budget)}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">{formatCurrency(p.spent)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.budgetPct > 100 ? "bg-rose-500" : p.budgetPct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, p.budgetPct)}%` }} />
                        </div>
                        <span className={`text-xs font-mono ${p.budgetPct > 100 ? "text-rose-400" : "text-muted-foreground"}`}>{p.budgetPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${p.efficiency >= 100 ? "text-emerald-400" : p.efficiency >= 70 ? "text-amber-400" : "text-rose-400"}`}>{p.efficiency}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">{formatCurrency(p.burnRate)}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          {selected ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selected.icon}</span>
                <div>
                  <h3 className="font-bold" style={{ color: selected.color }}>{selected.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{selected.phase}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget Used</span>
                    <span className={`font-bold ${selected.budgetPct > 100 ? "text-rose-400" : "text-foreground"}`}>{selected.budgetPct}%</span>
                  </div>
                  <ProgressBar progress={Math.min(100, selected.budgetPct)} colorClass={selected.budgetPct > 100 ? "bg-rose-500" : selected.budgetPct > 80 ? "bg-amber-500" : "bg-emerald-500"} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Tasks Done</span>
                    <span className="font-bold">{selected.doneTaskPct}%</span>
                  </div>
                  <ProgressBar progress={selected.doneTaskPct} colorClass="bg-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-xl p-3"><div className="text-lg font-mono font-bold text-foreground">{formatCurrency(selected.remaining)}</div><div className="text-[10px] text-muted-foreground uppercase">Remaining</div></div>
                  <div className="bg-secondary/30 rounded-xl p-3"><div className="text-lg font-mono font-bold text-foreground">{formatCurrency(selected.burnRate)}</div><div className="text-[10px] text-muted-foreground uppercase">Monthly Burn</div></div>
                  <div className="bg-secondary/30 rounded-xl p-3"><div className="text-lg font-mono font-bold text-foreground">{selected.monthsLeft === Infinity ? "∞" : `${selected.monthsLeft.toFixed(1)}mo`}</div><div className="text-[10px] text-muted-foreground uppercase">Runway</div></div>
                  <div className="bg-secondary/30 rounded-xl p-3"><div className="text-lg font-mono font-bold text-foreground">{formatCurrency(selected.hourlyRate)}</div><div className="text-[10px] text-muted-foreground uppercase">Avg $/hr</div></div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-border">
                  {selected.efficiency >= 100 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : selected.efficiency >= 70 ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                  <span className="text-xs">Efficiency: <span className="font-bold">{selected.efficiency}%</span> — {selected.efficiency >= 100 ? "Under budget for progress made" : selected.efficiency >= 70 ? "Slightly over-spending vs progress" : "Significantly over-spending"}</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a project to see budget details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
