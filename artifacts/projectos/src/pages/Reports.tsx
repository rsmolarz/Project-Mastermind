import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle2, Users, Download, PieChart, ArrowUpRight, ArrowDownRight, Zap, Target } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-overview"],
    queryFn: () => fetch(`${API}/api/reports/overview`, { credentials: "include" }).then(r => r.json()),
  });

  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "team" | "trends" | "burndown" | "velocity">("overview");

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

  const burndownData = useMemo(() => {
    if (!completionTrend || completionTrend.length === 0) return [];
    let remaining = summary?.total || 0;
    const idealStart = remaining;
    const days = completionTrend.length;
    return completionTrend.map((d: any, i: number) => {
      remaining = remaining - (d.completed || 0) + (d.created || 0);
      return { date: d.date?.slice(5) || `D${i}`, actual: Math.max(0, remaining), ideal: Math.max(0, Math.round(idealStart - (idealStart / days) * (i + 1))) };
    });
  }, [completionTrend, summary]);

  const velocityData = useMemo(() => {
    if (!completionTrend || completionTrend.length < 7) return [];
    const weeks: { week: string; completed: number; created: number }[] = [];
    for (let i = 0; i < completionTrend.length; i += 7) {
      const slice = completionTrend.slice(i, i + 7);
      weeks.push({
        week: `W${weeks.length + 1}`,
        completed: slice.reduce((s: number, d: any) => s + (d.completed || 0), 0),
        created: slice.reduce((s: number, d: any) => s + (d.created || 0), 0),
      });
    }
    return weeks;
  }, [completionTrend]);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "projects", label: "Projects", icon: PieChart },
    { id: "team", label: "Team", icon: Users },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "burndown", label: "Burndown", icon: Target },
    { id: "velocity", label: "Velocity", icon: Zap },
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

      {activeTab === "burndown" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-2">Burndown Chart</h3>
          <p className="text-xs text-muted-foreground mb-4">Tracks remaining work vs ideal progress over the last 30 days</p>
          {burndownData.length > 0 ? (
            <div>
              <svg viewBox={`0 0 ${burndownData.length * 30 + 60} 220`} className="w-full h-64">
                <line x1="40" y1="10" x2="40" y2="190" stroke="currentColor" strokeOpacity="0.15" />
                <line x1="40" y1="190" x2={burndownData.length * 30 + 50} y2="190" stroke="currentColor" strokeOpacity="0.15" />
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const maxVal = Math.max(...burndownData.map(d => Math.max(d.actual, d.ideal)), 1);
                  const y = 190 - pct * 180;
                  return <g key={i}><line x1="40" y1={y} x2={burndownData.length * 30 + 50} y2={y} stroke="currentColor" strokeOpacity="0.07" /><text x="35" y={y + 4} textAnchor="end" fill="currentColor" fillOpacity="0.4" fontSize="9">{Math.round(maxVal * pct)}</text></g>;
                })}
                {(() => {
                  const maxVal = Math.max(...burndownData.map(d => Math.max(d.actual, d.ideal)), 1);
                  const idealPath = burndownData.map((d, i) => `${i === 0 ? "M" : "L"} ${50 + i * 30} ${190 - (d.ideal / maxVal) * 180}`).join(" ");
                  const actualPath = burndownData.map((d, i) => `${i === 0 ? "M" : "L"} ${50 + i * 30} ${190 - (d.actual / maxVal) * 180}`).join(" ");
                  return <>
                    <path d={idealPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3" strokeOpacity="0.6" />
                    <path d={actualPath} fill="none" stroke="#22c55e" strokeWidth="2.5" />
                    {burndownData.map((d, i) => <circle key={i} cx={50 + i * 30} cy={190 - (d.actual / maxVal) * 180} r="3" fill="#22c55e" />)}
                  </>;
                })()}
                {burndownData.filter((_, i) => i % Math.ceil(burndownData.length / 10) === 0 || i === burndownData.length - 1).map((d, idx) => {
                  const i = burndownData.indexOf(d);
                  return <text key={idx} x={50 + i * 30} y="205" textAnchor="middle" fill="currentColor" fillOpacity="0.4" fontSize="8">{d.date}</text>;
                })}
              </svg>
              <div className="flex gap-6 mt-2 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-indigo-500 rounded" style={{ borderTop: "2px dashed #6366f1" }} /> Ideal</span>
                <span className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-emerald-500 rounded" /> Actual</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Not enough data for burndown chart</div>
          )}
        </div>
      )}

      {activeTab === "velocity" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-2">Weekly Velocity</h3>
            <p className="text-xs text-muted-foreground mb-4">Tasks completed vs created per week</p>
            {velocityData.length > 0 ? (
              <div>
                <div className="flex items-end gap-3 h-48">
                  {velocityData.map((w, i) => {
                    const maxVal = Math.max(...velocityData.map(v => Math.max(v.completed, v.created)), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex gap-1 items-end w-full justify-center" style={{ height: "160px" }}>
                          <div className="w-5 bg-emerald-500/70 rounded-t transition-all" style={{ height: `${(w.completed / maxVal) * 100}%`, minHeight: w.completed > 0 ? "4px" : "0" }} title={`Completed: ${w.completed}`} />
                          <div className="w-5 bg-blue-500/70 rounded-t transition-all" style={{ height: `${(w.created / maxVal) * 100}%`, minHeight: w.created > 0 ? "4px" : "0" }} title={`Created: ${w.created}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{w.week}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-6 mt-4 text-xs text-muted-foreground justify-center">
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/70" /> Completed</span>
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/70" /> Created</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-emerald-400">{velocityData.length > 0 ? Math.round(velocityData.reduce((s, w) => s + w.completed, 0) / velocityData.length) : 0}</div>
                    <div className="text-[10px] text-muted-foreground">Avg Completed/Week</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-blue-400">{velocityData.length > 0 ? Math.round(velocityData.reduce((s, w) => s + w.created, 0) / velocityData.length) : 0}</div>
                    <div className="text-[10px] text-muted-foreground">Avg Created/Week</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className={`text-xl font-bold ${velocityData.length > 0 && velocityData.reduce((s, w) => s + w.completed, 0) >= velocityData.reduce((s, w) => s + w.created, 0) ? "text-emerald-400" : "text-amber-400"}`}>
                      {velocityData.length > 0 ? `${Math.round((velocityData.reduce((s, w) => s + w.completed, 0) / Math.max(velocityData.reduce((s, w) => s + w.created, 0), 1)) * 100)}%` : "0%"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Throughput Ratio</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">Not enough data for velocity chart (need at least 7 days)</div>
            )}
          </div>

          {/* Distribution Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Status Distribution</h3>
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 120 120" className="w-32 h-32">
                  {(() => {
                    const entries = Object.entries(byStatus).filter(([, v]) => (v as number) > 0);
                    const total = entries.reduce((s, [, v]) => s + (v as number), 0);
                    let cumAngle = 0;
                    return entries.map(([key, val], i) => {
                      const pct = (val as number) / total;
                      const startAngle = cumAngle;
                      cumAngle += pct * 360;
                      const endAngle = cumAngle;
                      const largeArc = pct > 0.5 ? 1 : 0;
                      const r = 50;
                      const cx = 60, cy = 60;
                      const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                      const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                      const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                      const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                      if (entries.length === 1) return <circle key={key} cx={cx} cy={cy} r={r} fill={statusColors[key] || "#6b7280"} />;
                      return <path key={key} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={statusColors[key] || "#6b7280"} stroke="var(--card)" strokeWidth="1" />;
                    });
                  })()}
                </svg>
                <div className="space-y-1.5">
                  {Object.entries(byStatus).filter(([, v]) => (v as number) > 0).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[key] || "#6b7280" }} />
                      <span className="capitalize">{key.replace("_", " ")}</span>
                      <span className="text-muted-foreground font-mono ml-auto">{val as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Priority Distribution</h3>
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 120 120" className="w-32 h-32">
                  {(() => {
                    const entries = Object.entries(byPriority).filter(([, v]) => (v as number) > 0);
                    const total = entries.reduce((s, [, v]) => s + (v as number), 0);
                    let cumAngle = 0;
                    return entries.map(([key, val]) => {
                      const pct = (val as number) / total;
                      const startAngle = cumAngle;
                      cumAngle += pct * 360;
                      const endAngle = cumAngle;
                      const largeArc = pct > 0.5 ? 1 : 0;
                      const r = 50;
                      const cx = 60, cy = 60;
                      const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                      const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                      const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                      const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                      if (entries.length === 1) return <circle key={key} cx={cx} cy={cy} r={r} fill={priorityColors[key] || "#6b7280"} />;
                      return <path key={key} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={priorityColors[key] || "#6b7280"} stroke="var(--card)" strokeWidth="1" />;
                    });
                  })()}
                </svg>
                <div className="space-y-1.5">
                  {Object.entries(byPriority).filter(([, v]) => (v as number) > 0).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priorityColors[key] || "#6b7280" }} />
                      <span className="capitalize">{key}</span>
                      <span className="text-muted-foreground font-mono ml-auto">{val as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
