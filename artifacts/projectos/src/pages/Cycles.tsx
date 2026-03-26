import { useState } from "react";
import { useSprints } from "@/hooks/use-sprints";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Card, Badge, ProgressBar } from "@/components/ui/shared";
import { RefreshCw, Play, Pause, CheckCircle2, Calendar, TrendingUp, Clock, ChevronRight, Zap, BarChart3 } from "lucide-react";
import { format, addDays, differenceInDays, isAfter, isBefore } from "date-fns";

type Cycle = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  cooldownDays: number;
  status: "upcoming" | "active" | "cooldown" | "completed";
  autoSchedule: boolean;
};

const LS_KEY = "projectos-cycles";

function loadCycles(): Cycle[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveCycles(c: Cycle[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

export default function Cycles() {
  const { data: sprints = [] } = useSprints();
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const [cycles, setCycles] = useState<Cycle[]>(loadCycles);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", durationDays: 14, cooldownDays: 2, autoSchedule: true });

  const today = new Date();

  const createCycle = () => {
    const lastCycle = cycles[cycles.length - 1];
    const startDate = lastCycle 
      ? format(addDays(new Date(lastCycle.endDate), (lastCycle.cooldownDays || 0) + 1), "yyyy-MM-dd")
      : format(today, "yyyy-MM-dd");
    const endDate = format(addDays(new Date(startDate), form.durationDays), "yyyy-MM-dd");
    const newCycle: Cycle = {
      id: Date.now(),
      name: form.name || `Cycle ${cycles.length + 1}`,
      startDate,
      endDate,
      cooldownDays: form.cooldownDays,
      status: cycles.length === 0 ? "active" : "upcoming",
      autoSchedule: form.autoSchedule,
    };
    const next = [...cycles, newCycle];
    setCycles(next);
    saveCycles(next);
    setShowCreate(false);
    setForm({ name: "", durationDays: 14, cooldownDays: 2, autoSchedule: true });
  };

  const getCycleStatus = (c: Cycle) => {
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    const cooldownEnd = addDays(end, c.cooldownDays);
    if (isAfter(today, end) && isBefore(today, cooldownEnd)) return "cooldown";
    if (isAfter(today, cooldownEnd)) return "completed";
    if (isBefore(today, start)) return "upcoming";
    return "active";
  };

  const getCycleTasks = (c: Cycle) => {
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    return tasks.filter(t => {
      if (!t.createdAt) return false;
      const created = new Date(t.createdAt);
      return created >= start && created <= end;
    });
  };

  const activeCycle = cycles.find(c => getCycleStatus(c) === "active" || getCycleStatus(c) === "cooldown");

  const totalCompleted = cycles.reduce((sum, c) => {
    return sum + getCycleTasks(c).filter(t => t.status === "done").length;
  }, 0);

  const avgCycleLength = cycles.length > 0
    ? Math.round(cycles.reduce((s, c) => s + differenceInDays(new Date(c.endDate), new Date(c.startDate)), 0) / cycles.length)
    : 0;

  return (
    <div className="h-full pt-6 max-w-[1600px] mx-auto w-full px-6 overflow-y-auto pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Cycles</h1>
          <p className="text-muted-foreground mt-1">Time-boxed work periods with automatic scheduling and cooldown periods.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
          <RefreshCw className="w-4 h-4" /> New Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Cycles", value: cycles.length, icon: RefreshCw, color: "text-cyan-400" },
          { label: "Active Cycle", value: activeCycle?.name || "None", icon: Play, color: "text-emerald-400" },
          { label: "Tasks Completed", value: totalCompleted, icon: CheckCircle2, color: "text-blue-400" },
          { label: "Avg Duration", value: `${avgCycleLength}d`, icon: Calendar, color: "text-violet-400" },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-display font-bold truncate">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-cyan-400" /> Create Cycle</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={`Cycle ${cycles.length + 1}`}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Duration (days)</label>
              <input type="number" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) || 14 })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Cooldown (days)</label>
              <input type="number" value={form.cooldownDays} onChange={e => setForm({ ...form, cooldownDays: parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.autoSchedule} onChange={e => setForm({ ...form, autoSchedule: e.target.checked })} className="rounded" />
                Auto-schedule next
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createCycle} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">Create Cycle</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
          </div>
        </Card>
      )}

      {activeCycle && (() => {
        const status = getCycleStatus(activeCycle);
        const start = new Date(activeCycle.startDate);
        const end = new Date(activeCycle.endDate);
        const totalDays = differenceInDays(end, start);
        const elapsed = Math.min(differenceInDays(today, start), totalDays);
        const progress = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
        const cycleTasks = getCycleTasks(activeCycle);
        const done = cycleTasks.filter(t => t.status === "done").length;
        const inProgress = cycleTasks.filter(t => t.status === "inprogress").length;

        return (
          <Card className="p-6 mb-6 border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  {status === "cooldown" ? <Pause className="w-5 h-5 text-amber-400" /> : <Play className="w-5 h-5 text-cyan-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{activeCycle.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {format(start, "MMM d")} – {format(end, "MMM d")} · {totalDays} days
                  </span>
                </div>
              </div>
              <Badge color={status === "cooldown" ? "yellow" : "green"}>{status === "cooldown" ? "Cooldown" : "Active"}</Badge>
            </div>
            <ProgressBar progress={progress} heightClass="h-2 mb-3" />
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>{elapsed}/{totalDays} days elapsed</span>
              <span className="text-emerald-400">{done} completed</span>
              <span className="text-blue-400">{inProgress} in progress</span>
              <span>{cycleTasks.length} total tasks</span>
            </div>
          </Card>
        );
      })()}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h2 className="font-display font-bold text-lg">Cycle History</h2>
        </div>
        {cycles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No cycles yet</p>
            <p className="text-sm mt-1">Create your first cycle to start time-boxed work periods.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...cycles].reverse().map(c => {
              const status = getCycleStatus(c);
              const cycleTasks = getCycleTasks(c);
              const done = cycleTasks.filter(t => t.status === "done").length;
              const total = cycleTasks.length;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div key={c.id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    status === "active" ? "bg-emerald-500/10" : status === "cooldown" ? "bg-amber-500/10" : status === "completed" ? "bg-blue-500/10" : "bg-secondary"
                  }`}>
                    <RefreshCw className={`w-4 h-4 ${
                      status === "active" ? "text-emerald-400" : status === "cooldown" ? "text-amber-400" : status === "completed" ? "text-blue-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{c.name}</span>
                      <Badge color={status === "active" ? "green" : status === "cooldown" ? "yellow" : status === "completed" ? "blue" : "gray"}>{status}</Badge>
                      {c.autoSchedule && <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full">auto</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(new Date(c.startDate), "MMM d")} – {format(new Date(c.endDate), "MMM d")} · {differenceInDays(new Date(c.endDate), new Date(c.startDate))}d + {c.cooldownDays}d cooldown
                    </div>
                    <ProgressBar progress={progress} heightClass="h-1.5" />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-display font-bold">{done}/{total}</div>
                    <div className="text-xs text-muted-foreground">tasks done</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
