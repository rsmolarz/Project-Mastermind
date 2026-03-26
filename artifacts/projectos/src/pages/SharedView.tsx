import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Eye, Lock, Clock, AlertCircle } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type SharedViewData = {
  view: { id: number; token: string; projectId: number | null; viewType: string; filters: string };
  tasks: any[];
  project: { name: string; color: string; icon: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8", inprogress: "#3b82f6", review: "#f59e0b", done: "#22c55e", blocked: "#ef4444", backlog: "#64748b"
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e", none: "#94a3b8"
};

export default function SharedView() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharedViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/shared-view/${params.token}`)
      .then(r => { if (!r.ok) throw new Error(r.status === 404 ? "This shared view doesn't exist or has been deactivated" : "Failed to load"); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">View Unavailable</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const statuses = ["backlog", "todo", "inprogress", "review", "done", "blocked"];
  const grouped = statuses.reduce((acc, s) => {
    acc[s] = data.tasks.filter(t => t.status === s);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Read-only shared view</span>
          </div>
          {data.project && (
            <div className="flex items-center gap-2">
              <span style={{ color: data.project.color }}>{data.project.icon}</span>
              <span className="font-semibold">{data.project.name}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{data.tasks.length} tasks</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-6 gap-3">
          {statuses.map(status => (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{status.replace("inprogress", "In Progress")}</span>
                <span className="text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded-full text-muted-foreground">{grouped[status]?.length || 0}</span>
              </div>
              {(grouped[status] || []).map((task: any, i: number) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
                  <div className="text-sm font-medium mb-2 line-clamp-2">{task.title}</div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: PRIORITY_COLORS[task.priority] + "20", color: PRIORITY_COLORS[task.priority] }}>
                      {task.priority}
                    </span>
                    {task.due && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
