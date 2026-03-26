import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X, MessageSquare, AlertTriangle, Info, Zap, Trash2, Filter } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_ICONS: Record<string, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  comment: MessageSquare,
  task: Zap,
  reminder: Bell,
  mention: MessageSquare,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-400 bg-blue-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  comment: "text-emerald-400 bg-emerald-500/10",
  task: "text-primary bg-primary/10",
  reminder: "text-violet-400 bg-violet-500/10",
  mention: "text-cyan-400 bg-cyan-500/10",
};

type FilterTab = "all" | "unread" | "comments" | "tasks" | "mentions";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications(1);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const filtered = notifications.filter((n: any) => {
    if (tab === "unread") return !n.read;
    if (tab === "comments") return n.type === "comment";
    if (tab === "tasks") return n.type === "task";
    if (tab === "mentions") return n.type === "mention";
    return true;
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "comments", label: "Comments" },
    { key: "tasks", label: "Tasks" },
    { key: "mentions", label: "Mentions" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-rose-500/30"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[420px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-bold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate(1)}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{tab === "all" ? "No notifications yet" : `No ${tab} notifications`}</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filtered.map((n: any) => {
                    const Icon = TYPE_ICONS[n.type] || Info;
                    const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                    return (
                      <motion.div
                        key={n.id}
                        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-border/30 group transition-colors hover:bg-white/[0.03] ${!n.read ? "bg-primary/[0.03]" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "text-muted-foreground"}`}>{n.title}</p>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!n.read && (
                                <button onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                                  className="p-1 text-muted-foreground hover:text-primary rounded" title="Mark read">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id); }}
                                className="p-1 text-muted-foreground hover:text-red-400 rounded" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-border bg-secondary/10 text-center">
              <span className="text-[10px] text-muted-foreground">{notifications.length} total · {unreadCount} unread</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
