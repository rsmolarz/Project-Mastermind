import { useState, useMemo } from "react";
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, addWeeks, eachWeekOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from "lucide-react";

const STATUSES: Record<string, { color: string; bg: string }> = {
  backlog: { color: "#94a3b8", bg: "rgba(148,163,184,0.25)" },
  todo: { color: "#60a5fa", bg: "rgba(96,165,250,0.25)" },
  inprogress: { color: "#a78bfa", bg: "rgba(167,139,250,0.25)" },
  review: { color: "#fbbf24", bg: "rgba(251,191,36,0.25)" },
  done: { color: "#34d399", bg: "rgba(52,211,153,0.25)" },
  blocked: { color: "#f87171", bg: "rgba(248,113,113,0.25)" },
};

const PRIORITY_ICONS: Record<string, string> = { critical: "🔴", high: "🟡", medium: "🔵", low: "⚪" };

type Props = {
  tasks: any[];
  projects: any[];
  members: any[];
  onTaskClick: (task: any) => void;
  dependencies?: { id: number; taskId: number; dependsOnId: number }[];
};

export default function TimelineView({ tasks, projects, members, onTaskClick }: Props) {
  const [zoom, setZoom] = useState<"day" | "week" | "month">("week");
  const [offset, setOffset] = useState(0);

  const now = new Date();
  const rangeStart = useMemo(() => {
    if (zoom === "day") return addDays(startOfWeek(now), offset * 14);
    if (zoom === "week") return addDays(startOfMonth(now), offset * 60);
    return addDays(startOfMonth(now), offset * 120);
  }, [zoom, offset]);

  const rangeEnd = useMemo(() => {
    if (zoom === "day") return addDays(rangeStart, 14);
    if (zoom === "week") return addDays(rangeStart, 60);
    return addDays(rangeStart, 120);
  }, [zoom, rangeStart]);

  const totalDays = differenceInDays(rangeEnd, rangeStart);

  const columns = useMemo(() => {
    if (zoom === "day") {
      return eachDayOfInterval({ start: rangeStart, end: addDays(rangeEnd, -1) }).map(d => ({
        key: d.toISOString(),
        label: format(d, "EEE d"),
        sublabel: format(d, "MMM"),
        start: d,
        end: addDays(d, 1),
        isToday: isToday(d),
      }));
    }
    if (zoom === "week") {
      const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd });
      return weeks.map(w => ({
        key: w.toISOString(),
        label: `${format(w, "MMM d")}`,
        sublabel: format(w, "yyyy"),
        start: w,
        end: endOfWeek(w),
        isToday: isToday(w),
      }));
    }
    const months: any[] = [];
    let cur = startOfMonth(rangeStart);
    while (cur < rangeEnd) {
      months.push({
        key: cur.toISOString(),
        label: format(cur, "MMMM"),
        sublabel: format(cur, "yyyy"),
        start: cur,
        end: endOfMonth(cur),
        isToday: false,
      });
      cur = addDays(endOfMonth(cur), 1);
    }
    return months;
  }, [zoom, rangeStart, rangeEnd]);

  const todayOffset = differenceInDays(now, rangeStart);
  const todayPct = (todayOffset / totalDays) * 100;

  const tasksWithDates = useMemo(() => {
    return tasks
      .filter(t => t.due || t.startDate)
      .sort((a, b) => {
        const aStart = a.startDate ? new Date(a.startDate) : a.due ? new Date(a.due) : now;
        const bStart = b.startDate ? new Date(b.startDate) : b.due ? new Date(b.due) : now;
        return aStart.getTime() - bStart.getTime();
      });
  }, [tasks]);

  const projectGroups = useMemo(() => {
    const groups: Record<number, { project: any; tasks: any[] }> = {};
    tasksWithDates.forEach(t => {
      if (!groups[t.projectId]) {
        const p = projects.find(p => p.id === t.projectId);
        groups[t.projectId] = { project: p || { id: t.projectId, name: "Unknown", color: "#888" }, tasks: [] };
      }
      groups[t.projectId].tasks.push(t);
    });
    return Object.values(groups);
  }, [tasksWithDates, projects]);

  const getBarPosition = (task: any) => {
    const taskStart = task.startDate ? new Date(task.startDate) : task.due ? addDays(new Date(task.due), -3) : now;
    const taskEnd = task.due ? new Date(task.due) : addDays(taskStart, 3);
    const startPct = Math.max(0, (differenceInDays(taskStart, rangeStart) / totalDays) * 100);
    const endPct = Math.min(100, (differenceInDays(taskEnd, rangeStart) / totalDays) * 100);
    const width = Math.max(1.5, endPct - startPct);
    return { left: `${startPct}%`, width: `${width}%` };
  };

  return (
    <div className="pb-8 px-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setOffset(0)} className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">Today</button>
          <button onClick={() => setOffset(o => o + 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1">
          {(["day", "week", "month"] as const).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${zoom === z ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {z}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {format(rangeStart, "MMM d, yyyy")} — {format(rangeEnd, "MMM d, yyyy")}
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <div className="min-w-[900px]">
          <div className="flex border-b border-border bg-secondary/30">
            <div className="w-[260px] shrink-0 px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Task</div>
            <div className="flex-1 flex relative">
              {columns.map(col => (
                <div key={col.key} className={`flex-1 px-2 py-2 text-center border-l border-border/20 ${col.isToday ? "bg-primary/5" : ""}`}>
                  <div className="text-xs font-bold text-muted-foreground">{col.label}</div>
                  <div className="text-[10px] text-muted-foreground/60">{col.sublabel}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `calc(260px + ((100% - 260px) * ${todayPct / 100}))` }}>
                <div className="w-0.5 h-full bg-primary/60" />
                <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-primary" />
              </div>
            )}

            {projectGroups.map(({ project, tasks: groupTasks }) => (
              <div key={project.id}>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 border-b border-border/30">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{project.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-1">{groupTasks.length} tasks</span>
                </div>

                {groupTasks.map(task => {
                  const pos = getBarPosition(task);
                  const statusStyle = STATUSES[task.status] || STATUSES.todo;
                  const isDone = task.status === "done";
                  const isOverdue = task.due && new Date(task.due) < now && !isDone;
                  const assignees = (task.assigneeIds || []).slice(0, 2);
                  const progress = task.subtasks?.length > 0
                    ? Math.round((task.subtasks.filter((s: any) => s.done).length / task.subtasks.length) * 100)
                    : null;

                  return (
                    <div key={task.id} onClick={() => onTaskClick(task)}
                      className="flex items-center hover:bg-white/[0.03] cursor-pointer border-b border-border/10 group"
                      style={{ height: "40px" }}>
                      <div className="w-[260px] shrink-0 px-4 flex items-center gap-2">
                        <span className="text-[10px]">{PRIORITY_ICONS[task.priority] || "🔵"}</span>
                        <span className={`text-xs font-medium truncate flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        <div className="flex -space-x-1">
                          {assignees.map((id: number) => {
                            const m = members.find(m => m.id === id);
                            if (!m) return null;
                            return (
                              <div key={id} className="w-5 h-5 rounded-full border border-background text-[8px] font-bold text-white flex items-center justify-center"
                                style={{ backgroundColor: m.color }}>
                                {m.name?.charAt(0)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex-1 relative h-full">
                        {columns.map(col => (
                          <div key={col.key} className="absolute top-0 bottom-0 border-l border-border/5" style={{ left: `${(differenceInDays(col.start, rangeStart) / totalDays) * 100}%` }} />
                        ))}
                        <div
                          className="absolute top-[8px] h-[24px] rounded-md flex items-center px-2 text-[10px] font-semibold transition-all group-hover:shadow-lg"
                          style={{
                            left: pos.left,
                            width: pos.width,
                            minWidth: "24px",
                            backgroundColor: isOverdue ? "rgba(248,113,113,0.3)" : statusStyle.bg,
                            color: isOverdue ? "#f87171" : statusStyle.color,
                            borderLeft: `3px solid ${isOverdue ? "#f87171" : statusStyle.color}`,
                          }}
                        >
                          <span className="truncate flex-1">{task.title}</span>
                          {progress !== null && (
                            <span className="ml-1 text-[9px] opacity-70">{progress}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {tasksWithDates.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm font-medium">No tasks with dates</div>
                <div className="text-xs mt-1">Add start dates or due dates to see them on the timeline</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
