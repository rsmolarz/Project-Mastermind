import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Card, Avatar, Badge, Input } from "@/components/ui/shared";
import {
  Layers, Search, Filter, ChevronDown, ChevronRight, CheckCircle2, Clock, PlayCircle,
  Eye, AlertOctagon, Calendar, BarChart3, List, LayoutGrid
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUSES = [
  { id: "backlog", label: "Backlog", color: "text-slate-400", dot: "bg-slate-400" },
  { id: "todo", label: "To Do", color: "text-blue-400", dot: "bg-blue-400" },
  { id: "inprogress", label: "In Progress", color: "text-primary", dot: "bg-primary" },
  { id: "review", label: "Review", color: "text-amber-400", dot: "bg-amber-400" },
  { id: "done", label: "Done", color: "text-emerald-400", dot: "bg-emerald-400" },
  { id: "blocked", label: "Blocked", color: "text-rose-400", dot: "bg-rose-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high: "bg-amber-500/15 text-amber-400",
  medium: "bg-blue-500/15 text-blue-400",
  low: "bg-slate-500/15 text-slate-400",
};

export default function Everything() {
  const { data: tasksData, isLoading } = useTasks();
  const { data: projectsData } = useProjects();
  const { data: membersData } = useMembers();
  const allTasks = (tasksData as any)?.tasks || tasksData || [];
  const projects = (projectsData as any)?.projects || projectsData || [];
  const members = (membersData as any)?.members || membersData || [];

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"project" | "status" | "priority" | "assignee">("project");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = useMemo(() => {
    let result = allTasks.filter((t: any) => !t.deletedAt);
    if (!showCompleted) result = result.filter((t: any) => t.status !== "done");
    if (filterStatus !== "all") result = result.filter((t: any) => t.status === filterStatus);
    if (filterPriority !== "all") result = result.filter((t: any) => t.priority === filterPriority);
    if (search) result = result.filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [allTasks, search, filterStatus, filterPriority, showCompleted]);

  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; color?: string; tasks: any[] }> = {};
    filtered.forEach((task: any) => {
      let key: string, label: string, color: string | undefined;
      if (groupBy === "project") {
        const p = projects.find((pr: any) => pr.id === task.projectId);
        key = `p-${task.projectId}`;
        label = p?.name || "No Project";
        color = p?.color;
      } else if (groupBy === "status") {
        const s = STATUSES.find(s => s.id === task.status);
        key = task.status;
        label = s?.label || task.status;
      } else if (groupBy === "priority") {
        key = task.priority || "medium";
        label = (task.priority || "medium").charAt(0).toUpperCase() + (task.priority || "medium").slice(1);
      } else {
        const assigneeId = (task.assigneeIds || [])[0];
        const m = members.find((m: any) => m.id === assigneeId);
        key = assigneeId ? `m-${assigneeId}` : "unassigned";
        label = m?.name || "Unassigned";
      }
      if (!groups[key]) groups[key] = { label, color, tasks: [] };
      groups[key].tasks.push(task);
    });
    return groups;
  }, [filtered, groupBy, projects, members]);

  const toggleGroup = (key: string) => {
    const next = new Set(collapsedGroups);
    next.has(key) ? next.delete(key) : next.add(key);
    setCollapsedGroups(next);
  };

  const totalTasks = allTasks.filter((t: any) => !t.deletedAt).length;
  const completedTasks = allTasks.filter((t: any) => t.status === "done" && !t.deletedAt).length;
  const inProgressTasks = allTasks.filter((t: any) => t.status === "inprogress" && !t.deletedAt).length;
  const overdueTasks = allTasks.filter((t: any) => t.due && new Date(t.due) < new Date() && t.status !== "done" && !t.deletedAt).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Everything</h1>
            <p className="text-sm text-muted-foreground">All tasks across every project in one view</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{totalTasks}</div>
          <div className="text-xs text-muted-foreground">Total Tasks</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{inProgressTasks}</div>
          <div className="text-xs text-muted-foreground">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{completedTasks}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-rose-400">{overdueTasks}</div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all tasks..." className="pl-10" />
        </div>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
          className="px-3 py-2 bg-card border border-border rounded-xl text-sm">
          <option value="project">Group by Project</option>
          <option value="status">Group by Status</option>
          <option value="priority">Group by Priority</option>
          <option value="assignee">Group by Assignee</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-xl text-sm">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-xl text-sm">
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="rounded" />
          Show completed
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, group]) => {
            const isCollapsed = collapsedGroups.has(key);
            return (
              <Card key={key} className="overflow-hidden">
                <button onClick={() => toggleGroup(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  {group.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
                  <span className="font-bold text-sm">{group.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}</span>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-border">
                    {group.tasks.map((task: any) => {
                      const statusInfo = STATUSES.find(s => s.id === task.status);
                      const project = projects.find((p: any) => p.id === task.projectId);
                      const assignees = (task.assigneeIds || []).map((id: number) => members.find((m: any) => m.id === id)).filter(Boolean);
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${statusInfo?.dot || "bg-slate-400"}`} />
                          <span className="text-sm flex-1 truncate">{task.title}</span>
                          {task.priority && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                              {task.priority}
                            </span>
                          )}
                          {groupBy !== "project" && project && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                              <span className="text-[10px] text-muted-foreground">{project.name}</span>
                            </div>
                          )}
                          {task.due && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.due), "MMM d")}
                            </span>
                          )}
                          <div className="flex -space-x-1 shrink-0">
                            {assignees.slice(0, 3).map((m: any) => (
                              <Avatar key={m.id} name={m.name} color={m.color} />
                            ))}
                          </div>
                          {task.points && (
                            <span className="text-[10px] font-mono text-muted-foreground w-6 text-center">{task.points}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No tasks found</p>
              <p className="text-sm mt-1">Try adjusting your filters or create some tasks first.</p>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-[10px] text-muted-foreground">
        Showing {filtered.length} of {totalTasks} tasks across {projects.length} projects
      </div>
    </div>
  );
}
