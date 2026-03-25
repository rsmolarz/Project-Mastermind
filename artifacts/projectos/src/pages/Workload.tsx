import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, AlertTriangle, Zap, BarChart3, Target } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const loadColors: Record<string, { text: string; bg: string; label: string }> = {
  overloaded: { text: "text-rose-400", bg: "bg-rose-400/10", label: "Overloaded" },
  heavy: { text: "text-amber-400", bg: "bg-amber-400/10", label: "Heavy" },
  optimal: { text: "text-emerald-400", bg: "bg-emerald-400/10", label: "Optimal" },
  light: { text: "text-blue-400", bg: "bg-blue-400/10", label: "Light" },
};

export default function Workload() {
  const { data } = useQuery({ queryKey: ["workload"], queryFn: () => apiFetch("/workload") });

  const workload = data?.workload || [];
  const summary = data?.summary || {};

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Workload Management
          </h1>
          <p className="text-muted-foreground mt-1">Visual capacity planning across your team</p>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Team Members", value: summary.totalMembers || 0, icon: Users, color: "text-violet-400", bg: "bg-violet-400/10" },
            { label: "Overloaded", value: summary.overloaded || 0, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
            { label: "Heavy Load", value: summary.heavy || 0, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-400/10" },
            { label: "Optimal", value: summary.optimal || 0, icon: Zap, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Avg Utilization", value: `${summary.avgUtilization || 0}%`, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-400/10" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {workload.map((w: any) => {
            const lc = loadColors[w.loadLevel] || loadColors.optimal;
            return (
              <div key={w.member.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: w.member.color }}>
                    {w.member.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{w.member.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${lc.bg} ${lc.text}`}>{lc.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{w.member.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold">{w.weekHoursLogged}h / {w.capacity}h</div>
                    <div className="text-xs text-muted-foreground">this week</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilization</span>
                    <span>{w.utilization}%</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${w.utilization > 100 ? "bg-rose-500" : w.utilization > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(w.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{w.totalActiveTasks}</div>
                    <div className="text-[10px] text-muted-foreground">Active Tasks</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{w.totalPoints}</div>
                    <div className="text-[10px] text-muted-foreground">Story Points</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${w.overdueTasks > 0 ? "text-rose-400" : ""}`}>{w.overdueTasks}</div>
                    <div className="text-[10px] text-muted-foreground">Overdue</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">{w.upcomingTasks}</div>
                    <div className="text-[10px] text-muted-foreground">Due This Week</div>
                  </div>
                </div>

                {Object.keys(w.tasksByProject).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Tasks by Project</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(w.tasksByProject as Record<string, number>).map(([proj, count]) => (
                        <span key={proj} className="px-2 py-1 bg-background rounded-lg text-xs">
                          {proj}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(w.tasksByPriority).length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">By Priority</div>
                    <div className="flex gap-2">
                      {Object.entries(w.tasksByPriority as Record<string, number>).map(([pri, count]) => {
                        const colors: Record<string, string> = {
                          critical: "bg-rose-500/10 text-rose-400",
                          high: "bg-orange-500/10 text-orange-400",
                          medium: "bg-amber-500/10 text-amber-400",
                          low: "bg-blue-500/10 text-blue-400",
                        };
                        return (
                          <span key={pri} className={`px-2 py-1 rounded-lg text-xs capitalize ${colors[pri] || "bg-secondary text-muted-foreground"}`}>
                            {pri}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
