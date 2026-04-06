import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ThumbsUp, MessageSquare, CheckCircle2, Clock, ArrowRight, ChevronRight, X, Users } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const formatLabels: Record<string, { label: string; description: string; categories: Array<{ key: string; label: string; color: string; emoji: string }> }> = {
  start_stop_continue: {
    label: "Start / Stop / Continue",
    description: "What should we start, stop, and continue doing?",
    categories: [
      { key: "start", label: "Start Doing", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "🚀" },
      { key: "stop", label: "Stop Doing", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", emoji: "🛑" },
      { key: "continue", label: "Continue Doing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "✅" },
    ],
  },
  "4ls": {
    label: "4Ls",
    description: "Liked, Learned, Lacked, Longed For",
    categories: [
      { key: "liked", label: "Liked", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "💚" },
      { key: "learned", label: "Learned", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "📚" },
      { key: "lacked", label: "Lacked", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", emoji: "⚠️" },
      { key: "longed_for", label: "Longed For", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", emoji: "🌟" },
    ],
  },
  mad_sad_glad: {
    label: "Mad / Sad / Glad",
    description: "How did the team feel?",
    categories: [
      { key: "mad", label: "Mad", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", emoji: "😡" },
      { key: "sad", label: "Sad", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "😢" },
      { key: "glad", label: "Glad", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "😊" },
    ],
  },
  went_well_improve_action: {
    label: "Went Well / Improve / Action",
    description: "What went well, what to improve, and what actions to take?",
    categories: [
      { key: "went_well", label: "Went Well", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "✨" },
      { key: "improve", label: "To Improve", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", emoji: "🔧" },
      { key: "action", label: "Action Items", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", emoji: "🎯" },
    ],
  },
  sailboat: {
    label: "Sailboat",
    description: "Wind (helps), Anchor (slows), Rocks (risks), Island (goals)",
    categories: [
      { key: "wind", label: "Wind (Helps Us)", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "💨" },
      { key: "anchor", label: "Anchor (Slows Us)", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", emoji: "⚓" },
      { key: "rocks", label: "Rocks (Risks)", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", emoji: "🪨" },
      { key: "island", label: "Island (Goals)", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "🏝️" },
    ],
  },
  starfish: {
    label: "Starfish",
    description: "5-point reflection: Keep, More, Less, Stop, Start",
    categories: [
      { key: "keep_doing", label: "Keep Doing", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", emoji: "✅" },
      { key: "more_of", label: "More Of", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", emoji: "📈" },
      { key: "less_of", label: "Less Of", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", emoji: "📉" },
      { key: "stop_doing", label: "Stop Doing", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", emoji: "🛑" },
      { key: "start_doing", label: "Start Doing", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", emoji: "🚀" },
    ],
  },
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-amber-500/20 text-amber-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

export default function Retrospectives() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRetro, setSelectedRetro] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", format: "start_stop_continue", projectId: undefined as number | undefined });
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const { data: retros = [] } = useQuery({ queryKey: ["retrospectives"], queryFn: () => apiFetch("/retrospectives") });
  const { data: retroDetail } = useQuery({
    queryKey: ["retrospective", selectedRetro],
    queryFn: () => apiFetch(`/retrospectives/${selectedRetro}`),
    enabled: !!selectedRetro,
  });

  const onErr = (err: any) => toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });

  const createRetro = useMutation({
    mutationFn: (data: any) => apiFetch("/retrospectives", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives"] });
      setShowCreate(false);
      setSelectedRetro(data.id);
      setCreateForm({ title: "", format: "start_stop_continue", projectId: undefined });
      toast({ title: "Retrospective created" });
    },
    onError: onErr,
  });

  const addItem = useMutation({
    mutationFn: ({ retroId, category, content }: { retroId: number; category: string; content: string }) =>
      apiFetch(`/retrospectives/${retroId}/items`, { method: "POST", body: JSON.stringify({ category, content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospective", selectedRetro] });
      setNewItemText({});
    },
    onError: onErr,
  });

  const voteItem = useMutation({
    mutationFn: ({ retroId, itemId }: { retroId: number; itemId: number }) =>
      apiFetch(`/retrospectives/${retroId}/items/${itemId}/vote`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retrospective", selectedRetro] }),
    onError: onErr,
  });

  const updateRetro = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/retrospectives/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives"] });
      queryClient.invalidateQueries({ queryKey: ["retrospective", selectedRetro] });
    },
    onError: onErr,
  });

  const deleteRetro = useMutation({
    mutationFn: (id: number) => apiFetch(`/retrospectives/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retrospectives"] });
      setSelectedRetro(null);
    },
    onError: onErr,
  });

  const deleteItem = useMutation({
    mutationFn: ({ retroId, itemId }: { retroId: number; itemId: number }) =>
      apiFetch(`/retrospectives/${retroId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retrospective", selectedRetro] }),
    onError: onErr,
  });

  if (selectedRetro && retroDetail) {
    const fmt = formatLabels[retroDetail.format] || formatLabels.start_stop_continue;
    const items = (retroDetail.items || []) as any[];

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedRetro(null)} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back
            </button>
            <h1 className="text-2xl font-display font-bold flex-1">{retroDetail.title}</h1>
            <span className={`px-2 py-1 rounded-lg text-xs capitalize ${statusColors[retroDetail.status]}`}>{retroDetail.status.replace("_", " ")}</span>
            {retroDetail.status !== "completed" && (
              <button onClick={() => updateRetro.mutate({ id: retroDetail.id, status: "completed" })} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Complete
              </button>
            )}
            <button onClick={() => { if (confirm("Delete this retrospective?")) deleteRetro.mutate(retroDetail.id); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">{fmt.description}</p>

          <div className={`grid gap-4 ${fmt.categories.length <= 3 ? "grid-cols-3" : fmt.categories.length === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
            {fmt.categories.map(cat => {
              const catItems = items.filter(i => i.category === cat.key).sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
              return (
                <div key={cat.key} className="space-y-3">
                  <div className={`rounded-xl border p-3 ${cat.color}`}>
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <span>{cat.emoji}</span> {cat.label}
                      <span className="text-[10px] ml-auto opacity-60">{catItems.length}</span>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {catItems.map((item: any) => (
                      <div key={item.id} className="bg-card border border-border rounded-xl p-3 group hover:border-border/80 transition-colors">
                        <p className="text-sm mb-2">{item.content}</p>
                        <div className="flex items-center justify-between">
                          <button onClick={() => voteItem.mutate({ retroId: retroDetail.id, itemId: item.id })}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-400 transition-colors">
                            <ThumbsUp className="w-3 h-3" /> {item.votes || 0}
                          </button>
                          <button onClick={() => deleteItem.mutate({ retroId: retroDetail.id, itemId: item.id })}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {retroDetail.status !== "completed" && (
                    <div className="flex gap-1">
                      <input
                        value={newItemText[cat.key] || ""}
                        onChange={e => setNewItemText({ ...newItemText, [cat.key]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newItemText[cat.key]?.trim()) {
                            addItem.mutate({ retroId: retroDetail.id, category: cat.key, content: newItemText[cat.key] });
                          }
                        }}
                        placeholder="Add item..."
                        className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      <button
                        onClick={() => { if (newItemText[cat.key]?.trim()) addItem.mutate({ retroId: retroDetail.id, category: cat.key, content: newItemText[cat.key] }); }}
                        className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
              Retrospectives
            </h1>
            <p className="text-muted-foreground mt-1">Reflect, learn, and improve as a team</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Retrospective
          </button>
        </div>

        {showCreate && (
          <div className="bg-card border border-violet-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">Create Retrospective</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Title</label>
                <input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Sprint 12 Retro" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Format</label>
                <select value={createForm.format} onChange={e => setCreateForm({ ...createForm, format: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {Object.entries(formatLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-2">Preview: {formatLabels[createForm.format]?.description}</label>
              <div className="flex gap-2 flex-wrap">
                {formatLabels[createForm.format]?.categories.map(c => (
                  <span key={c.key} className={`px-2 py-1 rounded-lg text-[10px] border ${c.color}`}>{c.emoji} {c.label}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => createRetro.mutate(createForm)} disabled={!createForm.title} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        )}

        {retros.length === 0 && !showCreate ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No retrospectives yet</p>
            <p className="text-sm text-muted-foreground">Start your first team retrospective to reflect and improve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {retros.map((retro: any) => {
              const fmt = formatLabels[retro.format] || formatLabels.start_stop_continue;
              return (
                <button key={retro.id} onClick={() => setSelectedRetro(retro.id)} className="text-left bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold group-hover:text-violet-400 transition-colors">{retro.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${statusColors[retro.status]}`}>{retro.status.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmt.label}</span>
                    <span>{new Date(retro.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {fmt.categories.map(c => (
                      <span key={c.key} className={`px-1.5 py-0.5 rounded text-[9px] border ${c.color}`}>{c.emoji}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
