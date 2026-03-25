import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle2, Users, Download, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-overview"],
    queryFn: () => fetch(`${API}/api/reports/overview`, { credentials: "include" }).then(r => r.json()),
  });

  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "team" | "trends">("overview");

  const handleExport = async () => {
    const res = await fetch(`${API}/api/reports/export?format=csv`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tasks-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading reports...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No data available</div>;

  const { summary, byPriority, byStatus, byType, projectStats, memberStats, completionTrend } = data;
  const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
  const statusColors: Record<string, string> = { todo: "#6b7280", in_progress: "#3b82f6", review: "#a855f7", done: "#22c55e", blocked: "#ef4444" };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "projects", label: "Projects", icon: PieChart },
    { id: "team", label: "Team", icon: Users },
    { id: "trends", label: "Trends", icon: TrendingUp },
  ] as const;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Insights across all projects and team members</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Tasks", value: summary.total, icon: CheckCircle2, color: "from-blue-500 to-indigo-500" },
              { label: "Completion Rate", value: `${summary.completionRate}%`, icon: TrendingUp, color: "from-emerald-500 to-green-500" },
              { label: "Overdue", value: summary.overdue, icon: AlertTriangle, color: "from-rose-500 to-red-500" },
              { label: "Hours Logged", value: summary.totalHours, icon: Clock, color: "from-amber-500 to-orange-500" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}><s.icon className="w-4 h-4 text-white" /></div>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">By Priority</h3>
              <div className="space-y-3">
                {Object.entries(byPriority).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm capitalize w-16">{key}</span>
                    <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${summary.total > 0 ? ((val as number) / summary.total) * 100 : 0}%`, backgroundColor: priorityColors[key] }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{val as number}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">By Status</h3>
              <div className="space-y-3">
                {Object.entries(byStatus).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm capitalize w-24">{key.replace("_", " ")}</span>
                    <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${summary.total > 0 ? ((val as number) / summary.total) * 100 : 0}%`, backgroundColor: statusColors[key] || "#6b7280" }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{val as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">By Type</h3>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(byType).map(([key, val]) => (
                <div key={key} className="bg-secondary/50 rounded-lg px-4 py-3 text-center min-w-[100px]">
                  <div className="text-xl font-bold">{val as number}</div>
                  <div className="text-xs text-muted-foreground capitalize">{key}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="space-y-4">
          {projectStats?.map((p: any) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-semibold">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {p.overdueTasks > 0 && <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{p.overdueTasks} overdue</span>}
                  <span className={`text-sm font-bold ${p.completionRate >= 75 ? "text-emerald-400" : p.completionRate >= 40 ? "text-amber-400" : "text-rose-400"}`}>{p.completionRate}%</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${p.completionRate}%` }} />
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{p.totalTasks} total</span>
                <span>{p.completedTasks} done</span>
              </div>
            </div>
          ))}
          {(!projectStats || projectStats.length === 0) && <div className="text-center text-muted-foreground py-12">No project data</div>}
        </div>
      )}

      {activeTab === "team" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberStats?.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: m.color }}>
                  {m.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.hoursLogged}h logged</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">{m.totalTasks}</div>
                  <div className="text-[10px] text-muted-foreground">Assigned</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-emerald-400">{m.completedTasks}</div>
                  <div className="text-[10px] text-muted-foreground">Completed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "trends" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">30-Day Task Activity</h3>
          <div className="space-y-1">
            {completionTrend?.map((d: any, i: number) => {
              const maxVal = Math.max(...completionTrend.map((x: any) => Math.max(x.created, x.completed)), 1);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground font-mono">{d.date.slice(5)}</span>
                  <div className="flex-1 flex gap-1 items-center">
                    <div className="bg-blue-500/60 rounded h-4" style={{ width: `${(d.created / maxVal) * 100}%`, minWidth: d.created > 0 ? "4px" : "0" }} />
                    <div className="bg-emerald-500/60 rounded h-4" style={{ width: `${(d.completed / maxVal) * 100}%`, minWidth: d.completed > 0 ? "4px" : "0" }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{d.created > 0 && <span className="text-blue-400 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{d.created}</span>}</span>
                  <span className="w-12 text-right text-muted-foreground">{d.completed > 0 && <span className="text-emerald-400 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" />{d.completed}</span>}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/60" /> Created</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/60" /> Completed</span>
          </div>
        </div>
      )}
    </div>
  );
}
