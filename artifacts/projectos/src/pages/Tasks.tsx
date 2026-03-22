import { useState, useMemo, useCallback } from "react";
import { useTasks, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { useTaskComments, useCreateTaskComment } from "@/hooks/use-task-comments";
import { useActivityLog } from "@/hooks/use-activity";
import { useBulkTaskAction } from "@/hooks/use-bulk-tasks";
import { Card, Badge, Avatar, Button, Modal, Input, Textarea } from "@/components/ui/shared";
import {
  Plus, CheckCircle2, Clock, PlayCircle, Eye, AlertOctagon, MoreHorizontal, Sparkles,
  LayoutGrid, List, ChevronDown, ChevronRight, Calendar, Trash2, ArrowRight,
  Filter, Save, Bookmark, X, MessageSquare, Activity, Send, Repeat,
  Square, CheckSquare
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { useSearch } from "wouter";
import { formatDistanceToNow } from "date-fns";

const STATUSES = [
  { id: "backlog", label: "Backlog", icon: Clock, color: "text-slate-400", border: "border-slate-400", dot: "bg-slate-400" },
  { id: "todo", label: "To Do", icon: CheckCircle2, color: "text-blue-400", border: "border-blue-400", dot: "bg-blue-400" },
  { id: "inprogress", label: "In Progress", icon: PlayCircle, color: "text-primary", border: "border-primary", dot: "bg-primary" },
  { id: "review", label: "Review", icon: Eye, color: "text-amber-400", border: "border-amber-400", dot: "bg-amber-400" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-400", dot: "bg-emerald-400" },
  { id: "blocked", label: "Blocked", icon: AlertOctagon, color: "text-rose-400", border: "border-rose-400", dot: "bg-rose-400" },
];

const PRIORITY_MAP: Record<string, { color: string; icon: string }> = {
  critical: { color: "red", icon: "🔴" },
  high: { color: "yellow", icon: "🟡" },
  medium: { color: "blue", icon: "🔵" },
  low: { color: "gray", icon: "⚪" },
};

type SavedFilter = { name: string; projectId?: number; status?: string; priority?: string };

export default function Tasks() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const filterProjectId = params.get("projectId") ? parseInt(params.get("projectId")!, 10) : null;
  const filterMode = params.get("filter");

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();

  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [aiInput, setAiInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [modalTab, setModalTab] = useState<"details" | "comments" | "activity">("details");
  const [commentText, setCommentText] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-saved-filters") || "[]"); } catch { return []; }
  });
  const [filterName, setFilterName] = useState("");

  const updateTask = useUpdateTaskMutation();
  const createTask = useCreateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const bulkAction = useBulkTaskAction();

  const { data: comments = [] } = useTaskComments(formData?.id || null);
  const createComment = useCreateTaskComment();
  const { data: activityLogs = [] } = useActivityLog("task", formData?.id);

  const tasks = useMemo(() => {
    let filtered = allTasks;
    if (filterProjectId) filtered = filtered.filter(t => t.projectId === filterProjectId);
    if (filterMode === "overdue") filtered = filtered.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
    if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);
    if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);
    return filtered;
  }, [allTasks, filterProjectId, filterMode, filterStatus, filterPriority]);

  const handleDragStart = (e: React.DragEvent, id: number) => { e.dataTransfer.setData("taskId", id.toString()); };
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("taskId"), 10);
    if (id) updateTask.mutate({ id, data: { status: status as any } });
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const openTask = (task: any) => { setFormData(task); setIsNewTask(false); setModalTab("details"); setIsModalOpen(true); };
  const openNewTask = () => {
    setFormData({ title: "", type: "task", status: "todo", priority: "medium", projectId: projects[0]?.id || 1, points: 1, recurrence: null });
    setIsNewTask(true); setModalTab("details"); setIsModalOpen(true);
  };

  const saveTask = () => {
    if (isNewTask) {
      createTask.mutate({ data: formData as any }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      updateTask.mutate({ id: formData.id, data: formData }, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleAiCreate = () => {
    if (!aiInput) return;
    createTask.mutate({ data: { title: aiInput, type: "task", status: "todo", priority: "high", projectId: projects[0]?.id || 1, points: 3, tags: ["ai-generated"] } }, { onSuccess: () => setAiInput("") });
  };

  const toggleCollapse = (statusId: string) => { setCollapsed(prev => ({ ...prev, [statusId]: !prev[statusId] })); };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === tasks.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map(t => t.id)));
  };

  const handleBulkAction = (action: "delete" | "update", data?: Record<string, unknown>) => {
    bulkAction.mutate({ taskIds: Array.from(selectedIds), action, data }, { onSuccess: () => setSelectedIds(new Set()) });
  };

  const saveFilter = () => {
    if (!filterName) return;
    const f: SavedFilter = { name: filterName };
    if (filterStatus) f.status = filterStatus;
    if (filterPriority) f.priority = filterPriority;
    if (filterProjectId) f.projectId = filterProjectId;
    const updated = [...savedFilters, f];
    setSavedFilters(updated);
    localStorage.setItem("projectos-saved-filters", JSON.stringify(updated));
    setFilterName("");
  };

  const loadFilter = (f: SavedFilter) => {
    setFilterStatus(f.status || "");
    setFilterPriority(f.priority || "");
    if (f.projectId) {
      window.location.href = `${import.meta.env.BASE_URL}tasks?projectId=${f.projectId}${f.status ? `&status=${f.status}` : ""}`;
    }
  };

  const removeFilter = (idx: number) => {
    const updated = savedFilters.filter((_, i) => i !== idx);
    setSavedFilters(updated);
    localStorage.setItem("projectos-saved-filters", JSON.stringify(updated));
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !formData?.id) return;
    createComment.mutate({ taskId: formData.id, authorId: 1, content: commentText }, { onSuccess: () => setCommentText("") });
  };

  // ─── Calendar View ───
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [calendarMonth]);

  const renderCalendar = () => (
    <div className="pb-8 px-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <h3 className="font-display font-bold text-lg">{format(calendarMonth, "MMMM yyyy")}</h3>
        <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-xl overflow-hidden border border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-secondary/50 p-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
        ))}
        {calendarDays.map(day => {
          const dayTasks = tasks.filter(t => t.due && isSameDay(new Date(t.due), day));
          const inMonth = isSameMonth(day, calendarMonth);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`min-h-[100px] p-1.5 bg-card/60 ${!inMonth ? "opacity-30" : ""} ${today ? "ring-1 ring-primary ring-inset" : ""}`}>
              <div className={`text-xs font-mono mb-1 ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const isOverdue = t.status !== "done" && new Date(t.due!) < new Date();
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTask(t)}
                      className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate font-medium ${
                        isOverdue ? "bg-rose-500/20 text-rose-300" :
                        t.status === "done" ? "bg-emerald-500/15 text-emerald-400 line-through" :
                        "bg-primary/10 text-primary"
                      }`}
                    >
                      {t.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Kanban View ───
  const renderKanban = () => (
    <div className="flex gap-6 overflow-x-auto pb-8 h-full items-start px-2">
      {STATUSES.map(status => {
        const columnTasks = tasks.filter(t => t.status === status.id).sort((a, b) => a.sortOrder - b.sortOrder);
        const Icon = status.icon;
        return (
          <div key={status.id} className="flex flex-col w-[320px] shrink-0 max-h-full" onDrop={e => handleDrop(e, status.id)} onDragOver={handleDragOver}>
            <div className={`flex items-center gap-2 mb-4 px-1 ${status.color}`}>
              <Icon className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-wider text-xs">{status.label}</h3>
              <span className="ml-auto bg-secondary px-2 py-0.5 rounded-full text-xs font-mono text-muted-foreground">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 min-h-[150px]">
              {columnTasks.map(task => {
                const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
                return (
                  <Card key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} onClick={() => openTask(task)}
                    className={`p-4 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isOverdue ? "border-rose-500/50 shadow-rose-500/10" : ""}`}>
                    <div className="flex justify-between items-start mb-2">
                      <Badge color={task.priority === "critical" ? "red" : task.priority === "high" ? "yellow" : task.priority === "medium" ? "blue" : "gray"}>{task.priority}</Badge>
                      <div className="flex items-center gap-1">
                        {(task as any).recurrence && <Repeat className="w-3 h-3 text-primary" />}
                        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h4 className={`font-medium text-sm leading-snug mb-4 ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-xs font-mono text-muted-foreground">{task.points} pts</div>
                      <div className="flex -space-x-1">
                        {task.assigneeIds?.map((id: number) => { const m = members.find(m => m.id === id); return m ? <Avatar key={id} name={m.name} color={m.color} /> : null; })}
                      </div>
                    </div>
                  </Card>
                );
              })}
              <button onClick={openNewTask} className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── List View with Bulk Select ───
  const renderList = () => (
    <div className="space-y-4 pb-8 px-2">
      {STATUSES.map(status => {
        const group = tasks.filter(t => t.status === status.id);
        const isCollapsed = collapsed[status.id];
        const Icon = status.icon;
        return (
          <div key={status.id}>
            <button onClick={() => toggleCollapse(status.id)} className={`flex items-center gap-2 w-full px-2 py-2 ${status.color} cursor-pointer border-b border-border`}>
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="font-bold uppercase tracking-wider text-xs">{status.label}</span>
              <span className="ml-2 bg-secondary px-2 py-0.5 rounded-full text-xs font-mono text-muted-foreground">{group.length}</span>
            </button>
            {!isCollapsed && group.map(task => {
              const pr = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
              const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
              const isSelected = selectedIds.has(task.id);
              return (
                <div key={task.id} className={`grid gap-3 px-3 py-3 cursor-pointer items-center border-b border-border/20 hover:bg-white/5 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  style={{ gridTemplateColumns: "32px 1fr 80px 90px 80px 50px 24px" }}>
                  <button onClick={e => { e.stopPropagation(); toggleSelect(task.id); }} className="text-muted-foreground hover:text-foreground">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div onClick={() => openTask(task)} className={`text-sm font-medium truncate flex items-center gap-2 ${task.status === "done" ? "line-through text-muted-foreground opacity-50" : ""}`}>
                    {task.title}
                    {(task as any).recurrence && <Repeat className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <div className="flex -space-x-1">
                    {task.assigneeIds?.slice(0, 2).map((id: number) => { const m = members.find(m => m.id === id); return m ? <Avatar key={id} name={m.name} color={m.color} /> : null; })}
                  </div>
                  <Badge color={pr.color}>{pr.icon} {task.priority}</Badge>
                  <div className={`text-xs font-mono ${isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"}`}>{task.due ? format(new Date(task.due), "MMM d") : "-"}</div>
                  <div className="text-xs font-mono text-muted-foreground">{task.points}</div>
                  <div />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ─── Bulk Action Bar ───
  const renderBulkBar = () => {
    if (selectedIds.size === 0) return null;
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
        <div className="h-6 w-px bg-border" />
        <select onChange={e => { if (e.target.value) handleBulkAction("update", { status: e.target.value }); e.target.value = ""; }}
          className="bg-secondary text-sm rounded-lg px-2 py-1 border border-border text-foreground">
          <option value="">Move to...</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select onChange={e => { if (e.target.value) handleBulkAction("update", { priority: e.target.value }); e.target.value = ""; }}
          className="bg-secondary text-sm rounded-lg px-2 py-1 border border-border text-foreground">
          <option value="">Set priority...</option>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <button onClick={() => handleBulkAction("delete")} className="flex items-center gap-1 text-sm text-rose-400 hover:text-rose-300 font-medium">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <button onClick={() => setSelectedIds(new Set())} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col pt-6 max-w-[1600px] mx-auto w-full px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              {filterMode === "overdue" ? "Overdue Tasks" : filterProjectId ? `${projects.find(p => p.id === filterProjectId)?.name || "Project"} Tasks` : "Tasks"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {filterMode === "overdue" ? `${tasks.length} overdue tasks requiring attention.` : filterProjectId ? `Showing tasks for ${projects.find(p => p.id === filterProjectId)?.name || "selected project"}.` : "Manage and track your project tasks."}
            </p>
          </div>
          <div className="flex bg-secondary/50 border border-border rounded-xl p-1">
            {([
              { key: "kanban", icon: LayoutGrid, label: "Board" },
              { key: "list", icon: List, label: "List" },
              { key: "calendar", icon: Calendar, label: "Calendar" },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${viewMode === v.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <v.icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilterBar(!showFilterBar)} className={`p-2 rounded-xl border border-border transition-colors ${showFilterBar ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
            <Filter className="w-4 h-4" />
          </button>
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Sparkles className="w-4 h-4 text-primary" /></div>
            <Input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAiCreate()} placeholder="AI: 'fix auth bug critical due friday'" className="pl-10" />
          </div>
          <Button onClick={openNewTask}><Plus className="w-4 h-4" /> New</Button>
        </div>
      </div>

      {showFilterBar && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/30 rounded-xl border border-border/50 shrink-0 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-background text-sm rounded-lg px-3 py-1.5 border border-border text-foreground">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-background text-sm rounded-lg px-3 py-1.5 border border-border text-foreground">
            <option value="">All Priorities</option>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          {(filterStatus || filterPriority) && (
            <button onClick={() => { setFilterStatus(""); setFilterPriority(""); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <div className="h-6 w-px bg-border" />
          <Input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Save as..." className="w-32 !py-1 !text-xs" />
          <button onClick={saveFilter} disabled={!filterName} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-30">
            <Save className="w-3 h-3" /> Save
          </button>
          {savedFilters.length > 0 && (
            <>
              <div className="h-6 w-px bg-border" />
              {savedFilters.map((f, i) => (
                <div key={i} className="flex items-center gap-1">
                  <button onClick={() => loadFilter(f)} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary/20 font-medium flex items-center gap-1">
                    <Bookmark className="w-3 h-3" /> {f.name}
                  </button>
                  <button onClick={() => removeFilter(i)} className="text-muted-foreground hover:text-rose-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {viewMode === "list" && (
        <div className="flex items-center gap-3 mb-2 px-2 shrink-0">
          <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium">
            {selectedIds.size === tasks.length && tasks.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : viewMode === "kanban" ? renderKanban() : viewMode === "list" ? renderList() : renderCalendar()}
      </div>

      {renderBulkBar()}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isNewTask ? "Create Task" : "Edit Task"} maxWidth="max-w-2xl">
        <div className="flex gap-1 mb-6 border-b border-border pb-3">
          {(["details", "comments", "activity"] as const).map(tab => (
            <button key={tab} onClick={() => setModalTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize flex items-center gap-1.5 transition-colors ${modalTab === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "details" && <LayoutGrid className="w-3.5 h-3.5" />}
              {tab === "comments" && <MessageSquare className="w-3.5 h-3.5" />}
              {tab === "activity" && <Activity className="w-3.5 h-3.5" />}
              {tab} {tab === "comments" && !isNewTask && <span className="ml-1 bg-secondary rounded-full px-1.5 text-[10px]">{comments.length}</span>}
            </button>
          ))}
        </div>

        {modalTab === "details" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
              <Input value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} className="text-lg font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
                <select value={formData.status || "todo"} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</label>
                <select value={formData.priority || "medium"} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Project</label>
                <select value={formData.projectId || ""} onChange={e => setFormData({ ...formData, projectId: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Points</label>
                <select value={formData.points || 1} onChange={e => setFormData({ ...formData, points: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {[1, 2, 3, 5, 8, 13].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Due Date</label>
                <Input type="date" value={formData.due ? format(new Date(formData.due), "yyyy-MM-dd") : ""} onChange={e => setFormData({ ...formData, due: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Recurrence</label>
                <select value={formData.recurrence?.type || ""} onChange={e => {
                  if (!e.target.value) setFormData({ ...formData, recurrence: null });
                  else setFormData({ ...formData, recurrence: { type: e.target.value, interval: 1 } });
                }} className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Assignees</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => {
                  const isAssigned = (formData.assigneeIds || []).includes(m.id);
                  return (
                    <button key={m.id} onClick={() => {
                      const ids = formData.assigneeIds || [];
                      setFormData({ ...formData, assigneeIds: isAssigned ? ids.filter((i: number) => i !== m.id) : [...ids, m.id] });
                    }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isAssigned ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                      <Avatar name={m.name} color={m.color} /> {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
              <Textarea value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Add context, links, or details here..." />
            </div>
            <div className="flex justify-between items-center mt-8">
              {!isNewTask && (
                <button onClick={() => { deleteTask.mutate({ id: formData.id }); setIsModalOpen(false); }} className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={saveTask} isLoading={createTask.isPending || updateTask.isPending}>
                  {isNewTask ? "Create Task" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {modalTab === "comments" && !isNewTask && (
          <div className="space-y-4">
            <div className="max-h-72 overflow-y-auto space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No comments yet. Start the conversation!</p>
                </div>
              ) : (
                comments.map((c: any) => {
                  const author = members.find(m => m.id === c.authorId);
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={author?.name || "User"} color={author?.color || "#6366f1"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{author?.name || "User"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <Input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddComment()}
                placeholder="Write a comment..." className="flex-1" />
              <Button onClick={handleAddComment} disabled={!commentText.trim()} size="icon"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {modalTab === "activity" && !isNewTask && (
          <div className="max-h-96 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log: any) => {
                  const actor = members.find(m => m.id === log.actorId);
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">{actor?.name || "System"}</span>{" "}
                          <span className="text-muted-foreground">{log.action.replace(/_/g, " ")}</span>
                        </p>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
