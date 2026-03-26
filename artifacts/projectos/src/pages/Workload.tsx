import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, TrendingUp, AlertTriangle, Zap, BarChart3, Settings, Save, X, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const loadColors: Record<string, { text: string; bg: string; label: string }> = {
  overloaded: { text: "text-rose-400", bg: "bg-rose-400/10", label: "Overloaded" },
  heavy: { text: "text-amber-400", bg: "bg-amber-400/10", label: "Heavy" },
  optimal: { text: "text-emerald-400", bg: "bg-emerald-400/10", label: "Optimal" },
  light: { text: "text-blue-400", bg: "bg-blue-400/10", label: "Light" },
};

type ViewMode = "cards" | "heatmap";

export default function Workload() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["workload"], queryFn: () => apiFetch("/workload") });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => apiFetch("/members") });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => apiFetch("/tasks") });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["time-entries"], queryFn: () => apiFetch("/time-entries") });
  const [showCapacity, setShowCapacity] = useState(false);
  const [capacityEdits, setCapacityEdits] = useState<Record<number, { hoursPerDay: number; capacity: number }>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [heatmapWeekOffset, setHeatmapWeekOffset] = useState(0);

  const updateCapacity = useMutation({
    mutationFn: ({ id, ...body }: { id: number; hoursPerDay: number; capacity: number }) =>
      apiFetch(`/members/${id}/capacity`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workload"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const saveAllCapacity = () => {
    Object.entries(capacityEdits).forEach(([id, vals]) => {
      updateCapacity.mutate({ id: parseInt(id), ...vals });
    });
    setCapacityEdits({});
    setShowCapacity(false);
  };

  const workload = data?.workload || [];
  const summary = data?.summary || {};

  const heatmapWeekStart = startOfWeek(addWeeks(new Date(), heatmapWeekOffset), { weekStartsOn: 1 });
  const heatmapWeekEnd = endOfWeek(heatmapWeekStart, { weekStartsOn: 1 });
  const heatmapDays = eachDayOfInterval({ start: heatmapWeekStart, end: heatmapWeekEnd });

  const heatmapData = useMemo(() => {
    return members.map((m: any) => {
      const memberTasks = tasks.filter((t: any) => (t.assigneeIds || []).includes(m.id) && t.status !== "done");
      const capacity = m.hoursPerDay || 8;
      const dailyLoad = heatmapDays.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const hoursLogged = timeEntries
          .filter((e: any) => e.memberId === m.id && e.date && format(new Date(e.date), "yyyy-MM-dd") === dayStr)
          .reduce((s: number, e: any) => s + (e.hours ? parseFloat(e.hours) : 0), 0);
        const tasksOnDay = memberTasks.filter((t: any) => {
          if (!t.due) return false;
          const dueDate = format(new Date(t.due), "yyyy-MM-dd");
          const startDate = t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : dueDate;
          return dayStr >= startDate && dayStr <= dueDate;
        }).length;
        const estimatedHours = hoursLogged > 0 ? hoursLogged : tasksOnDay * 2;
        const utilization = capacity > 0 ? Math.round((estimatedHours / capacity) * 100) : 0;
        return { day, hoursLogged, tasksOnDay, estimatedHours, utilization, capacity };
      });
      return { member: m, dailyLoad };
    });
  }, [members, tasks, timeEntries, heatmapDays]);

  const getHeatColor = (utilization: number) => {
    if (utilization === 0) return "bg-muted/30";
    if (utilization <= 40) return "bg-blue-500/30 text-blue-300";
    if (utilization <= 70) return "bg-emerald-500/40 text-emerald-300";
    if (utilization <= 90) return "bg-amber-500/40 text-amber-300";
    if (utilization <= 100) return "bg-orange-500/50 text-orange-300";
    return "bg-rose-500/50 text-rose-300";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Workload Management
            </h1>
            <p className="text-muted-foreground mt-1">Visual capacity planning across your team</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => setViewMode("cards")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <Users className="w-3.5 h-3.5 inline mr-1" />Cards
              </button>
              <button onClick={() => setViewMode("heatmap")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === "heatmap" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />Heatmap
              </button>
            </div>
            <button onClick={() => {
              const edits: Record<number, { hoursPerDay: number; capacity: number }> = {};
              members.forEach((m: any) => { edits[m.id] = { hoursPerDay: m.hoursPerDay || 8, capacity: m.capacity || 40 }; });
              setCapacityEdits(edits);
              setShowCapacity(!showCapacity);
            }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-border hover:border-primary/30 transition-colors">
              <Settings className="w-4 h-4" /> Capacity Settings
            </button>
          </div>
        </div>

        {showCapacity && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Team Capacity Settings</h3>
              <div className="flex items-center gap-2">
                <button onClick={saveAllCapacity} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="w-3.5 h-3.5" /> Save All
                </button>
                <button onClick={() => setShowCapacity(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m: any) => {
                const edit = capacityEdits[m.id] || { hoursPerDay: m.hoursPerDay || 8, capacity: m.capacity || 40 };
                return (
                  <div key={m.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color || "#6366f1" }}>
                        {(m.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">{m.role || "Team Member"}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Hours/Day</label>
                        <input type="number" min={1} max={24} step={0.5} value={edit.hoursPerDay}
                          onChange={e => setCapacityEdits(prev => ({ ...prev, [m.id]: { ...edit, hoursPerDay: parseFloat(e.target.value) || 8 } }))}
                          className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Weekly Cap (h)</label>
                        <input type="number" min={1} max={168} step={1} value={edit.capacity}
                          onChange={e => setCapacityEdits(prev => ({ ...prev, [m.id]: { ...edit, capacity: parseInt(e.target.value) || 40 } }))}
                          className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {viewMode === "heatmap" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> Workload Heatmap
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setHeatmapWeekOffset(prev => prev - 1)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setHeatmapWeekOffset(0)} className="text-xs font-medium px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80">
                  This Week
                </button>
                <button onClick={() => setHeatmapWeekOffset(prev => prev + 1)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground ml-2">
                  {format(heatmapWeekStart, "MMM d")} — {format(heatmapWeekEnd, "MMM d, yyyy")}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4 w-48">Team Member</th>
                    {heatmapDays.map(day => (
                      <th key={day.toISOString()} className={`text-center text-xs font-medium pb-3 px-1 min-w-[80px] ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                        <div>{format(day, "EEE")}</div>
                        <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
                      </th>
                    ))}
                    <th className="text-center text-xs font-medium text-muted-foreground pb-3 px-2 min-w-[80px]">Weekly</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map(({ member: m, dailyLoad }) => {
                    const weekTotal = dailyLoad.reduce((s, d) => s + d.estimatedHours, 0);
                    const weekCap = m.capacity || 40;
                    const weekUtil = weekCap > 0 ? Math.round((weekTotal / weekCap) * 100) : 0;
                    return (
                      <tr key={m.id} className="border-t border-border/50">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: m.color || "#6366f1" }}>
                              {(m.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-medium truncate max-w-[120px]">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground">{(m.hoursPerDay || 8)}h/day</div>
                            </div>
                          </div>
                        </td>
                        {dailyLoad.map((d, i) => (
                          <td key={i} className="py-2 px-1">
                            <div className={`rounded-lg p-2 text-center transition-all hover:ring-1 hover:ring-primary/30 ${getHeatColor(d.utilization)}`}
                              title={`${m.name}: ${d.estimatedHours}h / ${d.capacity}h (${d.utilization}%)\n${d.tasksOnDay} task(s) active`}>
                              <div className="text-sm font-bold">{d.estimatedHours > 0 ? `${d.estimatedHours}h` : "—"}</div>
                              <div className="text-[9px] opacity-75">{d.tasksOnDay > 0 ? `${d.tasksOnDay} tasks` : ""}</div>
                            </div>
                          </td>
                        ))}
                        <td className="py-2 px-2">
                          <div className={`rounded-lg p-2 text-center font-bold text-sm ${getHeatColor(weekUtil)}`}>
                            {weekTotal}h
                            <div className="text-[9px] opacity-75">{weekUtil}%</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Legend:</span>
              {[
                { label: "Free", cls: "bg-muted/30" },
                { label: "Light", cls: "bg-blue-500/30" },
                { label: "Good", cls: "bg-emerald-500/40" },
                { label: "Heavy", cls: "bg-amber-500/40" },
                { label: "Full", cls: "bg-orange-500/50" },
                { label: "Over", cls: "bg-rose-500/50" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded ${l.cls}`} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "cards" && (
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
        )}
      </div>
    </div>
  );
}
