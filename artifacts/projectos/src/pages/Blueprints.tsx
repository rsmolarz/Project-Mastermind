import { useState } from "react";
import { Plus, Copy, Trash2, Play, ChevronDown, ChevronRight, CheckSquare, Clock, Tag, Users } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks, useCreateTaskMutation } from "@/hooks/use-tasks";
import { useMembers } from "@/hooks/use-members";

const PRESET_BLUEPRINTS = [
  {
    id: "bp-agile",
    name: "Agile Sprint Project",
    description: "Standard 2-week sprint setup with backlog grooming, sprint planning, review, and retro tasks",
    category: "Engineering",
    tasks: [
      { title: "Sprint Planning", status: "todo", priority: "high", type: "task", points: 2 },
      { title: "Backlog Grooming", status: "todo", priority: "medium", type: "task", points: 1 },
      { title: "Daily Standup Setup", status: "todo", priority: "low", type: "task", points: 1 },
      { title: "Sprint Review", status: "backlog", priority: "medium", type: "task", points: 2 },
      { title: "Sprint Retrospective", status: "backlog", priority: "medium", type: "task", points: 2 },
      { title: "Deploy to Staging", status: "backlog", priority: "high", type: "task", points: 3 },
      { title: "QA Testing Round", status: "backlog", priority: "critical", type: "bug", points: 5 },
    ],
  },
  {
    id: "bp-marketing",
    name: "Marketing Campaign",
    description: "Full campaign launch from strategy to post-launch analysis",
    category: "Marketing",
    tasks: [
      { title: "Campaign Strategy Brief", status: "todo", priority: "critical", type: "task", points: 5 },
      { title: "Target Audience Research", status: "todo", priority: "high", type: "task", points: 3 },
      { title: "Creative Assets Design", status: "backlog", priority: "high", type: "task", points: 8 },
      { title: "Copy & Messaging", status: "backlog", priority: "high", type: "task", points: 5 },
      { title: "Channel Setup (Social, Email, Ads)", status: "backlog", priority: "medium", type: "task", points: 3 },
      { title: "A/B Test Variants", status: "backlog", priority: "medium", type: "improvement", points: 3 },
      { title: "Launch Checklist", status: "backlog", priority: "critical", type: "task", points: 2 },
      { title: "Post-Launch Analysis", status: "backlog", priority: "high", type: "task", points: 3 },
    ],
  },
  {
    id: "bp-onboarding",
    name: "Employee Onboarding",
    description: "Complete new hire onboarding checklist with IT setup, training, and team intros",
    category: "HR",
    tasks: [
      { title: "IT Equipment Setup", status: "todo", priority: "critical", type: "task", points: 2 },
      { title: "Account Provisioning (Email, Slack, etc)", status: "todo", priority: "critical", type: "task", points: 1 },
      { title: "Welcome Package", status: "todo", priority: "medium", type: "task", points: 1 },
      { title: "Team Introduction Meetings", status: "backlog", priority: "high", type: "task", points: 2 },
      { title: "Role & Expectations Review", status: "backlog", priority: "high", type: "task", points: 2 },
      { title: "Tool Training Sessions", status: "backlog", priority: "medium", type: "task", points: 3 },
      { title: "30-Day Check-in", status: "backlog", priority: "medium", type: "task", points: 1 },
      { title: "60-Day Performance Review", status: "backlog", priority: "high", type: "task", points: 2 },
    ],
  },
  {
    id: "bp-product",
    name: "Product Launch",
    description: "End-to-end product launch from ideation to GA release",
    category: "Product",
    tasks: [
      { title: "Product Requirements Document", status: "todo", priority: "critical", type: "feature", points: 8 },
      { title: "Technical Architecture", status: "todo", priority: "critical", type: "task", points: 5 },
      { title: "UI/UX Design", status: "backlog", priority: "high", type: "task", points: 8 },
      { title: "MVP Development", status: "backlog", priority: "critical", type: "feature", points: 13 },
      { title: "Internal Beta Testing", status: "backlog", priority: "high", type: "task", points: 5 },
      { title: "Bug Fixes & Polish", status: "backlog", priority: "high", type: "bug", points: 8 },
      { title: "Documentation & Help Center", status: "backlog", priority: "medium", type: "task", points: 5 },
      { title: "Launch Announcement", status: "backlog", priority: "high", type: "task", points: 3 },
      { title: "GA Release", status: "backlog", priority: "critical", type: "story", points: 2 },
    ],
  },
  {
    id: "bp-bugfix",
    name: "Bug Fix Sprint",
    description: "Focused sprint dedicated to triaging and fixing critical bugs",
    category: "Engineering",
    tasks: [
      { title: "Bug Triage & Prioritization", status: "todo", priority: "critical", type: "task", points: 3 },
      { title: "Critical Bug Fixes", status: "todo", priority: "critical", type: "bug", points: 8 },
      { title: "High Priority Bug Fixes", status: "backlog", priority: "high", type: "bug", points: 5 },
      { title: "Regression Testing", status: "backlog", priority: "high", type: "task", points: 5 },
      { title: "Performance Audit", status: "backlog", priority: "medium", type: "improvement", points: 3 },
      { title: "Hotfix Deploy", status: "backlog", priority: "critical", type: "task", points: 2 },
    ],
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-sky-500/20 text-sky-400",
  none: "bg-gray-500/20 text-gray-400",
};

const TYPE_ICONS: Record<string, string> = {
  task: "📋", bug: "🐛", feature: "✨", story: "📖", improvement: "🔧",
};

export default function Blueprints() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const [customBlueprints, setCustomBlueprints] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-blueprints") || "[]"); } catch { return []; }
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newBp, setNewBp] = useState({ name: "", description: "", category: "Custom" });
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedLog, setAppliedLog] = useState<{ bpName: string; projectName: string; count: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-bp-applied") || "[]"); } catch { return []; }
  });
  const [applyingProgress, setApplyingProgress] = useState(false);
  const createTask = useCreateTaskMutation();

  const allBlueprints = [...PRESET_BLUEPRINTS, ...customBlueprints];

  const saveCustom = (bps: any[]) => {
    setCustomBlueprints(bps);
    localStorage.setItem("projectos-blueprints", JSON.stringify(bps));
  };

  const createFromProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const bp = {
      id: `bp-custom-${Date.now()}`,
      name: `${project.name} Template`,
      description: `Blueprint created from ${project.name} (${projectTasks.length} tasks)`,
      category: "Custom",
      tasks: projectTasks.map(t => ({
        title: t.title,
        status: "backlog",
        priority: t.priority,
        type: t.type,
        points: t.points || 0,
      })),
    };
    saveCustom([...customBlueprints, bp]);
  };

  const createBlank = () => {
    if (!newBp.name.trim()) return;
    const bp = {
      id: `bp-custom-${Date.now()}`,
      name: newBp.name,
      description: newBp.description,
      category: newBp.category || "Custom",
      tasks: [],
    };
    saveCustom([...customBlueprints, bp]);
    setNewBp({ name: "", description: "", category: "Custom" });
    setShowCreate(false);
  };

  const deleteBlueprint = (id: string) => {
    saveCustom(customBlueprints.filter(b => b.id !== id));
  };

  const applyBlueprint = async (bp: any) => {
    if (!selectedProject) return;
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;
    setApplyingProgress(true);
    let created = 0;
    for (const t of bp.tasks) {
      try {
        await new Promise<void>((resolve, reject) => {
          createTask.mutate(
            { data: { title: t.title, status: t.status, priority: t.priority, type: t.type, points: t.points || 0, projectId: selectedProject, tags: ["blueprint", bp.name.toLowerCase().replace(/\s+/g, "-")] } },
            { onSuccess: () => { created++; resolve(); }, onError: reject }
          );
        });
      } catch { /* continue */ }
    }
    const log = { bpName: bp.name, projectName: project.name, count: created };
    const newLog = [...appliedLog, log];
    setAppliedLog(newLog);
    localStorage.setItem("projectos-bp-applied", JSON.stringify(newLog));
    setApplyingId(null);
    setSelectedProject(null);
    setApplyingProgress(false);
  };

  const categories = [...new Set(allBlueprints.map(b => b.category))];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Blueprints</h1>
          <p className="text-sm text-muted-foreground mt-1">Full project templates with pre-built task sets — apply them to any project in one click</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Blueprint
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 bg-card border border-border rounded-xl space-y-3">
          <h3 className="font-bold text-sm">Create Blueprint</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={newBp.name} onChange={e => setNewBp({ ...newBp, name: e.target.value })}
              placeholder="Blueprint name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <input value={newBp.description} onChange={e => setNewBp({ ...newBp, description: e.target.value })}
              placeholder="Description" className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <select value={newBp.category} onChange={e => setNewBp({ ...newBp, category: e.target.value })}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <option>Custom</option><option>Engineering</option><option>Marketing</option><option>HR</option><option>Product</option><option>Operations</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={createBlank} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Create Empty</button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">or clone from project:</span>
              <select onChange={e => e.target.value && createFromProject(Number(e.target.value))}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs" defaultValue="">
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={() => setShowCreate(false)} className="ml-auto text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {appliedLog.length > 0 && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <h4 className="text-xs font-bold text-emerald-400 mb-1">Recently Applied</h4>
          <div className="flex flex-wrap gap-2">
            {appliedLog.slice(-5).reverse().map((log, i) => (
              <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded-lg">
                {log.bpName} → {log.projectName} ({log.count} tasks)
              </span>
            ))}
          </div>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">{cat}</h3>
          <div className="grid gap-3">
            {allBlueprints.filter(b => b.category === cat).map(bp => (
              <div key={bp.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {cat === "Engineering" ? "⚙️" : cat === "Marketing" ? "📢" : cat === "HR" ? "👋" : cat === "Product" ? "🚀" : "📂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{bp.name}</h4>
                      <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{bp.tasks.length} tasks</span>
                      {bp.tasks.reduce((s: number, t: any) => s + (t.points || 0), 0) > 0 && (
                        <span className="text-[10px] font-mono bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">
                          {bp.tasks.reduce((s: number, t: any) => s + (t.points || 0), 0)} pts
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{bp.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setExpanded({ ...expanded, [bp.id]: !expanded[bp.id] })}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5">
                      {expanded[bp.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {applyingId === bp.id ? (
                      <div className="flex items-center gap-2">
                        <select value={selectedProject || ""} onChange={e => setSelectedProject(Number(e.target.value))}
                          className="bg-background border border-border rounded-lg px-2 py-1 text-xs">
                          <option value="">Select project...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => applyBlueprint(bp)} disabled={!selectedProject || applyingProgress}
                          className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                          {applyingProgress ? "Creating..." : "Apply"}
                        </button>
                        <button onClick={() => { setApplyingId(null); setSelectedProject(null); }} className="text-xs text-muted-foreground">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setApplyingId(bp.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors">
                        <Play className="w-3 h-3" /> Apply
                      </button>
                    )}
                    {bp.id.startsWith("bp-custom") && (
                      <button onClick={() => deleteBlueprint(bp.id)} className="text-muted-foreground hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {expanded[bp.id] && (
                  <div className="border-t border-border bg-background/50 p-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1 font-bold">Task</th>
                          <th className="px-2 py-1 font-bold">Type</th>
                          <th className="px-2 py-1 font-bold">Status</th>
                          <th className="px-2 py-1 font-bold">Priority</th>
                          <th className="px-2 py-1 font-bold text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bp.tasks.map((t: any, i: number) => (
                          <tr key={i} className="border-t border-border/30">
                            <td className="px-2 py-1.5 font-medium">{t.title}</td>
                            <td className="px-2 py-1.5">{TYPE_ICONS[t.type] || "📋"} {t.type}</td>
                            <td className="px-2 py-1.5 capitalize">{t.status}</td>
                            <td className="px-2 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</span>
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono">{t.points || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
