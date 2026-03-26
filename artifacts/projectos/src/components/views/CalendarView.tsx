import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays, differenceInDays, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, List as ListIcon } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-slate-500/20 text-slate-300 border-l-slate-400",
  todo: "bg-blue-500/20 text-blue-300 border-l-blue-400",
  inprogress: "bg-violet-500/20 text-violet-300 border-l-violet-400",
  review: "bg-amber-500/20 text-amber-300 border-l-amber-400",
  done: "bg-emerald-500/15 text-emerald-400 border-l-emerald-400",
  blocked: "bg-rose-500/20 text-rose-300 border-l-rose-400",
};

type Props = {
  tasks: any[];
  projects: any[];
  members: any[];
  onTaskClick: (task: any) => void;
};

export default function CalendarView({ tasks, projects, members, onTaskClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewType, setViewType] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const weekStart = useMemo(() => startOfWeek(currentMonth), [currentMonth]);

  const days = useMemo(() => {
    if (viewType === "week") {
      return eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });
    }
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [currentMonth, viewType, weekStart]);

  const getTasksForDay = (day: Date) => {
    return tasks.filter(t => {
      if (t.due && isSameDay(new Date(t.due), day)) return true;
      if (t.startDate && isSameDay(new Date(t.startDate), day)) return true;
      if (t.startDate && t.due) {
        const start = new Date(t.startDate);
        const end = new Date(t.due);
        return isWithinInterval(day, { start, end });
      }
      return false;
    });
  };

  const getMultiDayTasks = () => {
    return tasks.filter(t => t.startDate && t.due && differenceInDays(new Date(t.due), new Date(t.startDate)) > 0);
  };

  const isTaskStart = (task: any, day: Date) => task.startDate && isSameDay(new Date(task.startDate), day);
  const isTaskEnd = (task: any, day: Date) => task.due && isSameDay(new Date(task.due), day);
  const isTaskMiddle = (task: any, day: Date) => {
    if (!task.startDate || !task.due) return false;
    return isWithinInterval(day, { start: new Date(task.startDate), end: new Date(task.due) }) && !isTaskStart(task, day) && !isTaskEnd(task, day);
  };

  const navigate = (dir: number) => {
    if (viewType === "week") {
      setCurrentMonth(m => addDays(m, dir * 7));
    } else {
      setCurrentMonth(m => dir > 0 ? addMonths(m, 1) : subMonths(m, 1));
    }
  };

  const dayTasksModal = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="pb-8 px-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">Today</button>
          <button onClick={() => navigate(1)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h3 className="font-display font-bold text-lg ml-2">
            {viewType === "week"
              ? `${format(weekStart, "MMM d")} – ${format(endOfWeek(weekStart), "MMM d, yyyy")}`
              : format(currentMonth, "MMMM yyyy")}
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1">
          <button onClick={() => setViewType("month")}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${viewType === "month" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-3 h-3" /> Month
          </button>
          <button onClick={() => setViewType("week")}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${viewType === "week" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <ListIcon className="w-3 h-3" /> Week
          </button>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-secondary/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="p-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">{d}</div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-px bg-border/20`}>
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`${viewType === "week" ? "min-h-[200px]" : "min-h-[110px]"} p-1.5 bg-card/60 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                  !inMonth && viewType === "month" ? "opacity-30" : ""
                } ${today ? "ring-2 ring-primary ring-inset bg-primary/[0.03]" : ""} ${isWeekend && viewType === "month" ? "bg-secondary/20" : ""}`}>
                <div className={`text-xs font-mono mb-1 flex items-center justify-between ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  <span>{format(day, viewType === "week" ? "EEE d" : "d")}</span>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{dayTasks.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, viewType === "week" ? 8 : 3).map(t => {
                    const isOverdue = t.status !== "done" && t.due && new Date(t.due) < new Date();
                    const statusColor = STATUS_COLORS[t.status] || STATUS_COLORS.todo;
                    const project = projects.find(p => p.id === t.projectId);
                    const isStart = isTaskStart(t, day);
                    const isEnd = isTaskEnd(t, day);
                    const isMid = isTaskMiddle(t, day);

                    return (
                      <div
                        key={`${t.id}-${day.toISOString()}`}
                        onClick={e => { e.stopPropagation(); onTaskClick(t); }}
                        className={`text-[10px] px-1.5 py-0.5 cursor-pointer truncate font-medium border-l-2 ${
                          isOverdue ? "bg-rose-500/20 text-rose-300 border-l-rose-400" :
                          t.status === "done" ? "bg-emerald-500/15 text-emerald-400 border-l-emerald-400 line-through" :
                          statusColor
                        } ${isMid ? "rounded-none mx-0" : isStart ? "rounded-l mx-0" : isEnd ? "rounded-r mx-0" : "rounded"}`}
                      >
                        {isMid ? "" : t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > (viewType === "week" ? 8 : 3) && (
                    <div className="text-[10px] text-primary pl-1 font-medium">+{dayTasks.length - (viewType === "week" ? 8 : 3)} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && dayTasksModal.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedDay(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[400px] max-h-[500px] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">{format(selectedDay, "EEEE, MMMM d")}</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">{dayTasksModal.length} tasks</span>
            </div>
            <div className="space-y-2">
              {dayTasksModal.map(t => {
                const project = projects.find(p => p.id === t.projectId);
                const isOverdue = t.status !== "done" && t.due && new Date(t.due) < new Date();
                return (
                  <div key={t.id} onClick={() => { setSelectedDay(null); onTaskClick(t); }}
                    className="p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-colors bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[t.status]?.split(" ")[0].replace("bg-", "bg-") || "bg-gray-400"}`} 
                        style={{ backgroundColor: t.status === "done" ? "#34d399" : t.status === "inprogress" ? "#a78bfa" : t.status === "blocked" ? "#f87171" : "#60a5fa" }} />
                      <span className="text-xs font-medium capitalize text-muted-foreground">{t.status}</span>
                      {project && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </span>
                      )}
                    </div>
                    <h4 className={`font-medium text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.due && (
                        <span className={`text-[10px] font-mono ${isOverdue ? "text-rose-400" : "text-muted-foreground"}`}>
                          Due: {format(new Date(t.due), "MMM d")}
                        </span>
                      )}
                      {t.startDate && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Start: {format(new Date(t.startDate), "MMM d")}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.points}pt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
