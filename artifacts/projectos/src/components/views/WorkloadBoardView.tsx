import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Users, AlertTriangle, TrendingUp, Zap, BarChart3, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const STATUS_DOTS: Record<string, string> = {
  backlog: "#94a3b8", todo: "#60a5fa", inprogress: "#a78bfa",
  review: "#fbbf24", done: "#34d399", blocked: "#f87171",
};

const PRIORITY_ICONS: Record<string, string> = { critical: "🔴", high: "🟡", medium: "🔵", low: "⚪" };

type Props = {
  tasks: any[];
  projects: any[];
  members: any[];
  onTaskClick: (task: any) => void;
};

export default function WorkloadBoardView({ tasks, projects, members, onTaskClick }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [capacityPerMember] = useState(40);
  const [viewType, setViewType] = useState<"bar" | "timeline">("bar");
  const [expandedMember, setExpandedMember] = useState<number | null>(null);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const memberWorkloads = useMemo(() => {
    return members.map(member => {
      const memberTasks = tasks.filter(t =>
        t.assigneeIds && (t.assigneeIds as number[]).includes(member.id) && t.status !== "done"
      );

      const weekTasks = memberTasks.filter(t => {
        if (!t.due) return true;
        const due = new Date(t.due);
        return due >= weekStart && due <= weekEnd;
      });

      const totalPoints = memberTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      const weekPoints = weekTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      const utilization = Math.round((totalPoints / capacityPerMember) * 100);

      const overdueTasks = memberTasks.filter(t => t.due && new Date(t.due) < new Date());
      const blockedTasks = memberTasks.filter(t => t.status === "blocked");
      const inProgressTasks = memberTasks.filter(t => t.status === "inprogress");

      let loadLevel: "overloaded" | "heavy" | "optimal" | "light" | "idle" = "idle";
      if (utilization > 100) loadLevel = "overloaded";
      else if (utilization > 80) loadLevel = "heavy";
      else if (utilization > 40) loadLevel = "optimal";
      else if (utilization > 0) loadLevel = "light";

      return {
        member,
        tasks: memberTasks,
        weekTasks,
        totalPoints,
        weekPoints,
        utilization,
        overdueTasks,
        blockedTasks,
        inProgressTasks,
        loadLevel,
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [tasks, members, weekStart, weekEnd, capacityPerMember]);

  const summary = useMemo(() => {
    const overloaded = memberWorkloads.filter(w => w.loadLevel === "overloaded").length;
    const heavy = memberWorkloads.filter(w => w.loadLevel === "heavy").length;
    const optimal = memberWorkloads.filter(w => w.loadLevel === "optimal").length;
    const avgUtil = memberWorkloads.length > 0
      ? Math.round(memberWorkloads.reduce((sum, w) => sum + w.utilization, 0) / memberWorkloads.length)
      : 0;
    const totalOverdue = memberWorkloads.reduce((sum, w) => sum + w.overdueTasks.length, 0);
    return { overloaded, heavy, optimal, avgUtil, totalOverdue, total: memberWorkloads.length };
  }, [memberWorkloads]);

  const loadColors: Record<string, { text: string; bg: string; bar: string }> = {
    overloaded: { text: "text-rose-400", bg: "bg-rose-400/10", bar: "bg-rose-400" },
    heavy: { text: "text-amber-400", bg: "bg-amber-400/10", bar: "bg-amber-400" },
    optimal: { text: "text-emerald-400", bg: "bg-emerald-400/10", bar: "bg-emerald-400" },
    light: { text: "text-blue-400", bg: "bg-blue-400/10", bar: "bg-blue-400" },
    idle: { text: "text-gray-400", bg: "bg-gray-400/10", bar: "bg-gray-400" },
  };

  return (
    <div className="pb-8 px-2">
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Team Members", value: summary.total, icon: Users, color: "text-violet-400", bg: "bg-violet-400/10" },
          { label: "Overloaded", value: summary.overloaded, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
          { label: "Heavy Load", value: summary.heavy, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Optimal", value: summary.optimal, icon: Zap, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { label: "Avg Utilization", value: `${summary.avgUtil}%`, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-400/10" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">This Week</button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground ml-2">
            {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1">
          <button onClick={() => setViewType("bar")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${viewType === "bar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Capacity
          </button>
          <button onClick={() => setViewType("timeline")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${viewType === "timeline" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Timeline
          </button>
        </div>
      </div>

      {viewType === "bar" ? (
        <div className="space-y-3">
          {memberWorkloads.map(({ member, tasks: memberTasks, totalPoints, utilization, loadLevel, overdueTasks, blockedTasks, inProgressTasks }) => {
            const lc = loadColors[loadLevel];
            const isExpanded = expandedMember === member.id;

            return (
              <div key={member.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: member.color }}>
                      {member.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{member.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lc.bg} ${lc.text} capitalize`}>{loadLevel}</span>
                        {overdueTasks.length > 0 && (
                          <span className="text-[10px] text-rose-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{overdueTasks.length} overdue</span>
                        )}
                        {blockedTasks.length > 0 && (
                          <span className="text-[10px] text-rose-400 flex items-center gap-0.5">🚫 {blockedTasks.length} blocked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${lc.bar}`}
                            style={{ width: `${Math.min(100, utilization)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${lc.text} tabular-nums min-w-[50px] text-right`}>{utilization}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-mono text-muted-foreground">{totalPoints}/{capacityPerMember} pts</div>
                      <div className="text-[10px] text-muted-foreground">{memberTasks.length} tasks · {inProgressTasks.length} active</div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                      <div className="text-center p-2 bg-violet-500/10 rounded-lg">
                        <div className="text-lg font-bold text-violet-400">{inProgressTasks.length}</div>
                        <div className="text-[10px] text-muted-foreground">In Progress</div>
                      </div>
                      <div className="text-center p-2 bg-rose-500/10 rounded-lg">
                        <div className="text-lg font-bold text-rose-400">{overdueTasks.length}</div>
                        <div className="text-[10px] text-muted-foreground">Overdue</div>
                      </div>
                      <div className="text-center p-2 bg-amber-500/10 rounded-lg">
                        <div className="text-lg font-bold text-amber-400">{blockedTasks.length}</div>
                        <div className="text-[10px] text-muted-foreground">Blocked</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {memberTasks.map(t => {
                        const project = projects.find(p => p.id === t.projectId);
                        const isOverdue = t.due && new Date(t.due) < new Date();
                        return (
                          <div key={t.id} onClick={() => onTaskClick(t)}
                            className="flex items-center gap-2 p-2 rounded-lg border border-border/30 hover:border-primary/30 cursor-pointer bg-secondary/20 transition-colors">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOTS[t.status] || "#888" }} />
                            <span className="text-xs font-medium flex-1 truncate">{t.title}</span>
                            <span className="text-[10px]">{PRIORITY_ICONS[t.priority]}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{t.points}pt</span>
                            {t.due && (
                              <span className={`text-[10px] font-mono ${isOverdue ? "text-rose-400" : "text-muted-foreground"}`}>
                                {format(new Date(t.due), "MMM d")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {memberWorkloads.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <div className="text-sm font-medium">No team members</div>
              <div className="text-xs mt-1">Add team members to see workload distribution</div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex border-b border-border bg-secondary/30">
              <div className="w-[200px] shrink-0 px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Member</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="flex-1 px-2 py-2 text-center text-xs font-bold text-muted-foreground border-l border-border/20">
                  <div>{format(day, "EEE")}</div>
                  <div className="text-[10px]">{format(day, "MMM d")}</div>
                </div>
              ))}
            </div>

            {memberWorkloads.map(({ member, weekTasks }) => (
              <div key={member.id} className="flex border-b border-border/30 hover:bg-white/[0.02]">
                <div className="w-[200px] shrink-0 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: member.color }}>
                    {member.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{member.name}</div>
                    <div className="text-[10px] text-muted-foreground">{weekTasks.length} tasks</div>
                  </div>
                </div>
                {weekDays.map(day => {
                  const dayTasks = weekTasks.filter(t => {
                    if (!t.due) return false;
                    const due = new Date(t.due);
                    return format(due, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                  });
                  const dayPoints = dayTasks.reduce((sum, t) => sum + (t.points || 0), 0);
                  const isHeavy = dayPoints > 8;

                  return (
                    <div key={day.toISOString()} className="flex-1 border-l border-border/10 p-1">
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(t => (
                          <div key={t.id} onClick={() => onTaskClick(t)}
                            className="text-[9px] px-1 py-0.5 rounded cursor-pointer truncate font-medium"
                            style={{ backgroundColor: `${STATUS_DOTS[t.status]}20`, color: STATUS_DOTS[t.status] }}>
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-[9px] text-muted-foreground text-center">+{dayTasks.length - 3}</div>
                        )}
                        {dayPoints > 0 && (
                          <div className={`text-center text-[9px] font-mono ${isHeavy ? "text-rose-400" : "text-muted-foreground"}`}>{dayPoints}pt</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
