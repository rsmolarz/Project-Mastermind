import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useMembers } from "@/hooks/use-members";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Heart, ShieldAlert, Clock, CheckSquare, ArrowUpRight, ArrowDownRight } from "lucide-react";

type HealthOverride = { projectId: number; status: "green" | "yellow" | "red"; note: string };

export default function ProjectHealth() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const [overrides, setOverrides] = useState<HealthOverride[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-health-overrides") || "[]"); } catch { return []; }
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<"green" | "yellow" | "red">("green");

  const getProjectHealth = (projectId: number) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const total = projectTasks.length;
    if (total === 0) return { score: 0, status: "gray" as const, label: "No Tasks", details: [] };

    const done = projectTasks.filter(t => t.status === "done").length;
    const blocked = projectTasks.filter(t => t.status === "blocked").length;
    const overdue = projectTasks.filter(t => t.due && new Date(t.due) < new Date() && t.status !== "done").length;
    const critical = projectTasks.filter(t => t.priority === "critical" && t.status !== "done").length;
    const inProgress = projectTasks.filter(t => t.status === "inprogress").length;

    const completionRate = done / total;
    const blockedRate = blocked / total;
    const overdueRate = overdue / total;

    let score = 100;
    score -= blockedRate * 40;
    score -= overdueRate * 30;
    score -= (critical / Math.max(total, 1)) * 20;
    if (completionRate > 0.7) score += 10;
    if (inProgress === 0 && done < total) score -= 15;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const status = score >= 75 ? "green" as const : score >= 50 ? "yellow" as const : "red" as const;
    const details = [
      { label: "Completion", value: `${Math.round(completionRate * 100)}%`, trend: completionRate > 0.5 ? "up" : "flat" },
      { label: "Blocked", value: String(blocked), trend: blocked > 0 ? "down" : "flat" },
      { label: "Overdue", value: String(overdue), trend: overdue > 0 ? "down" : "flat" },
      { label: "Critical Open", value: String(critical), trend: critical > 0 ? "down" : "flat" },
      { label: "In Progress", value: String(inProgress), trend: inProgress > 0 ? "up" : "flat" },
    ];
    return { score, status, label: status === "green" ? "On Track" : status === "yellow" ? "At Risk" : "Off Track", details, total, done, blocked, overdue };
  };

  const saveOverride = (projectId: number) => {
    const updated = overrides.filter(o => o.projectId !== projectId);
    updated.push({ projectId, status: editStatus, note: editNote });
    setOverrides(updated);
    localStorage.setItem("projectos-health-overrides", JSON.stringify(updated));
    setEditingId(null);
    setEditNote("");
  };

  const getEffectiveStatus = (projectId: number, calculated: ReturnType<typeof getProjectHealth>) => {
    const override = overrides.find(o => o.projectId === projectId);
    return override || { status: calculated.status, note: "" };
  };

  const STATUS_COLORS = {
    green: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
    yellow: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
    red: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
    gray: { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30", dot: "bg-gray-400" },
  };

  const projectHealthData = projects.map(p => ({
    project: p,
    health: getProjectHealth(p.id),
    effective: getEffectiveStatus(p.id, getProjectHealth(p.id)),
  }));

  const greenCount = projectHealthData.filter(d => d.effective.status === "green").length;
  const yellowCount = projectHealthData.filter(d => d.effective.status === "yellow").length;
  const redCount = projectHealthData.filter(d => d.effective.status === "red").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-3">
          <Heart className="w-6 h-6 text-rose-400" /> Project Health Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time health scores across all projects based on completion, blockers, overdue items, and risk</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-display font-bold">{projects.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Projects</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-emerald-400">{greenCount}</div>
          <div className="text-xs text-emerald-400 mt-1">On Track</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-amber-400">{yellowCount}</div>
          <div className="text-xs text-amber-400 mt-1">At Risk</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-rose-400">{redCount}</div>
          <div className="text-xs text-rose-400 mt-1">Off Track</div>
        </div>
      </div>

      <div className="space-y-3">
        {projectHealthData.sort((a, b) => {
          const order = { red: 0, yellow: 1, green: 2, gray: 3 };
          return (order[a.effective.status as keyof typeof order] ?? 3) - (order[b.effective.status as keyof typeof order] ?? 3);
        }).map(({ project, health, effective }) => {
          const colors = STATUS_COLORS[effective.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.gray;
          return (
            <div key={project.id} className={`bg-card border ${colors.border} rounded-xl p-5`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  <div className="text-2xl font-display font-bold" style={{ color: project.color }}>{health.score}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                    <h3 className="font-bold">{project.name}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {health.label}
                    </span>
                    {effective.note && (
                      <span className="text-xs text-muted-foreground italic ml-2">"{effective.note}"</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {health.details?.map((d, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">{d.label}:</span>
                        <span className={`font-bold ${d.trend === "down" ? "text-rose-400" : d.trend === "up" ? "text-emerald-400" : "text-foreground"}`}>
                          {d.value}
                        </span>
                        {d.trend === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
                        {d.trend === "down" && <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingId === project.id ? (
                    <div className="flex items-center gap-2">
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)}
                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs">
                        <option value="green">On Track</option>
                        <option value="yellow">At Risk</option>
                        <option value="red">Off Track</option>
                      </select>
                      <input value={editNote} onChange={e => setEditNote(e.target.value)}
                        placeholder="Status note..." className="bg-background border border-border rounded-lg px-2 py-1 text-xs w-40" />
                      <button onClick={() => saveOverride(project.id)} className="text-xs text-primary font-bold">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(project.id); setEditStatus(effective.status as any); setEditNote(effective.note || ""); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-white/5">
                      Override
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${health.score}%`,
                      background: effective.status === "green" ? "linear-gradient(90deg, #10b981, #34d399)"
                        : effective.status === "yellow" ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : effective.status === "red" ? "linear-gradient(90deg, #ef4444, #f87171)"
                        : "linear-gradient(90deg, #6b7280, #9ca3af)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No projects yet</p>
          <p className="text-sm">Create projects and tasks to see health metrics</p>
        </div>
      )}
    </div>
  );
}
