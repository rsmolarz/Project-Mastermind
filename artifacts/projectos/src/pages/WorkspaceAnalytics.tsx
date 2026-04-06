import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Clock, AlertTriangle, CheckCircle2, Target, BarChart3, Activity, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const priorityColors: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
  none: "bg-gray-500",
};

export default function WorkspaceAnalytics() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace-analytics"], queryFn: () => apiFetch("/workspace-analytics") });

  if (isLoading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading analytics...</div>;
  if (!data) return null;

  const { overview, memberWorkload, weeklyVelocity, bottlenecks } = data;
  const maxVelocity = Math.max(...weeklyVelocity.map((w: any) => Math.max(w.completed, w.created)), 1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
            Workspace Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Team productivity, velocity trends, and bottleneck detection</p>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {[
            { label: "Total Tasks", value: overview.totalTasks, icon: Target, color: "text-blue-400" },
            { label: "Completed (Week)", value: overview.completedThisWeek, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Created (Week)", value: overview.createdThisWeek, icon: Zap, color: "text-amber-400" },
            { label: "Completion Rate", value: `${overview.completionRate}%`, icon: TrendingUp, color: "text-violet-400" },
            { label: "Avg Completion", value: `${overview.avgCompletionDays}d`, icon: Clock, color: "text-cyan-400" },
            { label: "Tracked Hours", value: `${overview.totalTrackedHours}h`, icon: BarChart3, color: "text-pink-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> Weekly Velocity</h3>
            <div className="space-y-3">
              {weeklyVelocity.map((w: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono">{w.week}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> {w.completed}</span>
                      <span className="text-blue-400 flex items-center gap-0.5"><Zap className="w-3 h-3" /> {w.created}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-3">
                    <div className="h-full bg-emerald-500/60 rounded-l" style={{ width: `${(w.completed / maxVelocity) * 100}%` }} title={`${w.completed} completed`} />
                    <div className="h-full bg-blue-500/40 rounded-r" style={{ width: `${(w.created / maxVelocity) * 100}%` }} title={`${w.created} created`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/60 rounded" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500/40 rounded" /> Created</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-amber-400" /> Status & Priority</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Task Status</div>
                <div className="flex gap-1 h-5 rounded-full overflow-hidden">
                  {overview.statusBreakdown.done > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(overview.statusBreakdown.done / overview.totalTasks) * 100}%` }} title={`Done: ${overview.statusBreakdown.done}`} />}
                  {overview.statusBreakdown.in_progress > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(overview.statusBreakdown.in_progress / overview.totalTasks) * 100}%` }} title={`In Progress: ${overview.statusBreakdown.in_progress}`} />}
                  {overview.statusBreakdown.todo > 0 && <div className="bg-gray-500 h-full" style={{ width: `${(overview.statusBreakdown.todo / overview.totalTasks) * 100}%` }} title={`To Do: ${overview.statusBreakdown.todo}`} />}
                  {overview.statusBreakdown.overdue > 0 && <div className="bg-rose-500 h-full" style={{ width: `${(overview.statusBreakdown.overdue / overview.totalTasks) * 100}%` }} title={`Overdue: ${overview.statusBreakdown.overdue}`} />}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" /> Done ({overview.statusBreakdown.done})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded" /> In Progress ({overview.statusBreakdown.in_progress})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-500 rounded" /> To Do ({overview.statusBreakdown.todo})</span>
                  {overview.statusBreakdown.overdue > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded" /> Overdue ({overview.statusBreakdown.overdue})</span>}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">Priority Distribution</div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(overview.priorityBreakdown).map(([key, count]) => (
                    <div key={key} className="text-center">
                      <div className={`w-full h-2 rounded-full ${priorityColors[key]} mb-1`} style={{ opacity: 0.3 + ((count as number) / Math.max(...Object.values(overview.priorityBreakdown).map(Number), 1)) * 0.7 }} />
                      <div className="text-sm font-bold">{count as number}</div>
                      <div className="text-[9px] text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {bottlenecks.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-rose-400 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> Bottlenecks Detected</h3>
            <div className="space-y-2">
              {bottlenecks.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${b.severity === "high" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{b.severity}</span>
                  <span className="font-medium">{b.name}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground">{b.issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {memberWorkload.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Team Performance (Last 30 Days)</h3>
            </div>
            <div className="grid grid-cols-[1fr_90px_90px_90px_90px] gap-4 px-5 py-2 bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
              <span>Member</span>
              <span className="text-center">Open</span>
              <span className="text-center">Completed</span>
              <span className="text-center">Overdue</span>
              <span className="text-center">Tracked</span>
            </div>
            <div className="divide-y divide-border">
              {memberWorkload.sort((a: any, b: any) => b.completedThisMonth - a.completedThisMonth).map((m: any) => (
                <div key={m.id} className="grid grid-cols-[1fr_90px_90px_90px_90px] gap-4 px-5 py-3 items-center hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{m.role}</div>
                    </div>
                  </div>
                  <div className="text-center text-sm font-mono">{m.openTasks}</div>
                  <div className="text-center text-sm font-mono text-emerald-400">{m.completedThisMonth}</div>
                  <div className={`text-center text-sm font-mono ${m.overdueTasks > 0 ? "text-rose-400" : "text-muted-foreground"}`}>{m.overdueTasks}</div>
                  <div className="text-center text-sm font-mono">{m.trackedHours}h</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
