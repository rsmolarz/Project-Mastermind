import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X, MessageSquare, AlertTriangle, Info, Zap } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  comment: MessageSquare,
  task: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-400 bg-blue-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  comment: "text-emerald-400 bg-emerald-500/10",
  task: "text-primary bg-primary/10",
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications(1);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-display font-bold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate(1)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const Icon = TYPE_ICONS[n.type] || Info;
                const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/30 cursor-pointer transition-colors hover:bg-white/5 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "text-muted-foreground"}`}>{n.title}</p>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
