import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileInput, Plus, Trash2, Eye, Copy, ToggleLeft, ToggleRight, ClipboardList, Link as LinkIcon, ExternalLink } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const fieldTypes = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
];

export default function Forms() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", projectId: "", slug: "", fields: [{ id: "field_1", label: "", type: "short_text", required: true }] as any[] });

  const { data: forms = [] } = useQuery({ queryKey: ["forms"], queryFn: () => apiFetch("/forms") });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch("/projects") });
  const { data: submissions = [] } = useQuery({
    queryKey: ["form-submissions", viewSubmissions],
    queryFn: () => apiFetch(`/forms/${viewSubmissions}/submissions`),
    enabled: viewSubmissions !== null,
  });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/forms", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forms"] }); setShowCreate(false); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => apiFetch(`/forms/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/forms/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms"] }),
  });

  const addField = () => {
    setForm({ ...form, fields: [...form.fields, { id: `field_${form.fields.length + 1}`, label: "", type: "short_text", required: false }] });
  };

  const removeField = (idx: number) => {
    setForm({ ...form, fields: form.fields.filter((_, i) => i !== idx) });
  };

  const updateField = (idx: number, updates: any) => {
    const fields = [...form.fields];
    fields[idx] = { ...fields[idx], ...updates };
    setForm({ ...form, fields });
  };

  const baseUrl = window.location.origin + import.meta.env.BASE_URL;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Intake Forms
            </h1>
            <p className="text-muted-foreground mt-1">Create public forms that auto-generate tasks in your projects</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Form
          </button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><FileInput className="w-5 h-5 text-violet-400" /> Create Form</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Form Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bug Report Form" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">URL Slug</label>
                <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "") })} placeholder="bug-report" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Submit bugs here" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Form Fields</label>
                <button onClick={addField} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add Field</button>
              </div>
              {form.fields.map((field: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-background rounded-xl p-3">
                  <input value={field.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Field label" className="flex-1 bg-transparent border-none text-sm" />
                  <select value={field.type} onChange={e => updateField(i, { type: e.target.value })} className="bg-card border border-border rounded-lg px-2 py-1 text-xs">
                    {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} className="rounded" />
                    Required
                  </label>
                  {form.fields.length > 1 && (
                    <button onClick={() => removeField(i)} className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => create.mutate({ ...form, projectId: parseInt(form.projectId), fields: form.fields.map(f => ({ ...f, id: f.label.toLowerCase().replace(/\s+/g, "_") || f.id })) })} disabled={!form.title || !form.slug || !form.projectId} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Create Form
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {viewSubmissions !== null && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Submissions ({submissions.length})</h3>
              <button onClick={() => setViewSubmissions(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            {submissions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((sub: any) => (
                  <div key={sub.id} className="bg-background rounded-xl p-4 text-sm space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{sub.submitterName || sub.submitterEmail || "Anonymous"}</span>
                      <span>{new Date(sub.createdAt).toLocaleString()}</span>
                    </div>
                    {Object.entries(sub.data as Record<string, any>).map(([k, v]) => (
                      <div key={k}><strong className="capitalize">{k.replace(/_/g, " ")}:</strong> {String(v)}</div>
                    ))}
                    {sub.taskId && <div className="text-xs text-emerald-400">Task #{sub.taskId} created</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {forms.length === 0 && !showCreate && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <FileInput className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No forms yet</p>
              <p className="text-sm">Create intake forms for bug reports, feature requests, or client feedback.</p>
            </div>
          )}
          {forms.map((f: any) => {
            const proj = projects.find((p: any) => p.id === f.projectId);
            return (
              <div key={f.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.active ? "bg-violet-400/10" : "bg-secondary"}`}>
                      <FileInput className={`w-5 h-5 ${f.active ? "text-violet-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {proj && <span>{proj.name}</span>}
                        <span>{f.fields?.length || 0} fields</span>
                        <span>{f.submissionCount} submissions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewSubmissions(f.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="View Submissions">
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(`${baseUrl}api/forms/public/${f.slug}`)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Copy Link">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive.mutate({ id: f.id, active: !f.active })} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title={f.active ? "Deactivate" : "Activate"}>
                      {f.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove.mutate(f.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400" title="Delete">
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
