import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit3, Eye, FileText, Rocket, Bug, Shield, Zap, AlertTriangle, ArrowDown, Tag, Calendar, ChevronRight } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const typeConfig: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  feature: { label: "Feature", color: "text-emerald-400", icon: Rocket, bgColor: "bg-emerald-500/15 border-emerald-500/30" },
  improvement: { label: "Improvement", color: "text-blue-400", icon: Zap, bgColor: "bg-blue-500/15 border-blue-500/30" },
  bugfix: { label: "Bug Fix", color: "text-amber-400", icon: Bug, bgColor: "bg-amber-500/15 border-amber-500/30" },
  breaking: { label: "Breaking Change", color: "text-rose-400", icon: AlertTriangle, bgColor: "bg-rose-500/15 border-rose-500/30" },
  security: { label: "Security", color: "text-red-400", icon: Shield, bgColor: "bg-red-500/15 border-red-500/30" },
  performance: { label: "Performance", color: "text-violet-400", icon: Zap, bgColor: "bg-violet-500/15 border-violet-500/30" },
  deprecation: { label: "Deprecation", color: "text-gray-400", icon: ArrowDown, bgColor: "bg-gray-500/15 border-gray-500/30" },
};

export default function Changelog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [form, setForm] = useState({ title: "", description: "", version: "", type: "improvement", tags: [] as string[], status: "draft" });
  const [tagInput, setTagInput] = useState("");

  const { data: entries = [] } = useQuery({ queryKey: ["changelog"], queryFn: () => apiFetch("/changelog") });
  const onErr = (err: any) => toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });

  const createEntry = useMutation({
    mutationFn: (data: any) => apiFetch("/changelog", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      setShowCreate(false);
      setForm({ title: "", description: "", version: "", type: "improvement", tags: [], status: "draft" });
      toast({ title: "Entry created" });
    },
    onError: onErr,
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/changelog/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      setEditingId(null);
      toast({ title: "Entry updated" });
    },
    onError: onErr,
  });

  const deleteEntry = useMutation({
    mutationFn: (id: number) => apiFetch(`/changelog/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelog"] }); toast({ title: "Entry deleted" }); },
    onError: onErr,
  });

  const filtered = entries.filter((e: any) => {
    if (filter === "published") return e.status === "published";
    if (filter === "draft") return e.status === "draft";
    return true;
  });

  const grouped = filtered.reduce((acc: Record<string, any[]>, entry: any) => {
    const date = entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-sky-400 to-cyan-500 bg-clip-text text-transparent">
              Changelog
            </h1>
            <p className="text-muted-foreground mt-1">Track what shipped, when, and why</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 w-fit">
          {(["all", "published", "draft"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              {f} {f !== "all" && <span className="text-[10px] ml-1 opacity-60">({entries.filter((e: any) => f === "published" ? e.status === "published" : e.status === "draft").length})</span>}
            </button>
          ))}
        </div>

        {showCreate && (
          <div className="bg-card border border-sky-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">New Changelog Entry</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Added AI Schedule feature" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Version</label>
                <input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="v2.4.0" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what changed and why..." rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(typeConfig).map(([key, tc]) => (
                    <button key={key} onClick={() => setForm({ ...form, type: key })}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${form.type === key ? tc.bgColor : "border-border hover:border-border/80"}`}>
                      <tc.icon className={`w-3 h-3 ${tc.color}`} /> {tc.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Tags</label>
                <div className="flex gap-1 flex-wrap items-center">
                  {form.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-secondary rounded text-[10px] flex items-center gap-1">
                      {t}
                      <button onClick={() => setForm({ ...form, tags: form.tags.filter(x => x !== t) })} className="hover:text-rose-400"><span className="text-xs">×</span></button>
                    </span>
                  ))}
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag..." className="bg-background border border-border rounded px-2 py-0.5 text-[10px] w-20" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createEntry.mutate({ ...form, status: "draft" })} disabled={!form.title || !form.description} className="px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium disabled:opacity-50">Save Draft</button>
              <button onClick={() => createEntry.mutate({ ...form, status: "published" })} disabled={!form.title || !form.description} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">Publish</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-muted-foreground text-sm">Cancel</button>
            </div>
          </div>
        )}

        {filtered.length === 0 && !showCreate ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No changelog entries yet</p>
            <p className="text-sm text-muted-foreground">Track what you ship with changelog entries.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold text-muted-foreground">{date}</h2>
                </div>
                <div className="space-y-3 ml-6 border-l-2 border-border pl-6">
                  {(dateEntries as any[]).map((entry: any) => {
                    const tc = typeConfig[entry.type] || typeConfig.improvement;
                    return (
                      <div key={entry.id} className="bg-card border border-border rounded-2xl p-5 hover:border-sky-500/20 transition-colors group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium ${tc.bgColor}`}>
                                <tc.icon className={`w-3 h-3 ${tc.color}`} /> {tc.label}
                              </span>
                              {entry.version && <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{entry.version}</span>}
                              {entry.status === "draft" && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">Draft</span>}
                            </div>
                            <h3 className="font-semibold text-base">{entry.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{entry.description}</p>
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {(entry.tags as string[]).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-muted-foreground">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {entry.status === "draft" && (
                              <button onClick={() => updateEntry.mutate({ id: entry.id, status: "published" })} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Publish">
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => { if (confirm("Delete?")) deleteEntry.mutate(entry.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
