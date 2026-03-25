import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sun, CheckCircle2, Circle, Clock, AlertTriangle, Star, Calendar, ChevronRight, Sparkles } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function MyDay() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => fetch(`${API}/api/tasks`, { credentials: "include" }).then(r => r.json()) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["time-entries"], queryFn: () => fetch(`${API}/api/time-entries`, { credentials: "include" }).then(r => r.json()) });

  const updateTask = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`${API}/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const myTasks = tasks.filter((t: any) => (t.assigneeIds as number[])?.includes(1));
  const todayTasks = myTasks.filter((t: any) => t.due && new Date(t.due).toISOString().split("T")[0] === todayStr && t.status !== "done");
  const overdueTasks = myTasks.filter((t: any) => t.status !== "done" && t.due && new Date(t.due) < today && new Date(t.due).toISOString().split("T")[0] !== todayStr);
  const upcomingTasks = myTasks.filter((t: any) => t.status !== "done" && t.due && new Date(t.due) > today).sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 5);
  const recentlyCompleted = myTasks.filter((t: any) => t.status === "done").slice(0, 3);
  const inProgressTasks = myTasks.filter((t: any) => t.status === "in_progress");
  const todayHours = timeEntries.filter((e: any) => new Date(e.date).toISOString().split("T")[0] === todayStr).reduce((s: number, e: any) => s + (e.hours ? parseFloat(e.hours) : 0), 0);

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
        <div className="flex items-center gap-3 mb-2">
          <Sun className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl font-bold">{greeting}!</h1>
        </div>
        <p className="text-muted-foreground">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} — 
          {todayTasks.length > 0 ? ` You have ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} due today` : " No tasks due today"}
          {overdueTasks.length > 0 ? ` and ${overdueTasks.length} overdue` : ""}.
        </p>
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{inProgressTasks.length}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{recentlyCompleted.length}</div>
            <div className="text-xs text-muted-foreground">Done Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{Math.round(todayHours * 10) / 10}h</div>
            <div className="text-xs text-muted-foreground">Tracked</div>
          </div>
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className="bg-card border border-rose-500/30 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-rose-500/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-rose-400">Overdue ({overdueTasks.length})</span>
          </div>
          <div className="divide-y divide-border">
            {overdueTasks.map((t: any) => <TaskItem key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {todayTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-primary/5 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Due Today ({todayTasks.length})</span>
          </div>
          <div className="divide-y divide-border">
            {todayTasks.map((t: any) => <TaskItem key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {inProgressTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">In Progress ({inProgressTasks.length})</span>
          </div>
          <div className="divide-y divide-border">
            {inProgressTasks.map((t: any) => <TaskItem key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Coming Up</span>
          </div>
          <div className="divide-y divide-border">
            {upcomingTasks.map((t: any) => <TaskItem key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {recentlyCompleted.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Recently Completed</span>
          </div>
          <div className="divide-y divide-border">
            {recentlyCompleted.map((t: any) => <TaskItem key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {todayTasks.length === 0 && overdueTasks.length === 0 && inProgressTasks.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-semibold">All clear!</p>
          <p className="text-muted-foreground text-sm mt-1">No urgent tasks. Check your tasks page for upcoming work.</p>
        </div>
      )}
    </div>
  );
}
