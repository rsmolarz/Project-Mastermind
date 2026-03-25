import { useQuery } from "@tanstack/react-query";
import { Activity, User, CheckCircle2, MessageSquare, FileText, Zap, Clock, GitBranch } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

const actionIcons: Record<string, any> = {
  created: CheckCircle2,
  updated: Zap,
  status_updated: Activity,
  comment_added: MessageSquare,
  document_updated: FileText,
  assigned: User,
  completed: CheckCircle2,
  time_logged: Clock,
};

const actionColors: Record<string, string> = {
  created: "text-emerald-400 bg-emerald-500/20",
  updated: "text-blue-400 bg-blue-500/20",
  status_updated: "text-amber-400 bg-amber-500/20",
  comment_added: "text-violet-400 bg-violet-500/20",
  document_updated: "text-cyan-400 bg-cyan-500/20",
  assigned: "text-pink-400 bg-pink-500/20",
  completed: "text-emerald-400 bg-emerald-500/20",
  time_logged: "text-orange-400 bg-orange-500/20",
};

export default function ActivityFeed() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => fetch(`${API}/api/activity`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => fetch(`${API}/api/members`, { credentials: "include" }).then(r => r.json()),
  });

  const getMember = (id: number) => members.find((m: any) => m.id === id);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const groupByDay = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const day = new Date(item.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(item);
    });
    return groups;
  };

  const grouped = groupByDay(activities);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
          Activity Feed
        </h1>
        <p className="text-muted-foreground mt-1">Everything happening across all projects</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading activity...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-lg font-semibold">No activity yet</p>
          <p className="text-muted-foreground text-sm mt-1">Activity will show up here as your team works</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">{day}</div>
            <div className="space-y-1">
              {items.map((item: any) => {
                const Icon = actionIcons[item.action] || Activity;
                const colorClass = actionColors[item.action] || "text-muted-foreground bg-secondary";
                const member = getMember(item.actorId);
                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{member?.name || `User ${item.actorId}`}</span>
                        <span className="text-muted-foreground"> {item.action.replace(/_/g, " ")} </span>
                        <span className="font-medium capitalize">{item.entityType}</span>
                        {item.details?.title && <span className="text-muted-foreground"> "{item.details.title}"</span>}
                        {item.details?.content && <span className="text-muted-foreground"> — {(item.details.content as string).substring(0, 60)}...</span>}
                        {item.details?.from && <span className="text-muted-foreground"> from <span className="text-foreground">{item.details.from}</span> to <span className="text-foreground">{item.details.to}</span></span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatTime(item.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
