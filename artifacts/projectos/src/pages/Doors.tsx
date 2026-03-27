import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { Card, Button, Input, Badge } from "@/components/ui/shared";
import { DoorOpen, Plus, ExternalLink, Trash2, Globe, Github, Figma, FileText, Video, Music, Database, X, Edit2, Save } from "lucide-react";

type Door = {
  id: number;
  title: string;
  url: string;
  icon: string;
  projectId: number | null;
  category: string;
  description: string;
};

const ICON_MAP: Record<string, any> = {
  globe: Globe, github: Github, figma: Figma, docs: FileText, video: Video, music: Music, database: Database
};
const ICON_OPTIONS = ["globe", "github", "figma", "docs", "video", "database"];
const CATEGORIES = ["Design", "Code", "Docs", "Communication", "Analytics", "Other"];

export default function DoorsPage() {
  const { data: projects = [] } = useProjects();
  const [doors, setDoors] = useState<Door[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-doors") || "[]"); } catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", url: "", icon: "globe", projectId: null as number | null, category: "Other", description: "" });
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const save = (updated: Door[]) => {
    setDoors(updated);
    localStorage.setItem("projectos-doors", JSON.stringify(updated));
  };

  const createDoor = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    if (editingId) {
      save(doors.map(d => d.id === editingId ? { ...d, ...form } : d));
      setEditingId(null);
    } else {
      save([...doors, { id: Date.now(), ...form }]);
    }
    setForm({ title: "", url: "", icon: "globe", projectId: null, category: "Other", description: "" });
    setShowCreate(false);
  };

  const startEdit = (door: Door) => {
    setForm({ title: door.title, url: door.url, icon: door.icon, projectId: door.projectId, category: door.category, description: door.description });
    setEditingId(door.id);
    setShowCreate(true);
  };

  const filtered = doors.filter(d => {
    if (filterProject && d.projectId !== filterProject) return false;
    if (filterCategory && d.category !== filterCategory) return false;
    return true;
  });

  const grouped: Record<string, Door[]> = {};
  filtered.forEach(d => {
    const key = d.category || "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <DoorOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Doors</h1>
            <p className="text-sm text-muted-foreground">Quick links hub for external tools and resources</p>
          </div>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingId(null); setForm({ title: "", url: "", icon: "globe", projectId: null, category: "Other", description: "" }); }}>
          <Plus className="w-4 h-4" /> Add Door
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={filterProject || ""} onChange={e => setFilterProject(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs outline-none focus:border-primary">
          <option value="">All Projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCategory(filterCategory === c ? null : c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterCategory === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>

      {showCreate && (
        <Card className="p-5 border-primary/20">
          <h3 className="font-bold mb-3">{editingId ? "Edit Door" : "Add New Door"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Figma Project)" />
            <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="URL (https://...)" />
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
            <select value={form.projectId || ""} onChange={e => setForm({ ...form, projectId: e.target.value ? parseInt(e.target.value) : null })}
              className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm outline-none">
              <option value="">No project</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Icon</label>
              <div className="flex gap-1">
                {ICON_OPTIONS.map(i => {
                  const Icon = ICON_MAP[i] || Globe;
                  return (
                    <button key={i} onClick={() => setForm({ ...form, icon: i })}
                      className={`p-2 rounded-lg transition-colors ${form.icon === i ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground bg-secondary/50"}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Category</label>
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, category: c })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${form.category === c ? "bg-primary/15 text-primary" : "text-muted-foreground bg-secondary/50"}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={createDoor} disabled={!form.title.trim() || !form.url.trim()}>{editingId ? "Save" : "Add"}</Button>
          </div>
        </Card>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No doors yet</p>
          <p className="text-sm mt-1">Add external links for quick access to your team's tools</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, categoryDoors]) => (
          <div key={category}>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryDoors.map(door => {
                const Icon = ICON_MAP[door.icon] || Globe;
                const project = projects.find((p: any) => p.id === door.projectId);
                return (
                  <Card key={door.id} className="p-4 group hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={door.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:text-primary flex items-center gap-1">
                          {door.title} <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                        {door.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{door.description}</p>}
                        {project && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                            <span className="text-[10px] text-muted-foreground">{project.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(door)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => save(doors.filter(d => d.id !== door.id))} className="text-muted-foreground hover:text-rose-400 p-1"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
