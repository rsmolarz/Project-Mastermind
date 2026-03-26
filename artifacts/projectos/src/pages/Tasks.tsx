import { useState, useMemo, useCallback, useEffect } from "react";
import { useTasks, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { useTaskComments, useCreateTaskComment } from "@/hooks/use-task-comments";
import { useActivityLog } from "@/hooks/use-activity";
import { useBulkTaskAction } from "@/hooks/use-bulk-tasks";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Card, Badge, Avatar, Button, Modal, Input, Textarea } from "@/components/ui/shared";
import {
  Plus, CheckCircle2, Clock, PlayCircle, Eye, AlertOctagon, MoreHorizontal, Sparkles,
  LayoutGrid, List, ChevronDown, ChevronRight, Calendar, Trash2, ArrowRight,
  Filter, Save, Bookmark, X, MessageSquare, Activity, Send, Repeat,
  Square, CheckSquare, Table, Image, Map, Inbox, GanttChart, Smile, ListChecks,
  Copy, Archive, Link2, Paperclip, Upload, Minimize2, Bell, UserPlus
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { useSearch } from "wouter";
import { formatDistanceToNow } from "date-fns";
import TimelineView from "@/components/views/TimelineView";
import KanbanView from "@/components/views/KanbanView";
import CalendarView from "@/components/views/CalendarView";
import MapView from "@/components/views/MapView";
import WorkloadBoardView from "@/components/views/WorkloadBoardView";
import { MapPin, Users as UsersIcon, Layers, BarChart3, FileText, PieChart, Bug, Lightbulb, BookOpen, Wrench, ClockIcon, File, ImageIcon } from "lucide-react";

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

const TASK_TYPES = [
  { id: "task", label: "Task", icon: "📋", color: "text-blue-400" },
  { id: "bug", label: "Bug", icon: "🐛", color: "text-rose-400" },
  { id: "feature", label: "Feature", icon: "✨", color: "text-emerald-400" },
  { id: "story", label: "Story", icon: "📖", color: "text-violet-400" },
  { id: "improvement", label: "Improvement", icon: "🔧", color: "text-amber-400" },
];

type SavedFilter = { name: string; projectId?: number; status?: string; priority?: string };

export default function Tasks() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const filterProjectId = params.get("projectId") ? parseInt(params.get("projectId")!, 10) : null;
  const filterMode = params.get("filter");

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();

  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar" | "table" | "gallery" | "roadmap" | "triage" | "gantt" | "timeline" | "map" | "workload" | "chart" | "brief" | "files" | "embed">("kanban");
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedUrlInput, setEmbedUrlInput] = useState("");
  const [taskTemplates, setTaskTemplates] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-task-templates") || "[]"); } catch { return []; }
  });
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [taskChecklists, setTaskChecklists] = useState<Record<number, { id: number; text: string; done: boolean }[]>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-task-checklists") || "{}"); } catch { return {}; }
  });
  const [taskWatchers, setTaskWatchers] = useState<Record<number, number[]>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-task-watchers") || "{}"); } catch { return {}; }
  });
  const [taskReminders, setTaskReminders] = useState<Record<number, string>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-task-reminders") || "{}"); } catch { return {}; }
  });
  const [commentAssignments, setCommentAssignments] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-comment-assignments") || "{}"); } catch { return {}; }
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [aiInput, setAiInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [modalTab, setModalTab] = useState<"details" | "comments" | "activity">("details");
  const [commentText, setCommentText] = useState("");
  const [commentReactions, setCommentReactions] = useState<Record<number, Record<string, number>>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-comment-reactions") || "{}"); } catch { return {}; }
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const REACTION_EMOJIS = ["👍", "❤️", "🎉", "😄", "🔥", "👀", "💯", "🚀"];

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

  const queryClient = useQueryClient();
  const { data: comments = [] } = useTaskComments(formData?.id || null);
  const createComment = useCreateTaskComment();
  const { data: activityLogs = [] } = useActivityLog("task", formData?.id);

  const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
  const apiFetch = (path: string, opts?: RequestInit) =>
    fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } }).then(r => r.json());

  const { data: taskAttachments = [] } = useQuery({
    queryKey: ["task-attachments", formData?.id],
    queryFn: () => apiFetch(`/tasks/${formData.id}/attachments`),
    enabled: !!formData?.id && !isNewTask,
  });

  const { data: taskLinks = [] } = useQuery({
    queryKey: ["task-links", formData?.id],
    queryFn: () => apiFetch(`/tasks/${formData.id}/links`),
    enabled: !!formData?.id && !isNewTask,
  });

  const duplicateTask = useMutation({
    mutationFn: (id: number) => apiFetch(`/tasks/${id}/duplicate`, { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setFormData(data);
      setIsNewTask(false);
    },
  });

  const archiveTask = useMutation({
    mutationFn: (id: number) => apiFetch(`/tasks/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsModalOpen(false);
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: number; file: File }) => {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      return apiFetch(`/tasks/${taskId}/attachments`, {
        method: "POST",
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data: base64 }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-attachments", formData?.id] }),
  });

  const deleteAttachment = useMutation({
    mutationFn: (id: number) => apiFetch(`/task-attachments/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-attachments", formData?.id] }),
  });

  const createTaskLink = useMutation({
    mutationFn: (data: { sourceTaskId: number; targetTaskId: number; linkType: string }) =>
      apiFetch("/task-links", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-links", formData?.id] }),
  });

  const deleteTaskLink = useMutation({
    mutationFn: (id: number) => apiFetch(`/task-links/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-links", formData?.id] }),
  });

  const { data: taskDeps = { blocking: [], blockedBy: [] } } = useQuery({
    queryKey: ["task-deps", formData?.id],
    queryFn: () => apiFetch(`/tasks/${formData.id}/dependencies`),
    enabled: !!formData?.id && !isNewTask,
  });

  const createDep = useMutation({
    mutationFn: (data: { taskId: number; dependsOnId: number }) =>
      apiFetch("/task-dependencies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-deps", formData?.id] }),
  });

  const deleteDep = useMutation({
    mutationFn: (id: number) => apiFetch(`/task-dependencies/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-deps", formData?.id] }),
  });

  const { data: taskProjects = [] } = useQuery({
    queryKey: ["task-projects", formData?.id],
    queryFn: () => apiFetch(`/tasks/${formData.id}/projects`),
    enabled: !!formData?.id && !isNewTask,
  });

  const addTaskProject = useMutation({
    mutationFn: (data: { taskId: number; projectId: number }) =>
      apiFetch("/task-projects", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-projects", formData?.id] }),
  });

  const removeTaskProject = useMutation({
    mutationFn: (id: number) => apiFetch(`/task-projects/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-projects", formData?.id] }),
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: () => apiFetch("/custom-fields"),
  });

  const { data: customFieldValues = [] } = useQuery({
    queryKey: ["custom-field-values", formData?.id],
    queryFn: () => apiFetch(`/custom-field-values?entityType=task&entityId=${formData.id}`),
    enabled: !!formData?.id && !isNewTask,
  });

  const saveFieldValue = useMutation({
    mutationFn: (data: { fieldId: number; entityId: number; value: string }) =>
      apiFetch("/custom-field-values", { method: "POST", body: JSON.stringify({ ...data, entityType: "task" }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-field-values", formData?.id] }),
  });

  const [showDepPicker, setShowDepPicker] = useState<"blocks" | "blockedBy" | null>(null);
  const [depSearch, setDepSearch] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState<string | false>(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [proofingAttachment, setProofingAttachment] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Array<{ id: number; attachmentId: number; x: number; y: number; text: string; author: string; createdAt: string }>>([]);
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee" | "group" | "none">("status");

  const subItems = useMemo(() => {
    if (!formData?.id) return [];
    return allTasks.filter(t => t.parentTaskId === formData.id);
  }, [allTasks, formData?.id]);

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

  const openTask = useCallback((task: any) => { setFormData(task); setIsNewTask(false); setModalTab("details"); setIsModalOpen(true); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const taskId = (e as CustomEvent).detail?.id;
      if (taskId) {
        const task = allTasks.find((t: any) => t.id === taskId);
        if (task) openTask(task);
        window.dispatchEvent(new CustomEvent("task-tray-remove", { detail: { id: taskId } }));
      }
    };
    window.addEventListener("task-tray-open", handler);
    return () => window.removeEventListener("task-tray-open", handler);
  }, [allTasks, openTask]);
  const openNewTask = () => {
    setFormData({ title: "", type: "task", status: "todo", priority: "medium", projectId: projects[0]?.id || 1, points: 1, recurrence: null });
    setIsNewTask(true); setModalTab("details"); setIsModalOpen(true);
  };

  const saveTask = () => {
    if (isNewTask) {
      createTask.mutate({ data: formData as any }, { onSuccess: (created: any) => {
        const newItems = taskChecklists["new"];
        if (newItems?.length > 0 && created?.id) {
          const next = { ...taskChecklists, [created.id]: newItems };
          delete next["new"];
          setTaskChecklists(next);
          localStorage.setItem("projectos-task-checklists", JSON.stringify(next));
        }
        setIsModalOpen(false);
      }});
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

  // ─── Table View ───
  const renderTable = () => (
    <div className="pb-8 px-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider w-8">
              <button onClick={selectAll}>{selectedIds.size === tasks.length && tasks.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}</button>
            </th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">ID</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Project</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignee</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Points</th>
            <th className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const assignees = members.filter(m => (task.assigneeIds as number[])?.includes(m.id));
            const status = STATUSES.find(s => s.id === task.status);
            const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
            const prefix = project?.name === "API Gateway" ? "API" : project?.name === "Mobile App" ? "MOB" : "WEB";
            return (
              <tr key={task.id} onClick={() => openTask(task)} className={`border-b border-border/30 hover:bg-white/5 cursor-pointer transition-colors ${selectedIds.has(task.id) ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleSelect(task.id); }}>
                  {selectedIds.has(task.id) ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{prefix}-{String(task.id).padStart(3, "0")}</td>
                <td className="px-3 py-2.5 font-medium max-w-[300px] truncate">{task.title}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${status?.color || ""}`}>
                    <div className={`w-2 h-2 rounded-full ${status?.dot || ""}`} /> {status?.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs">{PRIORITY_MAP[task.priority]?.icon} {task.priority}</span>
                </td>
                <td className="px-3 py-2.5 text-xs">{project && <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}</td>
                <td className="px-3 py-2.5">
                  <div className="flex -space-x-1">{assignees.slice(0, 2).map(m => <Avatar key={m.id} name={m.name} color={m.color} />)}</div>
                </td>
                <td className="px-3 py-2.5 text-xs font-mono">{task.points || "-"}</td>
                <td className={`px-3 py-2.5 text-xs ${isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"}`}>
                  {task.due ? format(new Date(task.due), "MMM d") : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ─── Gallery View ───
  const renderGallery = () => {
    const projectColors: Record<string, string> = { 1: "from-indigo-500/30 to-purple-600/30", 2: "from-violet-500/30 to-fuchsia-600/30", 3: "from-emerald-500/30 to-teal-600/30" };
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8 px-2">
        {tasks.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const assignees = members.filter(m => (task.assigneeIds as number[])?.includes(m.id));
          const status = STATUSES.find(s => s.id === task.status);
          const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
          return (
            <div key={task.id} onClick={() => openTask(task)} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg group">
              <div className={`h-24 bg-gradient-to-br ${projectColors[task.projectId] || "from-slate-500/20 to-slate-600/20"} flex items-center justify-center relative`}>
                <span className="text-4xl opacity-60">{task.type === "bug" ? "🐛" : task.type === "feature" ? "✨" : task.type === "story" ? "📖" : "📋"}</span>
                {status && <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${status.dot} ring-2 ring-card`} />}
              </div>
              <div className="p-3">
                <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{task.title}</h4>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">{PRIORITY_MAP[task.priority]?.icon}</span>
                    {project && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />}
                    {task.points && <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1 rounded">{task.points}pt</span>}
                  </div>
                  <div className="flex -space-x-1">
                    {assignees.slice(0, 2).map(m => <Avatar key={m.id} name={m.name} color={m.color} />)}
                  </div>
                </div>
                {task.due && (
                  <div className={`text-[10px] mt-1.5 ${isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"}`}>
                    {isOverdue ? "⚠️ " : ""}Due {format(new Date(task.due), "MMM d")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Roadmap View ───
  const renderRoadmap = () => {
    const projectGroups = projects.map(p => ({
      ...p,
      tasks: tasks.filter(t => t.projectId === p.id),
    }));
    const now = new Date();
    const monthsAhead = 4;
    const months = Array.from({ length: monthsAhead }, (_, i) => addMonths(startOfMonth(now), i));

    return (
      <div className="pb-8 px-2 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-border mb-4">
            <div className="w-48 shrink-0 px-3 py-2 text-xs font-bold text-muted-foreground uppercase">Project</div>
            {months.map(m => (
              <div key={m.toISOString()} className="flex-1 px-3 py-2 text-xs font-bold text-muted-foreground uppercase text-center border-l border-border/30">
                {format(m, "MMM yyyy")}
              </div>
            ))}
          </div>

          {projectGroups.map(pg => {
            const totalTasks = pg.tasks.length;
            const doneTasks = pg.tasks.filter(t => t.status === "done").length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            const hasDueTasks = pg.tasks.filter(t => t.due).length;
            const earliestDue = pg.tasks.filter(t => t.due).sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())[0];
            const latestDue = pg.tasks.filter(t => t.due).sort((a, b) => new Date(b.due!).getTime() - new Date(a.due!).getTime())[0];

            return (
              <div key={pg.id} className="flex border-b border-border/30 hover:bg-white/[0.02]">
                <div className="w-48 shrink-0 px-3 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pg.color }} />
                  <div>
                    <div className="text-sm font-semibold">{pg.name}</div>
                    <div className="text-[10px] text-muted-foreground">{doneTasks}/{totalTasks} done</div>
                  </div>
                </div>
                <div className="flex flex-1 relative items-center">
                  {months.map(m => (
                    <div key={m.toISOString()} className="flex-1 border-l border-border/10 h-full" />
                  ))}
                  {hasDueTasks > 0 && earliestDue && latestDue && (
                    <div
                      className="absolute h-6 rounded-full flex items-center px-2 text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: pg.color,
                        opacity: 0.8,
                        left: `${Math.max(0, Math.min(95, ((new Date(earliestDue.due!).getTime() - months[0].getTime()) / (months[months.length - 1].getTime() - months[0].getTime())) * 100))}%`,
                        width: `${Math.max(5, Math.min(95 - Math.max(0, ((new Date(earliestDue.due!).getTime() - months[0].getTime()) / (months[months.length - 1].getTime() - months[0].getTime())) * 100), ((new Date(latestDue.due!).getTime() - new Date(earliestDue.due!).getTime()) / (months[months.length - 1].getTime() - months[0].getTime())) * 100))}%`,
                      }}
                    >
                      {progress}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Triage View ───
  const renderTriage = () => {
    const unassigned = tasks.filter(t => !t.assigneeIds || (t.assigneeIds as number[]).length === 0);
    const backlog = tasks.filter(t => t.status === "backlog" && t.assigneeIds && (t.assigneeIds as number[]).length > 0);
    const needsPriority = tasks.filter(t => t.priority === "medium" && t.status !== "done");
    const noDueDate = tasks.filter(t => !t.due && t.status !== "done");

    const sections = [
      { title: "Unassigned", items: unassigned, color: "text-rose-400", bg: "bg-rose-500/10", desc: "Tasks without an owner — assign to a team member" },
      { title: "Needs Triage", items: backlog, color: "text-amber-400", bg: "bg-amber-500/10", desc: "In backlog — prioritize and move to a sprint" },
      { title: "No Due Date", items: noDueDate, color: "text-blue-400", bg: "bg-blue-500/10", desc: "No deadline set — schedule or deprioritize" },
    ];

    return (
      <div className="pb-8 px-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-rose-400">{unassigned.length}</div>
            <div className="text-xs text-muted-foreground">Unassigned</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{backlog.length}</div>
            <div className="text-xs text-muted-foreground">Needs Triage</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{noDueDate.length}</div>
            <div className="text-xs text-muted-foreground">No Due Date</div>
          </div>
        </div>

        {sections.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`text-sm font-bold ${section.color}`}>{section.title}</h3>
              <span className="text-xs text-muted-foreground">— {section.desc}</span>
              <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-full ${section.bg} ${section.color}`}>{section.items.length}</span>
            </div>
            <div className="space-y-1.5">
              {section.items.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">All clear!</div>}
              {section.items.slice(0, 8).map(task => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <div key={task.id} onClick={() => openTask(task)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5 cursor-pointer hover:border-primary/30 transition-colors">
                    <span className="text-xs">{PRIORITY_MAP[task.priority]?.icon}</span>
                    <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                    {project && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</div>}
                    <span className="text-xs text-muted-foreground">{task.points}pt</span>
                    <button onClick={e => { e.stopPropagation(); updateTask.mutate({ id: task.id, data: { status: "todo" } }); }}
                      className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-bold">
                      → To Do
                    </button>
                  </div>
                );
              })}
              {section.items.length > 8 && <div className="text-xs text-muted-foreground text-center py-2">+{section.items.length - 8} more</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Gantt Chart View ───
  const renderGantt = () => {
    const now = new Date();
    const ganttStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ganttEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    const totalDays = Math.ceil((ganttEnd.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));
    const months: { label: string; days: number; offset: number }[] = [];
    for (let m = 0; m < 3; m++) {
      const mStart = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + m + 1, 0);
      months.push({ label: format(mStart, "MMM yyyy"), days: mEnd.getDate(), offset: Math.ceil((mStart.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)) });
    }
    const tasksWithDates = tasks.filter(t => t.due).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const todayOffset = Math.ceil((now.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <div className="pb-8 px-2 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b border-border mb-1">
            <div className="w-[250px] shrink-0 px-3 py-2 text-xs font-bold text-muted-foreground uppercase">Task</div>
            <div className="flex-1 flex relative">
              {months.map((m, i) => (
                <div key={i} className="flex-1 px-2 py-2 text-xs font-bold text-muted-foreground border-l border-border/30 text-center">{m.label}</div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-0 bottom-0 border-l-2 border-primary/40 z-10" style={{ left: `calc(250px + ((100% - 250px) * ${todayOffset / totalDays}))` }} />
            {tasksWithDates.map(task => {
              const dueDate = new Date(task.due!);
              const createdDate = new Date(task.createdAt);
              const rawStart = Math.ceil((createdDate.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));
              const rawEnd = Math.ceil((dueDate.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));
              if (rawEnd < 0 || rawStart > totalDays) return null;
              const startDay = Math.max(0, rawStart);
              const endDay = Math.min(totalDays, rawEnd);
              if (endDay <= startDay) return null;
              const barLeft = (startDay / totalDays) * 100;
              const barWidth = Math.max(2, ((endDay - startDay) / totalDays) * 100);
              const isOverdue = dueDate < now && task.status !== "done";
              const isDone = task.status === "done";
              const statusObj = STATUSES.find(s => s.id === task.status);

              return (
                <div key={task.id} role="button" tabIndex={0} onClick={() => openTask(task)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTask(task); } }} className="flex items-center hover:bg-white/5 cursor-pointer group border-b border-border/10 focus:outline-none focus:bg-white/5" style={{ height: "36px" }}>
                  <div className="w-[250px] shrink-0 px-3 flex items-center gap-2 truncate">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusObj?.dot || "bg-gray-400"}`} />
                    <span className={`text-xs font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                  </div>
                  <div className="flex-1 relative h-full">
                    {months.map((m, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-border/10" style={{ left: `${(m.offset / totalDays) * 100}%` }} />)}
                    <div
                      className={`absolute top-[8px] h-[20px] rounded-full text-[10px] font-medium flex items-center px-2 truncate transition-all ${
                        isDone ? "bg-emerald-500/30 text-emerald-300" : isOverdue ? "bg-rose-500/30 text-rose-300" : "bg-primary/30 text-primary"
                      }`}
                      style={{ left: `${barLeft}%`, width: `${barWidth}%`, minWidth: "20px" }}
                    >
                      {barWidth > 8 && <span className="truncate">{task.title}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {tasksWithDates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No tasks with due dates to display on the Gantt chart</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Chart View (Monday-style) ───
  const renderChart = () => {
    const statusData = STATUSES.map(s => ({ label: s.label, count: tasks.filter(t => t.status === s.id).length, color: s.dot.replace("bg-", "") }));
    const priorityData = [
      { label: "Critical", count: tasks.filter(t => t.priority === "critical").length, color: "#ef4444" },
      { label: "High", count: tasks.filter(t => t.priority === "high").length, color: "#f59e0b" },
      { label: "Medium", count: tasks.filter(t => t.priority === "medium").length, color: "#3b82f6" },
      { label: "Low", count: tasks.filter(t => t.priority === "low").length, color: "#94a3b8" },
    ];
    const assigneeData = members.map(m => ({
      label: m.name.split(" ")[0],
      count: tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id)).length,
      color: m.color,
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    const maxPriority = Math.max(...priorityData.map(d => d.count), 1);
    const maxAssignee = Math.max(...assigneeData.map(d => d.count), 1);
    const total = tasks.length || 1;
    const STATUS_COLORS: Record<string, string> = { "bg-slate-400": "#94a3b8", "bg-blue-400": "#60a5fa", "bg-primary": "#6366f1", "bg-amber-400": "#fbbf24", "bg-emerald-400": "#34d399", "bg-rose-400": "#fb7185" };

    return (
      <div className="p-6 space-y-8 pb-16 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" /> Tasks by Status
            </h3>
            <div className="flex items-center gap-8">
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return statusData.map((d, i) => {
                      const pct = (d.count / total) * 100;
                      const el = <circle key={i} cx="18" cy="18" r="14" fill="none" strokeWidth="4"
                        stroke={STATUS_COLORS[d.color] || "#6366f1"} strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset} />;
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{tasks.length}</span>
                  <span className="text-[10px] text-muted-foreground">tasks</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {statusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.color] || "#6366f1" }} />
                    <span className="text-sm flex-1">{d.label}</span>
                    <span className="text-sm font-mono font-bold">{d.count}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{Math.round((d.count / total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Tasks by Priority
            </h3>
            <div className="space-y-4">
              {priorityData.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="text-sm font-mono font-bold">{d.count}</span>
                  </div>
                  <div className="h-6 bg-secondary/50 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                      style={{ width: `${Math.max(5, (d.count / maxPriority) * 100)}%`, backgroundColor: d.color }}>
                      {d.count > 0 && <span className="text-[10px] font-bold text-white">{d.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-primary" /> Tasks by Assignee
            </h3>
            <div className="flex items-end gap-4 h-48">
              {assigneeData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono font-bold">{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all duration-500"
                    style={{ height: `${(d.count / maxAssignee) * 140}px`, backgroundColor: d.color, minHeight: 8 }} />
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[60px]">{d.label}</span>
                </div>
              ))}
              {assigneeData.length === 0 && (
                <div className="w-full text-center text-muted-foreground text-sm py-12">No task assignments yet</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // ─── Project Brief View (Asana-style) ───
  const renderBrief = () => {
    const project = filterProjectId ? projects.find(p => p.id === filterProjectId) : projects[0];
    const pTasks = project ? tasks.filter(t => t.projectId === project.id) : tasks;
    const doneCount = pTasks.filter(t => t.status === "done").length;
    const inProgressCount = pTasks.filter(t => t.status === "inprogress").length;
    const blockedCount = pTasks.filter(t => t.status === "blocked").length;
    const overdueTasks = pTasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
    const upcomingTasks = pTasks.filter(t => t.due && new Date(t.due) > new Date()).sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime()).slice(0, 5);
    const teamIds = [...new Set(pTasks.flatMap(t => (t.assigneeIds as number[]) || []))];
    const teamMembers = members.filter(m => teamIds.includes(m.id));
    const completionPct = pTasks.length > 0 ? Math.round((doneCount / pTasks.length) * 100) : 0;

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8 pb-16 overflow-y-auto">
        <div className="flex items-start gap-4">
          {project && <span className="text-4xl">{project.icon}</span>}
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{project?.name || "All Projects"}</h2>
            <p className="text-muted-foreground mt-1">{(project as any)?.description || `Overview of ${pTasks.length} tasks across the project.`}</p>
            {project && (
              <div className="flex items-center gap-4 mt-3">
                <Badge color={project.health >= 80 ? "green" : project.health >= 60 ? "yellow" : "red"}>
                  Health: {project.health}%
                </Badge>
                <Badge color="indigo">{project.phase}</Badge>
                <span className="text-xs text-muted-foreground">{project.client}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{completionPct}%</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Complete</div>
            <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${completionPct}%` }} />
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{doneCount}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Completed</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{inProgressCount}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">In Progress</div>
          </Card>
          <Card className="p-4 text-center">
            <div className={`text-3xl font-bold ${blockedCount > 0 ? "text-rose-400" : "text-muted-foreground"}`}>{blockedCount}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Blocked</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Team Members</h3>
            <div className="space-y-3">
              {teamMembers.length === 0 && <p className="text-sm text-muted-foreground">No team members assigned yet.</p>}
              {teamMembers.map(m => {
                const memberTasks = pTasks.filter(t => (t.assigneeIds as number[])?.includes(m.id));
                const memberDone = memberTasks.filter(t => t.status === "done").length;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.name} color={m.color} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.role} · {memberDone}/{memberTasks.length} done</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Key Dates</h3>
            <div className="space-y-3">
              {overdueTasks.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <div className="text-xs font-bold text-rose-400 mb-1">⚠️ {overdueTasks.length} Overdue Tasks</div>
                  {overdueTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="text-xs text-rose-300 truncate cursor-pointer hover:underline" onClick={() => openTask(t)}>
                      {t.title} — {format(new Date(t.due!), "MMM d")}
                    </div>
                  ))}
                </div>
              )}
              {upcomingTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-2 -mx-2" onClick={() => openTask(t)}>
                  <div className="text-xs font-mono text-muted-foreground w-16 shrink-0">{format(new Date(t.due!), "MMM d")}</div>
                  <div className="text-sm truncate flex-1">{t.title}</div>
                  <Badge color={t.priority === "critical" ? "red" : t.priority === "high" ? "yellow" : "gray"}>{t.priority}</Badge>
                </div>
              ))}
              {upcomingTasks.length === 0 && overdueTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {pTasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-white/5 rounded-lg p-2 -mx-2" onClick={() => openTask(t)}>
                <div className={`w-2 h-2 rounded-full ${STATUSES.find(s => s.id === t.status)?.dot || "bg-gray-400"}`} />
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(t.updatedAt || t.createdAt), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // ─── Files View (Monday-style) ───
  const getSlaIndicator = (task: any) => {
    if (!task.due || task.status === "done") return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(task.due); due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Overdue", color: "bg-rose-500/20 text-rose-400", dot: "bg-rose-400" };
    if (diffDays === 0) return { label: "Due today", color: "bg-amber-500/20 text-amber-400", dot: "bg-amber-400" };
    if (diffDays <= 7) return { label: "Due this week", color: "bg-blue-500/20 text-blue-400", dot: "bg-blue-400" };
    return null;
  };

  const isValidUrl = (str: string) => { try { const u = new URL(str); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } };

  const renderEmbed = () => (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4">
        <input value={embedUrlInput} onChange={e => setEmbedUrlInput(e.target.value)}
          placeholder="Paste a URL to embed (Figma, Google Docs, Miro, Loom, YouTube...)"
          className={`flex-1 bg-background border rounded-xl px-4 py-2.5 text-sm ${embedUrlInput && !isValidUrl(embedUrlInput) ? "border-rose-500" : "border-border"}`}
          onKeyDown={e => { if (e.key === "Enter" && isValidUrl(embedUrlInput)) { setEmbedUrl(embedUrlInput); } }} />
        <button onClick={() => { if (isValidUrl(embedUrlInput)) setEmbedUrl(embedUrlInput); }}
          disabled={!embedUrlInput || !isValidUrl(embedUrlInput)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">Embed</button>
      </div>
      {embedUrlInput && !isValidUrl(embedUrlInput) && <p className="text-xs text-rose-400 -mt-2 mb-2">Please enter a valid URL (https://...)</p>}
      {embedUrl ? (
        <div className="flex-1 border border-border rounded-xl overflow-hidden bg-white">
          <iframe src={embedUrl} className="w-full h-full border-0" title="Embedded content"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allow="clipboard-read; clipboard-write" />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Link2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Embed external content</p>
            <p className="text-sm mt-1">Paste a URL above to embed Figma designs, Google Docs, Miro boards, videos, and more.</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["Figma", "Google Docs", "Miro", "Loom", "YouTube", "Notion"].map(s => (
                <span key={s} className="text-[10px] px-2 py-1 bg-secondary rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const saveAsTemplate = () => {
    if (!formData?.title) return;
    const template = {
      id: Date.now(),
      name: formData.title,
      type: formData.type || "task",
      priority: formData.priority || "medium",
      status: formData.status || "todo",
      projectId: formData.projectId,
      notes: formData.notes || "",
      subtasks: formData.subtasks || [],
      estimatedHours: formData.estimatedHours,
      points: formData.points,
    };
    const next = [...taskTemplates, template];
    setTaskTemplates(next);
    localStorage.setItem("projectos-task-templates", JSON.stringify(next));
  };

  const applyTemplate = (template: any) => {
    setFormData({
      title: template.name,
      type: template.type,
      priority: template.priority,
      status: template.status,
      projectId: template.projectId,
      notes: template.notes,
      subtasks: template.subtasks || [],
      estimatedHours: template.estimatedHours,
      points: template.points,
      assigneeIds: [],
    });
    setModalTab("details");
    setIsNewTask(true);
    setIsModalOpen(true);
    setShowTemplateMenu(false);
  };

  const deleteTemplate = (id: number) => {
    const next = taskTemplates.filter(t => t.id !== id);
    setTaskTemplates(next);
    localStorage.setItem("projectos-task-templates", JSON.stringify(next));
  };

  const renderFiles = () => {
    const allAttachments: { taskId: number; taskTitle: string; filename: string; originalName: string; mimeType: string; size: number; url: string; createdAt: string }[] = [];
    tasks.forEach(task => {
      const cached = queryClient.getQueryData<any[]>(["/tasks", task.id, "attachments"]);
      if (cached) {
        cached.forEach((att: any) => allAttachments.push({ ...att, taskId: task.id, taskTitle: task.title }));
      }
    });

    const getFileIcon = (mime: string) => {
      if (mime.startsWith("image/")) return "🖼️";
      if (mime.includes("pdf")) return "📄";
      if (mime.includes("spreadsheet") || mime.includes("csv") || mime.includes("excel")) return "📊";
      if (mime.includes("document") || mime.includes("word")) return "📝";
      if (mime.includes("presentation") || mime.includes("powerpoint")) return "📽️";
      if (mime.startsWith("video/")) return "🎬";
      if (mime.startsWith("audio/")) return "🎵";
      if (mime.includes("zip") || mime.includes("archive")) return "📦";
      return "📎";
    };

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
      <div className="p-6 pb-16 overflow-y-auto">
        {allAttachments.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Paperclip className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No files yet</p>
            <p className="text-sm mt-1">Upload attachments to tasks to see them here. Files are loaded as you open tasks.</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">{allAttachments.length} file{allAttachments.length !== 1 ? "s" : ""} across tasks</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allAttachments.map((att, i) => (
                <Card key={`${att.taskId}-${i}`} className="p-4 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => { const task = tasks.find(t => t.id === att.taskId); if (task) openTask(task); }}>
                  <div className="w-full h-24 bg-secondary/50 rounded-lg flex items-center justify-center mb-3 text-3xl overflow-hidden">
                    {att.mimeType.startsWith("image/") ? (
                      <img src={att.url} alt={att.originalName} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      getFileIcon(att.mimeType)
                    )}
                  </div>
                  <div className="text-sm font-medium truncate">{att.originalName}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{formatSize(att.size)}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{att.taskTitle}</span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

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
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-mono ${isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"}`}>{task.due ? format(new Date(task.due), "MMM d") : "-"}</span>
                    {(() => { const sla = getSlaIndicator(task); return sla ? <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sla.color}`}>{sla.label}</span> : null; })()}
                  </div>
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
          <div className="flex bg-secondary/50 border border-border rounded-xl p-1 flex-wrap">
            {([
              { key: "kanban", icon: LayoutGrid, label: "Board" },
              { key: "list", icon: List, label: "List" },
              { key: "table", icon: Table, label: "Table" },
              { key: "timeline", icon: GanttChart, label: "Timeline" },
              { key: "calendar", icon: Calendar, label: "Calendar" },
              { key: "map", icon: MapPin, label: "Map" },
              { key: "workload", icon: UsersIcon, label: "Workload" },
              { key: "gallery", icon: Image, label: "Gallery" },
              { key: "roadmap", icon: Map, label: "Roadmap" },
              { key: "gantt", icon: GanttChart, label: "Gantt" },
              { key: "triage", icon: Inbox, label: "Triage" },
              { key: "chart", icon: BarChart3, label: "Chart" },
              { key: "brief", icon: FileText, label: "Brief" },
              { key: "files", icon: Paperclip, label: "Files" },
              { key: "embed", icon: Link2, label: "Embed" },
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
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as any)}
            className="bg-background text-xs rounded-lg px-2 py-2 border border-border text-foreground"
          >
            <option value="status">Group: Status</option>
            <option value="priority">Group: Priority</option>
            <option value="assignee">Group: Assignee</option>
            <option value="group">Group: Section</option>
            <option value="none">No Grouping</option>
          </select>
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Sparkles className="w-4 h-4 text-primary" /></div>
            <Input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAiCreate()} placeholder="AI: 'fix auth bug critical due friday'" className="pl-10" />
          </div>
          <div className="relative">
            <Button onClick={openNewTask}><Plus className="w-4 h-4" /> New</Button>
            {taskTemplates.length > 0 && (
              <button onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="absolute -right-1 -top-1 w-4 h-4 bg-violet-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                {taskTemplates.length}
              </button>
            )}
            {showTemplateMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 p-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">Task Templates</div>
                {taskTemplates.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group">
                    <button onClick={() => applyTemplate(t)} className="flex-1 text-left text-sm font-medium truncate">
                      {TASK_TYPES.find(tt => tt.id === t.type)?.icon || "📋"} {t.name}
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {(viewMode === "list" || viewMode === "table") && (
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
        ) : viewMode === "kanban" ? (
          <KanbanView tasks={tasks} projects={projects} members={members} onTaskClick={openTask} onNewTask={openNewTask} onDragStart={handleDragStart} onDrop={handleDrop} onDragOver={handleDragOver} />
        ) : viewMode === "timeline" ? (
          <TimelineView tasks={tasks} projects={projects} members={members} onTaskClick={openTask} />
        ) : viewMode === "calendar" ? (
          <CalendarView tasks={tasks} projects={projects} members={members} onTaskClick={openTask} />
        ) : viewMode === "map" ? (
          <MapView tasks={tasks} projects={projects} members={members} onTaskClick={openTask} />
        ) : viewMode === "workload" ? (
          <WorkloadBoardView tasks={tasks} projects={projects} members={members} onTaskClick={openTask} />
        ) : viewMode === "list" ? renderList() : viewMode === "table" ? renderTable() : viewMode === "gallery" ? renderGallery() : viewMode === "roadmap" ? renderRoadmap() : viewMode === "gantt" ? renderGantt() : viewMode === "chart" ? renderChart() : viewMode === "brief" ? renderBrief() : viewMode === "files" ? renderFiles() : viewMode === "embed" ? renderEmbed() : renderTriage()}
      </div>

      {renderBulkBar()}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isNewTask ? "Create Task" : "Edit Task"} maxWidth="max-w-2xl">
        {!isNewTask && formData.id && (() => {
          const project = projects.find((p: any) => p.id === formData.projectId);
          const prefix = project?.name ? project.name.replace(/[^A-Z]/g, "").slice(0, 3) || project.name.slice(0, 3).toUpperCase() : "TSK";
          const taskIdStr = `${prefix}-${String(formData.id).padStart(3, "0")}`;
          return (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{taskIdStr}</span>
              {(() => {
                const watchers = taskWatchers[formData.id] || [];
                const isWatching = watchers.includes(1);
                return (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => {
                      const next = isWatching ? watchers.filter(w => w !== 1) : [...watchers, 1];
                      const updated = { ...taskWatchers, [formData.id]: next };
                      setTaskWatchers(updated);
                      localStorage.setItem("projectos-task-watchers", JSON.stringify(updated));
                    }} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${isWatching ? "bg-cyan-500/15 text-cyan-400" : "text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary"}`}>
                      <Eye className="w-3 h-3" /> {isWatching ? "Watching" : "Watch"}
                    </button>
                    {watchers.length > 0 && (
                      <div className="flex -space-x-1">
                        {watchers.slice(0, 4).map(wId => {
                          const m = members.find((m: any) => m.id === wId);
                          return m ? (
                            <div key={wId} className="w-5 h-5 rounded-full border border-card text-[8px] font-bold text-white flex items-center justify-center"
                              style={{ backgroundColor: m.color }} title={`${m.name} is watching`}>{m.name?.charAt(0)}</div>
                          ) : null;
                        })}
                        {watchers.length > 4 && <span className="text-[10px] text-muted-foreground ml-1">+{watchers.length - 4}</span>}
                      </div>
                    )}
                  </div>
                );
              })()}
              {formData.due && (
                <div className="ml-auto flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-muted-foreground" />
                  <select value={taskReminders[formData.id] || ""} onChange={e => {
                    const updated = { ...taskReminders, [formData.id]: e.target.value };
                    setTaskReminders(updated);
                    localStorage.setItem("projectos-task-reminders", JSON.stringify(updated));
                  }} className="text-[10px] bg-secondary/50 border border-border rounded-lg px-2 py-1 outline-none focus:border-primary">
                    <option value="">No reminder</option>
                    <option value="15min">15 min before</option>
                    <option value="1hr">1 hour before</option>
                    <option value="1day">1 day before</option>
                    <option value="3days">3 days before</option>
                  </select>
                  {taskReminders[formData.id] && <span className="text-[10px] text-amber-400 font-bold">🔔</span>}
                </div>
              )}
            </div>
          );
        })()}
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Start Date</label>
                <Input type="date" value={formData.startDate ? format(new Date(formData.startDate), "yyyy-MM-dd") : ""} onChange={e => setFormData({ ...formData, startDate: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Due Date</label>
                <Input type="date" value={formData.due ? format(new Date(formData.due), "yyyy-MM-dd") : ""} onChange={e => setFormData({ ...formData, due: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Group</label>
                <Input value={formData.groupName || "Default"} onChange={e => setFormData({ ...formData, groupName: e.target.value })} placeholder="Section name" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Location</label>
                <Input value={formData.location || ""} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. New York, Remote, HQ" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Type</label>
                <select value={formData.type || "task"} onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Time Estimate (hrs)</label>
                <Input type="number" min="0" step="0.5" value={formData.estimatedHours || ""} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value ? parseFloat(e.target.value) : null })} placeholder="e.g. 4" />
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
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5" /> Subtasks
              </label>
              <div className="space-y-1.5">
                {(formData.subtasks || []).map((st: { title: string; done: boolean }, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <button aria-label={st.done ? `Mark "${st.title}" incomplete` : `Mark "${st.title}" complete`} onClick={() => {
                      const subs = [...(formData.subtasks || [])];
                      subs[idx] = { ...subs[idx], done: !subs[idx].done };
                      setFormData({ ...formData, subtasks: subs });
                    }}>
                      {st.done ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <span className={`text-sm flex-1 ${st.done ? "line-through text-muted-foreground" : ""}`}>{st.title}</span>
                    <button aria-label={`Remove subtask "${st.title}"`} onClick={() => {
                      const subs = (formData.subtasks || []).filter((_: any, i: number) => i !== idx);
                      setFormData({ ...formData, subtasks: subs });
                    }} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(formData.subtasks || []).length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    {(formData.subtasks || []).filter((s: any) => s.done).length}/{(formData.subtasks || []).length} complete
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add subtask..."
                    className="!py-1 !text-xs"
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        const subs = [...(formData.subtasks || []), { title: (e.target as HTMLInputElement).value.trim(), done: false }];
                        setFormData({ ...formData, subtasks: subs });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
              <Textarea value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Add context, links, or details here..." />
            </div>

            {!isNewTask && subItems.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  Sub-Items ({subItems.length})
                </label>
                <div className="space-y-1.5">
                  {subItems.map((si: any) => {
                    const statusInfo = STATUSES.find(s => s.id === si.status);
                    return (
                      <div key={si.id} onClick={() => openTask(si)} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${statusInfo?.dot || "bg-slate-400"}`} />
                        <span className="text-sm flex-1 truncate">{si.title}</span>
                        <span className="text-[10px] text-muted-foreground">{si.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" /> Checklist
              </label>
              {(() => {
                const checklistKey = formData.id || "new";
                const items = taskChecklists[checklistKey] || [];
                const doneCount = items.filter((i: any) => i.done).length;
                const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
                return (
                  <div className="space-y-1.5">
                    {items.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{doneCount}/{items.length} ({pct}%)</span>
                      </div>
                    )}
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button onClick={() => {
                          const updated = items.map((i: any) => i.id === item.id ? { ...i, done: !i.done } : i);
                          const next = { ...taskChecklists, [checklistKey]: updated };
                          setTaskChecklists(next);
                          localStorage.setItem("projectos-task-checklists", JSON.stringify(next));
                        }}>
                          {item.done ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                        <button onClick={() => {
                          const updated = items.filter((i: any) => i.id !== item.id);
                          const next = { ...taskChecklists, [checklistKey]: updated };
                          setTaskChecklists(next);
                          localStorage.setItem("projectos-task-checklists", JSON.stringify(next));
                        }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <Input placeholder="Add checklist item..." className="!py-1 !text-xs"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                          const newItem = { id: Date.now(), text: (e.target as HTMLInputElement).value.trim(), done: false };
                          const updated = [...items, newItem];
                          const next = { ...taskChecklists, [checklistKey]: updated };
                          setTaskChecklists(next);
                          localStorage.setItem("projectos-task-checklists", JSON.stringify(next));
                          (e.target as HTMLInputElement).value = "";
                        }
                      }} />
                  </div>
                );
              })()}
            </div>

            {!isNewTask && formData.estimatedHours && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <ClockIcon className="w-3.5 h-3.5" /> Time: Estimated vs Tracked
                </label>
                {(() => {
                  const estimated = formData.estimatedHours || 0;
                  const seed = ((formData.id || 0) * 7 + 3) % 10;
                  const tracked = formData.trackedHours || Math.round(estimated * (0.3 + seed * 0.09) * 10) / 10;
                  const pct = estimated > 0 ? Math.round((tracked / estimated) * 100) : 0;
                  const isOver = pct > 100;
                  return (
                    <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-[10px] text-muted-foreground">Estimated</div>
                            <div className="text-sm font-bold">{estimated}h</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">Tracked</div>
                            <div className={`text-sm font-bold ${isOver ? "text-rose-400" : "text-emerald-400"}`}>{tracked}h</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">Remaining</div>
                            <div className={`text-sm font-bold ${isOver ? "text-rose-400" : ""}`}>
                              {isOver ? `+${(tracked - estimated).toFixed(1)}h over` : `${(estimated - tracked).toFixed(1)}h left`}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOver ? "bg-rose-500/15 text-rose-400" : pct > 75 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isOver ? "bg-rose-400" : pct > 75 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {!isNewTask && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5" /> Attachments & Proofing
                </label>
                <div className="space-y-1.5">
                  {taskAttachments.map((a: any) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(a.originalName);
                    const isPdf = /\.pdf$/i.test(a.originalName);
                    const isProofable = isImage || isPdf;
                    return (
                      <div key={a.id} className="group">
                        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate flex-1">{a.originalName}</span>
                          <span className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(0)}KB</span>
                          {isProofable && (
                            <button onClick={() => setProofingAttachment(proofingAttachment?.id === a.id ? null : a)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all ${proofingAttachment?.id === a.id ? "bg-primary text-white" : "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"}`}>
                              {proofingAttachment?.id === a.id ? "Close" : isImage ? "Annotate" : "Review"}
                            </button>
                          )}
                          <button aria-label={`Remove ${a.originalName}`} onClick={() => deleteAttachment.mutate(a.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {proofingAttachment?.id === a.id && isImage && (
                          <div className="mt-2 border border-violet-500/30 rounded-xl overflow-hidden bg-black/20 relative">
                            <div className="relative inline-block w-full">
                              <img src={a.url || `${import.meta.env.BASE_URL}api/tasks/${formData.id}/attachments/${a.id}/file`.replace(/\/\//g, "/")}
                                alt={a.originalName} className="w-full rounded-lg cursor-crosshair" 
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                  const text = prompt("Add annotation comment:");
                                  if (text) {
                                    setAnnotations(prev => [...prev, { id: Date.now(), attachmentId: a.id, x, y, text, author: "You", createdAt: new Date().toISOString() }]);
                                  }
                                }} />
                              {annotations.filter(ann => ann.attachmentId === a.id).map((ann, idx) => (
                                <div key={ann.id} style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-lg cursor-pointer ring-2 ring-white/30 hover:scale-125 transition-transform group/pin"
                                  title={`${ann.author}: ${ann.text}`}>
                                  {idx + 1}
                                  <div className="absolute left-8 top-0 bg-card border border-border rounded-lg px-3 py-2 min-w-[200px] shadow-xl opacity-0 group-hover/pin:opacity-100 pointer-events-none z-50">
                                    <div className="text-[10px] font-bold text-primary mb-0.5">{ann.author}</div>
                                    <div className="text-xs text-foreground">{ann.text}</div>
                                    <div className="text-[9px] text-muted-foreground mt-1">{new Date(ann.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="p-3 bg-card/50 border-t border-border">
                              <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Click anywhere on the image to add annotation pins
                              </div>
                              {annotations.filter(ann => ann.attachmentId === a.id).length > 0 && (
                                <div className="space-y-1">
                                  {annotations.filter(ann => ann.attachmentId === a.id).map((ann, idx) => (
                                    <div key={ann.id} className="flex items-center gap-2 text-xs">
                                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                      <span className="flex-1 text-muted-foreground">{ann.text}</span>
                                      <button onClick={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))} className="text-muted-foreground hover:text-rose-400">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 border border-dashed border-border rounded-lg hover:border-primary/40">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload file (max 10MB)</span>
                    <input type="file" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && formData.id) {
                        uploadAttachment.mutate({ taskId: formData.id, file });
                      }
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              </div>
            )}

            {!isNewTask && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5" /> Linked Tasks
                </label>
                <div className="space-y-1.5">
                  {taskLinks.map((link: any) => {
                    const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
                      related: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", icon: "🔗" },
                      duplicates: { bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-400", icon: "📋" },
                      "is-blocked-by": { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-400", icon: "🚫" },
                      blocks: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: "⚠️" },
                      "parent-of": { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: "📁" },
                      "child-of": { bg: "bg-teal-500/10 border-teal-500/20", text: "text-teal-400", icon: "📄" },
                    };
                    const style = typeStyles[link.linkType] || typeStyles.related;
                    return (
                      <div key={link.id} className={`flex items-center gap-2 group rounded-lg px-3 py-2 border ${style.bg}`}>
                        <span className="text-xs shrink-0">{style.icon}</span>
                        <span className="text-sm truncate flex-1">{link.linkedTask?.title || `Task #${link.targetTaskId}`}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.text} bg-secondary`}>{link.linkType}</span>
                        <button aria-label="Remove link" onClick={() => deleteTaskLink.mutate(link.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {!showLinkPicker ? (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { type: "related", label: "Related", icon: "🔗" },
                        { type: "duplicates", label: "Duplicates", icon: "📋" },
                        { type: "blocks", label: "Blocks", icon: "⚠️" },
                        { type: "is-blocked-by", label: "Blocked by", icon: "🚫" },
                        { type: "parent-of", label: "Parent of", icon: "📁" },
                        { type: "child-of", label: "Child of", icon: "📄" },
                      ].map(rel => (
                        <button key={rel.type} onClick={() => setShowLinkPicker(rel.type as any)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 border border-dashed border-border rounded-lg hover:border-primary/40">
                          <span>{rel.icon}</span> {rel.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-2 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Link as: {showLinkPicker}</div>
                      <Input placeholder="Search tasks to link..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="!py-1 !text-xs" />
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {allTasks
                          .filter(t => t.id !== formData.id && t.title.toLowerCase().includes(linkSearch.toLowerCase()) && !taskLinks.some((l: any) => l.linkedTask?.id === t.id))
                          .slice(0, 8)
                          .map(t => (
                            <button key={t.id} onClick={() => { createTaskLink.mutate({ sourceTaskId: formData.id, targetTaskId: t.id, linkType: showLinkPicker as string }); setShowLinkPicker(false); setLinkSearch(""); }}
                              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 truncate"
                            >{t.title}</button>
                          ))}
                      </div>
                      <button onClick={() => { setShowLinkPicker(false); setLinkSearch(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isNewTask && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <AlertOctagon className="w-3.5 h-3.5" /> Dependencies
                </label>
                <div className="space-y-1.5">
                  {(taskDeps.blockedBy || []).length > 0 && (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Blocked By</div>
                  )}
                  {(taskDeps.blockedBy || []).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2 group bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-sm truncate flex-1">{d.task?.title || `Task #${d.taskId}`}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">{d.task?.status}</span>
                      <button aria-label="Remove dependency" onClick={() => deleteDep.mutate(d.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(taskDeps.blocking || []).length > 0 && (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1 mt-2">Blocks</div>
                  )}
                  {(taskDeps.blocking || []).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2 group bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-sm truncate flex-1">{d.task?.title || `Task #${d.dependsOnId}`}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">{d.task?.status}</span>
                      <button aria-label="Remove dependency" onClick={() => deleteDep.mutate(d.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {!showDepPicker ? (
                    <div className="flex gap-2">
                      <button onClick={() => setShowDepPicker("blockedBy")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:border-rose-400/40 flex-1">
                        <AlertOctagon className="w-3.5 h-3.5" /> Add blocker
                      </button>
                      <button onClick={() => setShowDepPicker("blocks")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:border-amber-400/40 flex-1">
                        <ArrowRight className="w-3.5 h-3.5" /> Add blocking
                      </button>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-2 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{showDepPicker === "blockedBy" ? "Select task that blocks this one" : "Select task this one blocks"}</div>
                      <Input placeholder="Search tasks..." value={depSearch} onChange={e => setDepSearch(e.target.value)} className="!py-1 !text-xs" />
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {allTasks
                          .filter(t => t.id !== formData.id && t.title.toLowerCase().includes(depSearch.toLowerCase()))
                          .slice(0, 8)
                          .map(t => (
                            <button key={t.id} onClick={() => {
                              if (showDepPicker === "blockedBy") createDep.mutate({ taskId: t.id, dependsOnId: formData.id });
                              else createDep.mutate({ taskId: formData.id, dependsOnId: t.id });
                              setShowDepPicker(null); setDepSearch("");
                            }} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 truncate">{t.title}</button>
                          ))}
                      </div>
                      <button onClick={() => { setShowDepPicker(null); setDepSearch(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isNewTask && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Multi-Project (Multi-Homing)
                </label>
                <div className="space-y-1.5">
                  {(taskProjects || []).map((tp: any) => (
                    <div key={tp.id} className="flex items-center gap-2 group bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                      <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-sm truncate flex-1">{projects.find((p: any) => p.id === tp.projectId)?.name || `Project #${tp.projectId}`}</span>
                      <button aria-label="Remove from project" onClick={() => removeTaskProject.mutate(tp.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-rose-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <select
                    className="w-full px-3 py-2 bg-background/50 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-violet-400/40 focus:border-primary outline-none"
                    value=""
                    onChange={e => {
                      const pid = parseInt(e.target.value, 10);
                      if (pid && formData.id) addTaskProject.mutate({ taskId: formData.id, projectId: pid });
                    }}>
                    <option value="">+ Add to another project...</option>
                    {projects
                      .filter((p: any) => p.id !== formData.projectId && !(taskProjects || []).some((tp: any) => tp.projectId === p.id))
                      .map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {!isNewTask && customFields.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Table className="w-3.5 h-3.5" /> Custom Fields
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {customFields.map((field: any) => {
                    const val = customFieldValues.find((v: any) => v.fieldId === field.id);
                    const currentValue = val?.value || "";
                    return (
                      <div key={field.id}>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">{field.name}</label>
                        {field.type === "select" ? (
                          <select value={currentValue} onChange={e => saveFieldValue.mutate({ fieldId: field.id, entityId: formData.id, value: e.target.value })}
                            className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                            <option value="">-- Select --</option>
                            {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : field.type === "checkbox" ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={currentValue === "true"} onChange={e => saveFieldValue.mutate({ fieldId: field.id, entityId: formData.id, value: e.target.checked ? "true" : "false" })}
                              className="w-4 h-4 rounded border-border" />
                            <span className="text-sm">{currentValue === "true" ? "Yes" : "No"}</span>
                          </label>
                        ) : field.type === "rating" ? (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(r => (
                              <button key={r} onClick={() => saveFieldValue.mutate({ fieldId: field.id, entityId: formData.id, value: String(r) })}
                                className={`text-lg ${parseInt(currentValue) >= r ? "text-amber-400" : "text-muted-foreground/30"}`}>★</button>
                            ))}
                          </div>
                        ) : (
                          <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : field.type === "email" ? "email" : "text"}
                            defaultValue={currentValue} key={`${field.id}-${currentValue}`}
                            onBlur={e => { if (e.target.value !== currentValue) saveFieldValue.mutate({ fieldId: field.id, entityId: formData.id, value: e.target.value }); }}
                            placeholder={`Enter ${field.name.toLowerCase()}...`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-8">
              {!isNewTask && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { deleteTask.mutate({ id: formData.id }); setIsModalOpen(false); }} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button onClick={() => duplicateTask.mutate(formData.id)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5">
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button onClick={() => archiveTask.mutate(formData.id)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5">
                    <Archive className="w-4 h-4" /> Archive
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 ml-auto">
                {!isNewTask && (
                  <button onClick={() => {
                    const project = projects.find((p: any) => p.id === formData.projectId);
                    window.dispatchEvent(new CustomEvent("task-tray-add", { detail: { id: formData.id, title: formData.title, status: formData.status, projectName: project?.name, projectColor: project?.color } }));
                    setIsModalOpen(false);
                  }} className="text-xs text-muted-foreground hover:text-cyan-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors"
                    title="Minimize to task tray for quick access">
                    <Minimize2 className="w-3.5 h-3.5" /> To Tray
                  </button>
                )}
                <button onClick={saveAsTemplate} className="text-xs text-muted-foreground hover:text-violet-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors"
                  title="Save current task configuration as a reusable template">
                  <Save className="w-3.5 h-3.5" /> Save Template
                </button>
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
                  const reactions = commentReactions[c.id] || {};
                  const addReaction = (emoji: string) => {
                    const updated = { ...commentReactions, [c.id]: { ...reactions, [emoji]: (reactions[emoji] || 0) + 1 } };
                    setCommentReactions(updated);
                    localStorage.setItem("projectos-comment-reactions", JSON.stringify(updated));
                    setShowEmojiPicker(null);
                  };
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={author?.name || "User"} color={author?.color || "#6366f1"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{author?.name || "User"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.content}</p>
                        {commentAssignments[c.id] && (() => {
                          const assignee = members.find((m: any) => m.id === commentAssignments[c.id]);
                          return assignee ? (
                            <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg w-fit">
                              <UserPlus className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] font-bold text-amber-400">Assigned to {assignee.name}</span>
                              <button onClick={() => {
                                const next = { ...commentAssignments };
                                delete next[c.id];
                                setCommentAssignments(next);
                                localStorage.setItem("projectos-comment-assignments", JSON.stringify(next));
                              }} className="text-amber-400/60 hover:text-amber-400 ml-1"><X className="w-3 h-3" /></button>
                            </div>
                          ) : null;
                        })()}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {Object.entries(reactions).filter(([, v]) => v > 0).map(([emoji, count]) => (
                            <button key={emoji} onClick={() => addReaction(emoji)} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-xs hover:bg-primary/20 transition-colors">
                              {emoji} <span className="font-mono text-[10px]">{count as number}</span>
                            </button>
                          ))}
                          <div className="relative">
                            <button aria-label="Add reaction" aria-expanded={showEmojiPicker === c.id} onClick={() => setShowEmojiPicker(showEmojiPicker === c.id ? null : c.id)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {showEmojiPicker === c.id && (
                              <div role="menu" className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-xl p-1.5 flex gap-1 z-50">
                                {REACTION_EMOJIS.map(e => (
                                  <button key={e} role="menuitem" aria-label={`React with ${e}`} onClick={() => addReaction(e)} className="text-sm hover:bg-white/10 rounded p-1 transition-colors">{e}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          {!commentAssignments[c.id] && (
                            <div className="relative group/assign">
                              <button className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Assign comment">
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                              <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-xl p-1.5 min-w-[140px] opacity-0 group-hover/assign:opacity-100 pointer-events-none group-hover/assign:pointer-events-auto z-50 space-y-0.5 transition-opacity">
                                <div className="text-[10px] font-bold text-muted-foreground px-1 pb-1">Assign to:</div>
                                {members.map((m: any) => (
                                  <button key={m.id} onClick={() => {
                                    const next = { ...commentAssignments, [c.id]: m.id };
                                    setCommentAssignments(next);
                                    localStorage.setItem("projectos-comment-assignments", JSON.stringify(next));
                                  }} className="w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>{m.name?.charAt(0)}</div>
                                    {m.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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
