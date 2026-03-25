import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Plus, Trash2, TrendingUp, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  on_track: { label: "On Track", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  at_risk: { label: "At Risk", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertTriangle },
  off_track: { label: "Off Track", color: "text-rose-400", bg: "bg-rose-400/10", icon: XCircle },
  completed: { label: "Completed", color: "text-blue-400", bg: "bg-blue-400/10", icon: TrendingUp },
};

export default function ProjectUpdates() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [form, setForm] = useState({ projectId: "", authorId: "", status: "on_track", title: "", content: "", highlights: [""], blockers: [""], nextSteps: [""] });

  const { data: updates = [] } = useQuery({
    queryKey: ["project-updates", filterProject],
    queryFn: () => apiFetch(`/project-updates${filterProject ? `?projectId=${filterProject}` : ""}`),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch("/projects") });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => apiFetch("/members") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/project-updates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-updates"] }); setShowCreate(false); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/project-updates/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-updates"] }),
  });

  const updateList = (field: string, idx: number, value: string) => {
    const list = [...(form as any)[field]];
    list[idx] = value;
    setForm({ ...form, [field]: list });
  };
  const addToList = (field: string) => setForm({ ...form, [field]: [...(form as any)[field], ""] });
  const removeFromList = (field: string, idx: number) => setForm({ ...form, [field]: (form as any)[field].filter((_: any, i: number) => i !== idx) });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Project Updates
            </h1>
            <p className="text-muted-foreground mt-1">Periodic status reports on project health and progress</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Post Update
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setFilterProject("")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!filterProject ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground"}`}>All</button>
          {projects.map((p: any) => (
            <button key={p.id} onClick={() => setFilterProject(String(p.id))} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filterProject === String(p.id) ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground"}`}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-400" /> Post Status Update</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Author</label>
                <select value={form.authorId} onChange={e => setForm({ ...form, authorId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Weekly Update - Week 12" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Summary</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Overall progress summary..." className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none" />
            </div>
            {(["highlights", "blockers", "nextSteps"] as const).map(field => (
              <div key={field}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground capitalize">{field === "nextSteps" ? "Next Steps" : field}</label>
                  <button onClick={() => addToList(field)} className="text-xs text-primary hover:underline">+ Add</button>
                </div>
                {(form[field] as string[]).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input value={item} onChange={e => updateList(field, i, e.target.value)} placeholder={`${field === "nextSteps" ? "Next step" : field.slice(0, -1)}...`} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                    {(form[field] as string[]).length > 1 && (
                      <button onClick={() => removeFromList(field, i)} className="text-muted-foreground hover:text-rose-400"><XCircle className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => create.mutate({ ...form, projectId: parseInt(form.projectId), authorId: parseInt(form.authorId), highlights: form.highlights.filter(Boolean), blockers: form.blockers.filter(Boolean), nextSteps: form.nextSteps.filter(Boolean) })} disabled={!form.projectId || !form.authorId || !form.title} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Post Update
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {updates.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No updates yet</p>
              <p className="text-sm">Post periodic status reports to keep your team informed.</p>
            </div>
          )}
          {updates.map((u: any) => {
            const sc = statusConfig[u.status] || statusConfig.on_track;
            const StatusIcon = sc.icon;
            const proj = projects.find((p: any) => p.id === u.projectId);
            return (
              <div key={u.id} className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <StatusIcon className={`w-5 h-5 ${sc.color}`} />
                      <h3 className="font-semibold text-lg">{u.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {proj && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />{proj.name}</span>}
                      <span>{u.author?.name || "Unknown"}</span>
                      <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => remove.mutate(u.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {u.content && <p className="text-sm text-muted-foreground">{u.content}</p>}
                <div className="grid grid-cols-3 gap-4">
                  {(u.highlights as string[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-400 mb-1">Highlights</h4>
                      <ul className="space-y-1">{(u.highlights as string[]).map((h, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-emerald-400 mt-0.5">+</span>{h}</li>)}</ul>
                    </div>
                  )}
                  {(u.blockers as string[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-rose-400 mb-1">Blockers</h4>
                      <ul className="space-y-1">{(u.blockers as string[]).map((b, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-rose-400 mt-0.5">!</span>{b}</li>)}</ul>
                    </div>
                  )}
                  {(u.nextSteps as string[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-blue-400 mb-1">Next Steps</h4>
                      <ul className="space-y-1">{(u.nextSteps as string[]).map((n, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-blue-400 mt-0.5">&rarr;</span>{n}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
