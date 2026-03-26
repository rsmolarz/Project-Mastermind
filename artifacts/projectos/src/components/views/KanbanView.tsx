import { useState, useMemo } from "react";
import { Card, Badge, Avatar } from "@/components/ui/shared";
import { Plus, MoreHorizontal, Repeat, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUSES = [
  { id: "backlog", label: "Backlog", color: "text-slate-400", dot: "bg-slate-400", border: "border-slate-400/30" },
  { id: "todo", label: "To Do", color: "text-blue-400", dot: "bg-blue-400", border: "border-blue-400/30" },
  { id: "inprogress", label: "In Progress", color: "text-violet-400", dot: "bg-violet-400", border: "border-violet-400/30" },
  { id: "review", label: "Review", color: "text-amber-400", dot: "bg-amber-400", border: "border-amber-400/30" },
  { id: "done", label: "Done", color: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-400/30" },
  { id: "blocked", label: "Blocked", color: "text-rose-400", dot: "bg-rose-400", border: "border-rose-400/30" },
];

const PRIORITY_MAP: Record<string, { color: string; icon: string; badge: string }> = {
  critical: { color: "red", icon: "🔴", badge: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
  high: { color: "yellow", icon: "🟡", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  medium: { color: "blue", icon: "🔵", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  low: { color: "gray", icon: "⚪", badge: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
};

type Props = {
  tasks: any[];
  projects: any[];
  members: any[];
  onTaskClick: (task: any) => void;
  onNewTask: () => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  wipLimits?: Record<string, number>;
};

export default function KanbanView({ tasks, projects, members, onTaskClick, onNewTask, onDragStart, onDrop, onDragOver, wipLimits = {} }: Props) {
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [swimlane, setSwimlane] = useState<"none" | "project" | "priority">("none");

  const getProjectGroups = (statusTasks: any[]) => {
    if (swimlane === "none") return [{ label: null, tasks: statusTasks, color: null }];
    if (swimlane === "project") {
      const groups: Record<number, any[]> = {};
      statusTasks.forEach(t => {
        if (!groups[t.projectId]) groups[t.projectId] = [];
        groups[t.projectId].push(t);
      });
      return Object.entries(groups).map(([pid, tasks]) => {
        const p = projects.find(p => p.id === parseInt(pid));
        return { label: p?.name || "Unknown", tasks, color: p?.color || "#888" };
      });
    }
    const groups: Record<string, any[]> = {};
    statusTasks.forEach(t => {
      if (!groups[t.priority]) groups[t.priority] = [];
      groups[t.priority].push(t);
    });
    return ["critical", "high", "medium", "low"].filter(p => groups[p]).map(p => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      tasks: groups[p],
      color: null,
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3 px-2 shrink-0">
        <span className="text-xs text-muted-foreground font-medium">Swimlanes:</span>
        <div className="flex bg-secondary/50 border border-border rounded-lg p-0.5">
          {(["none", "project", "priority"] as const).map(s => (
            <button key={s} onClick={() => setSwimlane(s)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-colors ${swimlane === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "none" ? "Off" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-8 flex-1 items-start px-2">
        {STATUSES.map(status => {
          const columnTasks = tasks.filter(t => t.status === status.id).sort((a, b) => a.sortOrder - b.sortOrder);
          const isCollapsed = collapsedCols[status.id];
          const wipLimit = wipLimits[status.id];
          const isOverWip = wipLimit ? columnTasks.length > wipLimit : false;
          const groups = getProjectGroups(columnTasks);

          if (isCollapsed) {
            return (
              <div key={status.id} className="w-[44px] shrink-0 flex flex-col items-center bg-secondary/30 border border-border rounded-xl py-3 px-1 cursor-pointer hover:bg-secondary/50"
                onClick={() => setCollapsedCols(p => ({ ...p, [status.id]: false }))}>
                <div className={`w-2.5 h-2.5 rounded-full ${status.dot} mb-2`} />
                <span className="text-xs font-bold text-muted-foreground [writing-mode:vertical-lr] rotate-180">{status.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground mt-2">{columnTasks.length}</span>
              </div>
            );
          }

          return (
            <div key={status.id} className="flex flex-col w-[300px] shrink-0 max-h-full"
              onDrop={e => onDrop(e, status.id)} onDragOver={onDragOver}>
              <div className={`flex items-center gap-2 mb-3 px-1`}>
                <button onClick={() => setCollapsedCols(p => ({ ...p, [status.id]: true }))} className="text-muted-foreground hover:text-foreground">
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                <h3 className={`font-bold uppercase tracking-wider text-xs ${status.color}`}>{status.label}</h3>
                <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-full ${isOverWip ? "bg-rose-500/20 text-rose-400" : "bg-secondary text-muted-foreground"}`}>
                  {columnTasks.length}{wipLimit ? `/${wipLimit}` : ""}
                </span>
              </div>

              {isOverWip && (
                <div className="mb-2 px-2 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-400 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> WIP limit exceeded
                </div>
              )}

              <div className="flex flex-col gap-2 overflow-y-auto pr-1 min-h-[120px]">
                {groups.map((group, gi) => (
                  <div key={gi}>
                    {group.label && (
                      <div className="flex items-center gap-2 mb-1.5 mt-1">
                        {group.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />}
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                      </div>
                    )}
                    {group.tasks.map(task => {
                      const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
                      const pr = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                      const project = projects.find(p => p.id === task.projectId);
                      const subtaskProgress = task.subtasks?.length > 0
                        ? Math.round((task.subtasks.filter((s: any) => s.done).length / task.subtasks.length) * 100)
                        : null;
                      const ageHours = Math.round((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60));
                      const ageDays = Math.floor(ageHours / 24);

                      return (
                        <Card key={task.id} draggable onDragStart={e => onDragStart(e, task.id)}
                          onClick={() => onTaskClick(task)}
                          className={`p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-black/10 ${
                            isOverdue ? "border-rose-500/40 shadow-rose-500/5" : ""
                          }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pr.badge}`}>{task.priority}</span>
                              {task.type !== "task" && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{task.type}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {(task as any).recurrence && <Repeat className="w-3 h-3 text-primary" />}
                              {task.points > 0 && <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{task.points}pt</span>}
                            </div>
                          </div>

                          <h4 className={`font-medium text-sm leading-snug mb-2 ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </h4>

                          {task.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">#{tag}</span>
                              ))}
                              {task.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>}
                            </div>
                          )}

                          {subtaskProgress !== null && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground">Subtasks</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{subtaskProgress}%</span>
                              </div>
                              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center gap-2">
                              {task.due && (
                                <div className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue ? "text-rose-400" : "text-muted-foreground"}`}>
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(task.due), "MMM d")}
                                </div>
                              )}
                              {project && (
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{project.name}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex -space-x-1">
                              {(task.assigneeIds || []).slice(0, 3).map((id: number) => {
                                const m = members.find(m => m.id === id);
                                if (!m) return null;
                                return (
                                  <div key={id} className="w-6 h-6 rounded-full border-2 border-card text-[9px] font-bold text-white flex items-center justify-center"
                                    style={{ backgroundColor: m.color }} title={m.name}>
                                    {m.name?.charAt(0)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {ageDays > 7 && task.status !== "done" && (
                            <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1 text-[10px] text-amber-400/70">
                              <Clock className="w-3 h-3" />
                              {ageDays}d old
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ))}

                <button onClick={onNewTask}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-xs font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
