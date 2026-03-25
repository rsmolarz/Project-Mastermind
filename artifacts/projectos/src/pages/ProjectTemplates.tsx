import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Plus, Trash2, X, Copy, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

const PRESET_TEMPLATES = [
  { name: "Software Sprint", icon: "🚀", color: "#3b82f6", category: "engineering", defaultPhase: "Sprint Planning", defaultTasks: [
    { title: "Sprint planning meeting", type: "task", status: "todo", priority: "high", points: 1 },
    { title: "Code review backlog", type: "task", status: "todo", priority: "medium", points: 2 },
    { title: "Deploy to staging", type: "task", status: "todo", priority: "high", points: 3 },
    { title: "QA regression tests", type: "task", status: "todo", priority: "medium", points: 5 },
    { title: "Sprint retrospective", type: "task", status: "todo", priority: "low", points: 1 },
  ] },
  { name: "Marketing Campaign", icon: "📣", color: "#ec4899", category: "marketing", defaultPhase: "Strategy", defaultTasks: [
    { title: "Define campaign goals", type: "task", status: "todo", priority: "high", points: 2 },
    { title: "Create content calendar", type: "task", status: "todo", priority: "medium", points: 3 },
    { title: "Design assets", type: "task", status: "todo", priority: "medium", points: 5 },
    { title: "Launch campaign", type: "task", status: "todo", priority: "critical", points: 3 },
    { title: "Performance review", type: "task", status: "todo", priority: "medium", points: 2 },
  ] },
  { name: "Client Onboarding", icon: "🤝", color: "#22c55e", category: "operations", defaultPhase: "Kickoff", defaultTasks: [
    { title: "Welcome call", type: "task", status: "todo", priority: "high", points: 1 },
    { title: "Gather requirements", type: "task", status: "todo", priority: "high", points: 3 },
    { title: "Setup workspace", type: "task", status: "todo", priority: "medium", points: 2 },
    { title: "Initial deliverable", type: "task", status: "todo", priority: "high", points: 5 },
  ] },
  { name: "Product Launch", icon: "🎯", color: "#f97316", category: "product", defaultPhase: "Pre-Launch", defaultTasks: [
    { title: "Feature freeze", type: "task", status: "todo", priority: "critical", points: 1 },
    { title: "Beta testing", type: "task", status: "todo", priority: "high", points: 5 },
    { title: "Press release draft", type: "task", status: "todo", priority: "medium", points: 3 },
    { title: "Launch day checklist", type: "task", status: "todo", priority: "critical", points: 2 },
    { title: "Post-launch monitoring", type: "task", status: "todo", priority: "high", points: 3 },
  ] },
  { name: "Bug Triage", icon: "🐛", color: "#ef4444", category: "engineering", defaultPhase: "Triage", defaultTasks: [
    { title: "Reproduce reported bugs", type: "bug", status: "todo", priority: "high", points: 2 },
    { title: "Prioritize by severity", type: "task", status: "todo", priority: "high", points: 1 },
    { title: "Fix critical bugs", type: "bug", status: "todo", priority: "critical", points: 8 },
    { title: "Regression testing", type: "task", status: "todo", priority: "medium", points: 3 },
  ] },
  { name: "Design Sprint", icon: "🎨", color: "#a855f7", category: "design", defaultPhase: "Discovery", defaultTasks: [
    { title: "User research", type: "task", status: "todo", priority: "high", points: 3 },
    { title: "Wireframes", type: "task", status: "todo", priority: "medium", points: 5 },
    { title: "High-fidelity mockups", type: "task", status: "todo", priority: "medium", points: 8 },
    { title: "Prototype", type: "task", status: "todo", priority: "high", points: 5 },
    { title: "User testing", type: "task", status: "todo", priority: "high", points: 3 },
  ] },
];

export default function ProjectTemplates() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ["project-templates"], queryFn: () => fetch(`${API}/api/project-templates`, { credentials: "include" }).then(r => r.json()) });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#6366f1");
  const [category, setCategory] = useState("general");

  const createTemplate = useMutation({
    mutationFn: (body: any) => fetch(`${API}/api/project-templates`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-templates"] }); setShowCreate(false); setName(""); setDescription(""); },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => fetch(`${API}/api/project-templates/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-templates"] }),
  });

  const usePreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    createTemplate.mutate({ ...preset, description: `Auto-generated from ${preset.name} preset` });
  };

  const allTemplates = [...templates];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><LayoutTemplate className="w-5 h-5 text-white" /></div>
            Project Templates
          </h1>
          <p className="text-muted-foreground mt-1">Create projects quickly from reusable templates</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-semibold">Create Template</h3><button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
          <div className="grid grid-cols-2 gap-4">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name..." className="px-3 py-2 bg-background border border-border rounded-lg text-sm" />
            <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm">
              <option value="general">General</option><option value="engineering">Engineering</option><option value="marketing">Marketing</option>
              <option value="design">Design</option><option value="operations">Operations</option><option value="product">Product</option>
            </select>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
          <button onClick={() => createTemplate.mutate({ name, description, icon, color, category })} disabled={!name} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">Create</button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Start Presets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_TEMPLATES.map((preset, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{preset.icon}</span>
                <div>
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{preset.category}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-3">{preset.defaultTasks.length} default tasks</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {preset.defaultTasks.slice(0, 3).map((t, j) => (
                  <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full truncate max-w-[140px]">{t.title}</span>
                ))}
                {preset.defaultTasks.length > 3 && <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">+{preset.defaultTasks.length - 3}</span>}
              </div>
              <button onClick={() => usePreset(preset)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-all">
                <Copy className="w-3 h-3" /> Use Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {allTemplates.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Saved Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates.map((t: any) => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-5 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-semibold">{t.name}</span>
                  </div>
                  <button onClick={() => deleteTemplate.mutate(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-400" /></button>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize bg-secondary px-2 py-0.5 rounded-full">{t.category}</span>
                  {t.defaultTasks?.length > 0 && <span>{t.defaultTasks.length} tasks</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
