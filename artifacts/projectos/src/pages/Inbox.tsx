import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Card, Avatar, Badge, Input } from "@/components/ui/shared";
import {
  Inbox as InboxIcon, CheckCircle2, MessageSquare, AtSign, Calendar, AlertTriangle,
  Bell, Archive, Star, Filter, Clock, Eye, ChevronRight
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type InboxItem = {
  id: number;
  type: "assignment" | "mention" | "comment" | "due_soon" | "overdue" | "status_change" | "completed";
  title: string;
  description: string;
  taskId?: number;
  taskTitle?: string;
  projectName?: string;
  projectColor?: string;
  actorName?: string;
  actorColor?: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
};

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  assignment: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  mention: { icon: AtSign, color: "text-violet-400", bg: "bg-violet-500/10" },
  comment: { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  due_soon: { icon: Calendar, color: "text-amber-400", bg: "bg-amber-500/10" },
  overdue: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" },
  status_change: { icon: Eye, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

export default function InboxPage() {
  const { data: tasksData } = useTasks();
  const { data: projectsData } = useProjects();
  const { data: membersData } = useMembers();
  const tasks = (tasksData as any)?.tasks || tasksData || [];
  const projects = (projectsData as any)?.projects || projectsData || [];
  const members = (membersData as any)?.members || membersData || [];

  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "assignments">("all");
  const [inboxState, setInboxState] = useState<Record<number, { read: boolean; starred: boolean; archived: boolean }>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-inbox-state") || "{}"); } catch { return {}; }
  });

  const inboxItems = useMemo((): InboxItem[] => {
    const items: InboxItem[] = [];
    const me = members.find((m: any) => m.id === 1) || members[0];
    if (!me) return items;

    tasks.forEach((task: any) => {
      const project = projects.find((p: any) => p.id === task.projectId);
      const isAssigned = (task.assigneeIds || []).includes(me.id);

      if (isAssigned && task.status !== "done") {
        items.push({
          id: task.id * 100 + 1,
          type: "assignment",
          title: "You were assigned a task",
          description: task.title,
          taskId: task.id,
          taskTitle: task.title,
          projectName: project?.name,
          projectColor: project?.color,
          actorName: "System",
          timestamp: new Date(task.updatedAt || task.createdAt),
          read: inboxState[task.id * 100 + 1]?.read || false,
          starred: inboxState[task.id * 100 + 1]?.starred || false,
        });
      }

      if (task.due && task.status !== "done") {
        const dueDate = new Date(task.due);
        const now = new Date();
        const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 && isAssigned) {
          items.push({
            id: task.id * 100 + 2,
            type: "overdue",
            title: "Task is overdue",
            description: `${task.title} was due ${format(dueDate, "MMM d")}`,
            taskId: task.id,
            taskTitle: task.title,
            projectName: project?.name,
            projectColor: project?.color,
            timestamp: dueDate,
            read: inboxState[task.id * 100 + 2]?.read || false,
            starred: inboxState[task.id * 100 + 2]?.starred || false,
          });
        } else if (diffDays >= 0 && diffDays <= 2 && isAssigned) {
          items.push({
            id: task.id * 100 + 3,
            type: "due_soon",
            title: diffDays === 0 ? "Task due today" : `Task due in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
            description: task.title,
            taskId: task.id,
            taskTitle: task.title,
            projectName: project?.name,
            projectColor: project?.color,
            timestamp: dueDate,
            read: inboxState[task.id * 100 + 3]?.read || false,
            starred: inboxState[task.id * 100 + 3]?.starred || false,
          });
        }
      }

      if (task.status === "done" && isAssigned) {
        items.push({
          id: task.id * 100 + 4,
          type: "completed",
          title: "Task completed",
          description: task.title,
          taskId: task.id,
          taskTitle: task.title,
          projectName: project?.name,
          projectColor: project?.color,
          timestamp: new Date(task.updatedAt || task.createdAt),
          read: inboxState[task.id * 100 + 4]?.read || false,
          starred: inboxState[task.id * 100 + 4]?.starred || false,
        });
      }
    });

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [tasks, projects, members, inboxState]);

  const filtered = useMemo(() => {
    let result = inboxItems.filter(i => !inboxState[i.id]?.archived);
    if (filter === "unread") result = result.filter(i => !i.read);
    if (filter === "starred") result = result.filter(i => i.starred);
    if (filter === "assignments") result = result.filter(i => i.type === "assignment");
    return result;
  }, [inboxItems, filter, inboxState]);

  const updateItem = (id: number, updates: Partial<{ read: boolean; starred: boolean; archived: boolean }>) => {
    const next = { ...inboxState, [id]: { ...inboxState[id], ...updates } };
    setInboxState(next);
    localStorage.setItem("projectos-inbox-state", JSON.stringify(next));
  };

  const markAllRead = () => {
    const next = { ...inboxState };
    filtered.forEach(item => { next[item.id] = { ...next[item.id], read: true }; });
    setInboxState(next);
    localStorage.setItem("projectos-inbox-state", JSON.stringify(next));
  };

  const unreadCount = inboxItems.filter(i => !i.read && !inboxState[i.id]?.archived).length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <InboxIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Inbox</h1>
            <p className="text-sm text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={markAllRead}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg hover:bg-white/5">
          Mark all read
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "unread", "starred", "assignments"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
            {f} {f === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <InboxIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm mt-1">No notifications to show.</p>
          </div>
        ) : (
          filtered.map(item => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.assignment;
            const Icon = config.icon;
            return (
              <Card key={item.id}
                className={`p-4 transition-all cursor-pointer hover:border-primary/30 ${!item.read ? "border-primary/20 bg-primary/5" : ""}`}
                onClick={() => updateItem(item.id, { read: true })}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold">{item.title}</span>
                      {!item.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {item.projectName && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.projectColor }} />
                          <span className="text-[10px] text-muted-foreground">{item.projectName}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); updateItem(item.id, { starred: !item.starred }); }}
                      className={`p-1 rounded-md transition-colors ${item.starred ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}`}>
                      <Star className={`w-3.5 h-3.5 ${item.starred ? "fill-amber-400" : ""}`} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); updateItem(item.id, { archived: true }); }}
                      className="p-1 rounded-md text-muted-foreground/30 hover:text-foreground transition-colors">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
