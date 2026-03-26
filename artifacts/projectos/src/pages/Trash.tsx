import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, AlertTriangle, Archive, CheckCircle2, FolderOpen, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function Trash() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"trash" | "archived">("trash");
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const { data } = useQuery({ queryKey: ["trash"], queryFn: () => apiFetch("/trash") });

  const restoreTask = useMutation({
    mutationFn: (id: number) => apiFetch(`/trash/tasks/${id}/restore`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trash"] }); queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const restoreProject = useMutation({
    mutationFn: (id: number) => apiFetch(`/trash/projects/${id}/restore`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trash"] }); queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });

  const permanentDeleteTask = useMutation({
    mutationFn: (id: number) => apiFetch(`/trash/tasks/${id}/permanent`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash"] }),
  });

  const permanentDeleteProject = useMutation({
    mutationFn: (id: number) => apiFetch(`/trash/projects/${id}/permanent`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash"] }),
  });

  const unarchiveTask = useMutation({
    mutationFn: (id: number) => apiFetch(`/tasks/${id}/unarchive`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trash"] }); queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const unarchiveProject = useMutation({
    mutationFn: (id: number) => apiFetch(`/projects/${id}/unarchive`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trash"] }); queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });

  const emptyTrash = useMutation({
    mutationFn: () => apiFetch("/trash/empty", { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trash"] }); setConfirmEmpty(false); },
  });

  const trashTasks = data?.trash?.tasks || [];
  const trashProjects = data?.trash?.projects || [];
  const archivedTasks = data?.archived?.tasks || [];
  const archivedProjects = data?.archived?.projects || [];
  const trashCount = trashTasks.length + trashProjects.length;
  const archiveCount = archivedTasks.length + archivedProjects.length;

  const PRIORITY_COLORS: Record<string, string> = { critical: "text-rose-400", high: "text-amber-400", medium: "text-blue-400", low: "text-slate-400" };
  const STATUS_COLORS: Record<string, string> = { backlog: "bg-slate-400", todo: "bg-blue-400", inprogress: "bg-violet-400", review: "bg-amber-400", done: "bg-emerald-400", blocked: "bg-rose-400" };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
              Trash & Archive
            </h1>
            <p className="text-muted-foreground mt-1">Recover deleted items or browse archived content</p>
          </div>
          {tab === "trash" && trashCount > 0 && (
            <button onClick={() => setConfirmEmpty(true)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-500/20 border border-rose-500/20">
              <Trash2 className="w-4 h-4" /> Empty Trash
            </button>
          )}
        </div>

        {confirmEmpty && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-sm">Permanently delete all {trashCount} item(s)? This cannot be undone.</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => emptyTrash.mutate()} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-medium">Delete All</button>
              <button onClick={() => setConfirmEmpty(false)} className="px-3 py-1.5 bg-secondary rounded-lg text-xs text-muted-foreground">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
          <button onClick={() => setTab("trash")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === "trash" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Trash2 className="w-4 h-4" /> Trash {trashCount > 0 && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 rounded-full">{trashCount}</span>}
          </button>
          <button onClick={() => setTab("archived")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === "archived" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Archive className="w-4 h-4" /> Archived {archiveCount > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded-full">{archiveCount}</span>}
          </button>
        </div>

        {tab === "trash" && (
          <div className="space-y-3">
            {trashCount === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">Trash is empty</p>
                <p className="text-sm">Deleted tasks and projects will appear here for recovery</p>
              </div>
            ) : (
              <>
                {trashProjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Projects</h3>
                    {trashProjects.map((p: any) => (
                      <div key={`p-${p.id}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between mb-2 group hover:border-violet-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <div className="text-[10px] text-muted-foreground">Deleted {formatDistanceToNow(new Date(p.deletedAt), { addSuffix: true })}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => restoreProject.mutate(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button onClick={() => permanentDeleteProject.mutate(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-xs hover:bg-rose-500/20">
                            <X className="w-3 h-3" /> Delete Forever
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {trashTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tasks</h3>
                    {trashTasks.map((t: any) => (
                      <div key={`t-${t.id}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between mb-2 group hover:border-violet-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[t.status] || "bg-gray-400"}`} />
                          <div>
                            <span className="font-medium">{t.title}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className={PRIORITY_COLORS[t.priority]}>{t.priority}</span>
                              <span>·</span>
                              <span>Deleted {formatDistanceToNow(new Date(t.deletedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => restoreTask.mutate(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button onClick={() => permanentDeleteTask.mutate(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-xs hover:bg-rose-500/20">
                            <X className="w-3 h-3" /> Delete Forever
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "archived" && (
          <div className="space-y-3">
            {archiveCount === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No archived items</p>
                <p className="text-sm">Archive completed projects and tasks to keep your workspace clean</p>
              </div>
            ) : (
              <>
                {archivedProjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Archived Projects</h3>
                    {archivedProjects.map((p: any) => (
                      <div key={`ap-${p.id}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between mb-2 group hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <div className="text-[10px] text-muted-foreground">Archived {formatDistanceToNow(new Date(p.archivedAt), { addSuffix: true })}</div>
                          </div>
                        </div>
                        <button onClick={() => unarchiveProject.mutate(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-all">
                          <RotateCcw className="w-3 h-3" /> Unarchive
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {archivedTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Archived Tasks</h3>
                    {archivedTasks.map((t: any) => (
                      <div key={`at-${t.id}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between mb-2 group hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-medium">{t.title}</span>
                            <div className="text-[10px] text-muted-foreground">Archived {formatDistanceToNow(new Date(t.archivedAt), { addSuffix: true })}</div>
                          </div>
                        </div>
                        <button onClick={() => unarchiveTask.mutate(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-all">
                          <RotateCcw className="w-3 h-3" /> Unarchive
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
