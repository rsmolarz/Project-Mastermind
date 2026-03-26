import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sun, CheckCircle2, Circle, Clock, AlertTriangle, Star, Calendar, ChevronRight, ChevronDown, Sparkles, Plus, GripVertical, X, Inbox, ArrowRight } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

type SectionId = "overdue" | "today" | "recently_assigned" | "in_progress" | "upcoming" | "later" | "completed";
const DEFAULT_SECTIONS: SectionId[] = ["overdue", "today", "recently_assigned", "in_progress", "upcoming", "later", "completed"];
const SECTION_CONFIG: Record<SectionId, { label: string; icon: any; color: string; bgColor: string }> = {
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-rose-400", bgColor: "bg-rose-500/10" },
  today: { label: "Due Today", icon: Star, color: "text-primary", bgColor: "bg-primary/5" },
  recently_assigned: { label: "Recently Assigned", icon: Inbox, color: "text-violet-400", bgColor: "bg-violet-500/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  upcoming: { label: "Coming Up", icon: Calendar, color: "text-muted-foreground", bgColor: "bg-muted/10" },
  later: { label: "Later", icon: ArrowRight, color: "text-muted-foreground", bgColor: "bg-muted/10" },
  completed: { label: "Recently Completed", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
};
const STORAGE_KEY = "myday-sections";

export default function MyDay() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => fetch(`${API}/api/tasks`, { credentials: "include" }).then(r => r.json()) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["time-entries"], queryFn: () => fetch(`${API}/api/time-entries`, { credentials: "include" }).then(r => r.json()) });

  const updateTask = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`${API}/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_SECTIONS; }
    catch { return DEFAULT_SECTIONS; }
  });
  const [hiddenSections, setHiddenSections] = useState<SectionId[]>([]);
  const [showSectionConfig, setShowSectionConfig] = useState(false);

  const toggleCollapse = (id: string) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleHidden = (id: SectionId) => {
    setHiddenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const myTasks = tasks.filter((t: any) => (t.assigneeIds as number[])?.includes(1));

  const sectionTasks = useMemo(() => {
    const overdue = myTasks.filter((t: any) => t.status !== "done" && t.due && new Date(t.due) < today && new Date(t.due).toISOString().split("T")[0] !== todayStr);
    const todayItems = myTasks.filter((t: any) => t.due && new Date(t.due).toISOString().split("T")[0] === todayStr && t.status !== "done");
    const recentlyAssigned = myTasks.filter((t: any) => t.status !== "done" && t.createdAt && new Date(t.createdAt) >= oneWeekAgo && !overdue.includes(t) && !todayItems.includes(t));
    const inProgress = myTasks.filter((t: any) => (t.status === "inprogress" || t.status === "in_progress") && !overdue.includes(t) && !todayItems.includes(t));
    const upcoming = myTasks.filter((t: any) => t.status !== "done" && t.due && new Date(t.due) > today && new Date(t.due) <= oneWeekAhead && !todayItems.includes(t)).sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime());
    const later = myTasks.filter((t: any) => t.status !== "done" && t.due && new Date(t.due) > oneWeekAhead).sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 10);
    const completed = myTasks.filter((t: any) => t.status === "done").slice(0, 5);
    return { overdue, today: todayItems, recently_assigned: recentlyAssigned, in_progress: inProgress, upcoming, later, completed } as Record<SectionId, any[]>;
  }, [myTasks]);

  const todayHours = timeEntries.filter((e: any) => new Date(e.date).toISOString().split("T")[0] === todayStr).reduce((s: number, e: any) => s + (e.hours ? parseFloat(e.hours) : 0), 0);
  const totalActive = myTasks.filter((t: any) => t.status !== "done").length;
  const totalOverdue = sectionTasks.overdue.length;

  const priorityColors: Record<string, string> = { critical: "text-rose-400 bg-rose-500/20", high: "text-orange-400 bg-orange-500/20", medium: "text-amber-400 bg-amber-500/20", low: "text-emerald-400 bg-emerald-500/20" };
  const toggleDone = (task: any) => updateTask.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" });

  const TaskItem = ({ task }: { task: any }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
      <button onClick={() => toggleDone(task)} className="shrink-0">
        {task.status === "done" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.priority && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColors[task.priority] || ""}`}>{task.priority}</span>}
          {task.due && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(task.due).toLocaleDateString()}</span>}
          {task.points && <span className="text-[10px] text-muted-foreground">{task.points}pts</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <Sun className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-bold">{greeting}!</h1>
          </div>
          <button onClick={() => setShowSectionConfig(!showSectionConfig)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <GripVertical className="w-3.5 h-3.5" /> Customize Sections
          </button>
        </div>
        <p className="text-muted-foreground">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} — 
          {sectionTasks.today.length > 0 ? ` You have ${sectionTasks.today.length} task${sectionTasks.today.length > 1 ? "s" : ""} due today` : " No tasks due today"}
          {totalOverdue > 0 ? ` and ${totalOverdue} overdue` : ""}.
        </p>
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{totalActive}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-400">{totalOverdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{sectionTasks.completed.length}</div>
            <div className="text-xs text-muted-foreground">Done Recently</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{Math.round(todayHours * 10) / 10}h</div>
            <div className="text-xs text-muted-foreground">Tracked</div>
          </div>
        </div>
      </div>

      {showSectionConfig && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Customize Sections</h3>
            <button onClick={() => setShowSectionConfig(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEFAULT_SECTIONS.map(id => {
              const cfg = SECTION_CONFIG[id];
              const isHidden = hiddenSections.includes(id);
              return (
                <button key={id} onClick={() => toggleHidden(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${!isHidden ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-primary/20"}`}>
                  <cfg.icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Click to show/hide sections. Changes apply immediately.</p>
        </div>
      )}

      {sectionOrder.filter(id => !hiddenSections.includes(id)).map(sectionId => {
        const cfg = SECTION_CONFIG[sectionId];
        const items = sectionTasks[sectionId] || [];
        if (items.length === 0) return null;
        const SIcon = cfg.icon;
        const isCollapsed = collapsedSections[sectionId];
        return (
          <div key={sectionId} className="bg-card border border-border rounded-xl overflow-hidden">
            <button onClick={() => toggleCollapse(sectionId)}
              className={`w-full px-5 py-3 ${cfg.bgColor} flex items-center gap-2 hover:bg-opacity-80 transition-colors`}>
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              <SIcon className={`w-4 h-4 ${cfg.color}`} />
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {items.map((t: any) => <TaskItem key={t.id} task={t} />)}
              </div>
            )}
          </div>
        );
      })}

      {Object.values(sectionTasks).every(arr => arr.length === 0) && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-semibold">All clear!</p>
          <p className="text-muted-foreground text-sm mt-1">No urgent tasks. Check your tasks page for upcoming work.</p>
        </div>
      )}
    </div>
  );
}
