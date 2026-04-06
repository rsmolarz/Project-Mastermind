import { useQuery } from "@tanstack/react-query";
import { Users, AlertTriangle, CheckCircle2, Clock, TrendingUp, Zap, Calendar, BarChart3 } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; barColor: string }> = {
  available: { label: "Available", color: "text-emerald-400", bgColor: "bg-emerald-500/15", barColor: "bg-emerald-500" },
  balanced: { label: "Balanced", color: "text-blue-400", bgColor: "bg-blue-500/15", barColor: "bg-blue-500" },
  busy: { label: "Busy", color: "text-amber-400", bgColor: "bg-amber-500/15", barColor: "bg-amber-500" },
  overloaded: { label: "Overloaded", color: "text-rose-400", bgColor: "bg-rose-500/15", barColor: "bg-rose-500" },
};

export default function ResourcePlanning() {
  const { data, isLoading } = useQuery({ queryKey: ["resource-planning"], queryFn: () => apiFetch("/resource-planning") });

  if (isLoading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading resources...</div>;
  if (!data) return null;

  const { resources, teamSummary } = data;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
            Resource Planning
          </h1>
          <p className="text-muted-foreground mt-1">Team capacity, allocation, and availability at a glance</p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Team Size", value: teamSummary.totalMembers, icon: Users, color: "text-blue-400" },
            { label: "Available", value: teamSummary.available, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Busy", value: teamSummary.busy, icon: Clock, color: "text-amber-400" },
            { label: "Overloaded", value: teamSummary.overloaded, icon: AlertTriangle, color: "text-rose-400" },
            { label: "Avg Utilization", value: `${teamSummary.avgUtilization}%`, icon: BarChart3, color: "text-violet-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(statusConfig).map(([key, sc]) => {
            const count = key === "available" ? teamSummary.available : key === "balanced" ? teamSummary.balanced : key === "busy" ? teamSummary.busy : teamSummary.overloaded;
            return (
              <div key={key} className={`${sc.bgColor} rounded-xl p-3 border border-transparent`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${sc.color}`}>{sc.label}</span>
                  <span className={`text-xl font-bold ${sc.color}`}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_100px_140px_100px] gap-4 px-5 py-3 bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
            <span>Team Member</span>
            <span className="text-center">Open Tasks</span>
            <span className="text-center">Overdue</span>
            <span className="text-center">Est. Hours</span>
            <span className="text-center">Utilization</span>
            <span className="text-center">Status</span>
          </div>

          <div className="divide-y divide-border">
            {resources.sort((a: any, b: any) => {
              const order: Record<string, number> = { overloaded: 0, busy: 1, balanced: 2, available: 3 };
              return (order[a.status] ?? 4) - (order[b.status] ?? 4);
            }).map((r: any) => {
              const sc = statusConfig[r.status] || statusConfig.balanced;
              return (
                <div key={r.id} className="grid grid-cols-[1fr_100px_100px_100px_140px_100px] gap-4 px-5 py-4 items-center hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {r.avatar ? <img src={r.avatar} className="w-8 h-8 rounded-full" /> : (r.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{r.role}</div>
                    </div>
                  </div>
                  <div className="text-center text-sm font-mono font-medium">{r.openTasks}</div>
                  <div className={`text-center text-sm font-mono font-medium ${r.overdueTasks > 0 ? "text-rose-400" : "text-muted-foreground"}`}>{r.overdueTasks}</div>
                  <div className="text-center text-sm font-mono font-medium">{r.totalEstimateHours}h</div>
                  <div className="px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sc.barColor}`} style={{ width: `${Math.min(100, r.utilizationPercent)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{r.utilizationPercent}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${sc.bgColor} ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {resources.some((r: any) => r.overdueTasks > 0) && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-rose-400 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> Attention Required</h3>
            <div className="space-y-2">
              {resources.filter((r: any) => r.overdueTasks > 0 || r.status === "overloaded").map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">—</span>
                  {r.overdueTasks > 0 && <span className="text-rose-400">{r.overdueTasks} overdue</span>}
                  {r.status === "overloaded" && <span className="text-amber-400">{r.openTasks} open tasks</span>}
                  {r.nextDeadline && <span className="text-muted-foreground text-xs">Next deadline: {new Date(r.nextDeadline).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
