import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Trash2, X, Palette } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function Tags() {
  const qc = useQueryClient();
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: () => fetch(`${API}/api/tags`, { credentials: "include" }).then(r => r.json()) });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [category, setCategory] = useState("general");

  const createTag = useMutation({
    mutationFn: (body: any) => fetch(`${API}/api/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); setShowCreate(false); setName(""); },
  });

  const deleteTag = useMutation({
    mutationFn: (id: number) => fetch(`${API}/api/tags/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  const categories = [...new Set(tags.map((t: any) => t.category))];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#14b8a6", "#64748b"];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Tag className="w-5 h-5 text-white" /></div>
            Tags & Labels
          </h1>
          <p className="text-muted-foreground mt-1">Organize tasks and projects with custom tags</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Tag
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Create Tag</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tag name..." className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Color</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
            <option value="general">General</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="department">Department</option>
            <option value="client">Client</option>
          </select>
          <button onClick={() => createTag.mutate({ name, color, category })} disabled={!name} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">Create</button>
        </div>
      )}

      {categories.length > 0 ? categories.map((cat: string) => (
        <div key={cat}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
          <div className="flex flex-wrap gap-2">
            {tags.filter((t: any) => t.category === cat).map((tag: any) => (
              <div key={tag.id} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 group hover:border-primary/30 transition-colors">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium">{tag.name}</span>
                <button onClick={() => deleteTag.mutate(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-muted-foreground hover:text-rose-400" /></button>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <div className="text-center py-16">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No tags created yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tags help you categorize and find tasks quickly</p>
        </div>
      )}
    </div>
  );
}
