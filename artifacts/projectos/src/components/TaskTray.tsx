import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Minimize2, Maximize2, CheckCircle2, Clock, PlayCircle } from "lucide-react";

interface TrayItem {
  id: number;
  title: string;
  status: string;
  projectName?: string;
  projectColor?: string;
}

const STATUS_DOTS: Record<string, string> = {
  backlog: "bg-slate-400", todo: "bg-blue-400", inprogress: "bg-primary",
  review: "bg-amber-400", done: "bg-emerald-400", blocked: "bg-rose-400",
};

export function TaskTray() {
  const [trayItems, setTrayItems] = useState<TrayItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-task-tray") || "[]"); } catch { return []; }
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem("projectos-task-tray", JSON.stringify(trayItems));
  }, [trayItems]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const task = e.detail;
      if (!task?.id || !task?.title) return;
      setTrayItems(prev => {
        if (prev.some(t => t.id === task.id)) return prev;
        return [...prev, { id: task.id, title: task.title, status: task.status || "todo", projectName: task.projectName, projectColor: task.projectColor }];
      });
    };
    window.addEventListener("task-tray-add" as any, handler);
    return () => window.removeEventListener("task-tray-add" as any, handler);
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const taskId = e.detail?.id;
      if (taskId) setTrayItems(prev => prev.filter(t => t.id !== taskId));
    };
    window.addEventListener("task-tray-remove" as any, handler);
    return () => window.removeEventListener("task-tray-remove" as any, handler);
  }, []);

  const removeItem = (id: number) => {
    setTrayItems(prev => prev.filter(t => t.id !== id));
  };

  const openTask = (id: number) => {
    window.dispatchEvent(new CustomEvent("task-tray-open", { detail: { id } }));
  };

  if (trayItems.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-64 right-0 z-30 pointer-events-none hidden md:block">
      <div className="flex items-end gap-1 px-4 pb-0 pointer-events-auto">
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border border-b-0 rounded-t-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <Minimize2 className="w-3 h-3" />
          Task Tray ({trayItems.length})
          {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {!isCollapsed && (
        <div className="bg-card border-t border-border shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
            {trayItems.map(item => (
              <div key={item.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/50 hover:bg-secondary transition-colors cursor-pointer group shrink-0 max-w-[200px]"
                onClick={() => openTask(item.id)}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[item.status] || "bg-slate-400"}`} />
                <span className="text-xs truncate">{item.title}</span>
                {item.projectColor && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.projectColor }} />}
                <button onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 shrink-0 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => setTrayItems([])}
              className="text-[10px] text-muted-foreground hover:text-rose-400 px-2 py-1 shrink-0 transition-colors">
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
