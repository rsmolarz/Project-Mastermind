import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus, Trash2, CheckCircle2, Clock, Calendar } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: "Upcoming", color: "text-blue-400", bg: "bg-blue-400/10" },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-400/10" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  missed: { label: "Missed", color: "text-rose-400", bg: "bg-rose-400/10" },
};

export default function Milestones() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", projectId: "", dueDate: "", color: "#6366f1" });

  const { data: milestones = [] } = useQuery({ queryKey: ["milestones"], queryFn: () => apiFetch("/milestones") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch("/projects") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/milestones", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["milestones"] }); setShowCreate(false); setForm({ title: "", description: "", projectId: "", dueDate: "", color: "#6366f1" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiFetch(`/milestones/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/milestones/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones"] }),
  });

  const grouped = {
    upcoming: milestones.filter((m: any) => m.status === "upcoming" || m.status === "in_progress"),
    completed: milestones.filter((m: any) => m.status === "completed"),
    missed: milestones.filter((m: any) => m.status === "missed"),
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Milestones
            </h1>
            <p className="text-muted-foreground mt-1">Track key project checkpoints and deliverables</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Milestone
          </button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Flag className="w-5 h-5 text-violet-400" /> Create Milestone</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="MVP Launch" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Color</label>
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-12 h-9 rounded-lg cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this milestone represent?" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => create.mutate({ ...form, projectId: parseInt(form.projectId), dueDate: form.dueDate || null })} disabled={!form.title || !form.projectId} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Create Milestone
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {grouped.upcoming.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming & In Progress</h2>
            <div className="space-y-3">
              {grouped.upcoming.map((m: any) => {
                const proj = projects.find((p: any) => p.id === m.projectId);
                const sc = statusConfig[m.status] || statusConfig.upcoming;
                const daysLeft = m.dueDate ? Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={m.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: m.color }} />
                        <div>
                          <h3 className="font-semibold">{m.title}</h3>
                          {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {proj && <span>{proj.name}</span>}
                            <span className={`px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                            {m.dueDate && (
                              <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft < 0 ? "text-rose-400" : ""}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(m.dueDate).toLocaleDateString()}
                                {daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "today" : `${Math.abs(daysLeft)}d overdue`})`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateStatus.mutate({ id: m.id, status: "completed" })} className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Mark Complete">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove.mutate(m.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {grouped.completed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed ({grouped.completed.length})</h2>
            <div className="space-y-2">
              {grouped.completed.map((m: any) => {
                const proj = projects.find((p: any) => p.id === m.projectId);
                return (
                  <div key={m.id} className="bg-card border border-border rounded-2xl p-4 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium line-through">{m.title}</span>
                        {proj && <span className="text-xs text-muted-foreground">{proj.name}</span>}
                      </div>
                      <button onClick={() => remove.mutate(m.id)} className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {milestones.length === 0 && !showCreate && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
            <Flag className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">No milestones yet</p>
            <p className="text-sm">Add key checkpoints to track progress toward your project goals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
