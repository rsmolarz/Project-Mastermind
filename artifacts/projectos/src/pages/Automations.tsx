import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Plus, Play, Pause, Trash2, Settings2, Clock, Hash, ChevronRight } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const triggerLabels: Record<string, string> = {
  task_created: "When a task is created",
  task_status_changed: "When task status changes",
  task_assigned: "When a task is assigned",
  task_completed: "When a task is completed",
  task_overdue: "When a task becomes overdue",
  sprint_started: "When a sprint starts",
  sprint_completed: "When a sprint completes",
};

const actionLabels: Record<string, string> = {
  change_status: "Change task status",
  change_priority: "Change priority",
  assign: "Assign to member",
  notify: "Send notification",
};

export default function Automations() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "task_created", projectId: "", actions: [{ type: "notify", params: { title: "", message: "" } }] });

  const { data: automations = [] } = useQuery({ queryKey: ["automations"], queryFn: () => apiFetch("/automations") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch("/projects") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/automations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); setShowCreate(false); setForm({ name: "", trigger: "task_created", projectId: "", actions: [{ type: "notify", params: { title: "", message: "" } }] }); },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiFetch(`/automations/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/automations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const test = useMutation({
    mutationFn: (id: number) => apiFetch(`/automations/${id}/test`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Automations
            </h1>
            <p className="text-muted-foreground mt-1">Create rules that automate your workflow — "When X happens, do Y"</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Automation
          </button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Create Automation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Auto-assign bugs" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project (optional)</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">All Projects</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">When this happens...</label>
              <select value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Then do this...</label>
              <select value={form.actions[0]?.type || "notify"} onChange={e => setForm({ ...form, actions: [{ type: e.target.value, params: {} }] })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.actions[0]?.type === "change_status" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">New Status</label>
                <select onChange={e => setForm({ ...form, actions: [{ ...form.actions[0], params: { status: e.target.value } }] })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {["backlog", "todo", "in_progress", "review", "done", "blocked"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
            )}
            {form.actions[0]?.type === "notify" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Notification Title</label>
                  <input onChange={e => setForm({ ...form, actions: [{ ...form.actions[0], params: { ...form.actions[0].params, title: e.target.value } }] })} placeholder="Task update" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Message</label>
                  <input onChange={e => setForm({ ...form, actions: [{ ...form.actions[0], params: { ...form.actions[0].params, message: e.target.value } }] })} placeholder="A task was updated" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => create.mutate({ name: form.name, trigger: form.trigger, projectId: form.projectId ? parseInt(form.projectId) : null, actions: form.actions })} disabled={!form.name} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Create Automation
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {automations.length === 0 && !showCreate && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No automations yet</p>
              <p className="text-sm">Create your first rule to automate repetitive tasks.</p>
            </div>
          )}
          {automations.map((auto: any) => {
            const proj = projects.find((p: any) => p.id === auto.projectId);
            return (
              <div key={auto.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${auto.enabled ? "bg-amber-400/10" : "bg-secondary"}`}>
                      <Zap className={`w-5 h-5 ${auto.enabled ? "text-amber-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{auto.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{triggerLabels[auto.trigger] || auto.trigger}</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>{auto.actions?.map((a: any) => actionLabels[a.type] || a.type).join(", ")}</span>
                        {proj && <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">{proj.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mr-4">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{auto.runCount} runs</span>
                      {auto.lastRunAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last: {new Date(auto.lastRunAt).toLocaleDateString()}</span>}
                    </div>
                    <button onClick={() => test.mutate(auto.id)} className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Test Run">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggle.mutate({ id: auto.id, enabled: !auto.enabled })} className={`p-2 rounded-lg ${auto.enabled ? "hover:bg-amber-500/10 text-amber-400" : "hover:bg-secondary text-muted-foreground"}`} title={auto.enabled ? "Disable" : "Enable"}>
                      {auto.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove.mutate(auto.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
