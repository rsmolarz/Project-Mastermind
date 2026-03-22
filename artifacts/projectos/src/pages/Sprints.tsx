import { useMemo } from "react";
import { useSprints } from "@/hooks/use-sprints";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Card, Badge, ProgressBar } from "@/components/ui/shared";
import { TrendingDown, BarChart3, Zap, Target, Calendar } from "lucide-react";
import { format, differenceInDays, addDays, isAfter, isBefore, startOfDay } from "date-fns";

export default function Sprints() {
  const { data: sprints = [] } = useSprints();
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();

  const activeSprint = sprints.find(s => s.status === "active") || sprints[0];

  const sprintTasks = useMemo(() => {
    if (!activeSprint) return [];
    return tasks.filter(t => t.sprintId === activeSprint.id);
  }, [activeSprint, tasks]);

  const burndownData = useMemo(() => {
    if (!activeSprint) return [];
    const start = startOfDay(new Date(activeSprint.startDate));
    const end = startOfDay(new Date(activeSprint.endDate));
    const totalDays = Math.max(differenceInDays(end, start), 1);
    const totalPoints = sprintTasks.reduce((s, t) => s + (t.points || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === "done").reduce((s, t) => s + (t.points || 0), 0);

    const data = [];
    for (let i = 0; i <= totalDays; i++) {
      const day = addDays(start, i);
      const idealRemaining = totalPoints - (totalPoints / totalDays) * i;
      const today = startOfDay(new Date());
      const isPast = isBefore(day, today) || day.getTime() === today.getTime();
      const actualRemaining = isPast
        ? totalPoints - (donePoints * (i / Math.max(differenceInDays(today, start), 1)))
        : null;
      data.push({
        day: i,
        date: format(day, "MMM d"),
        ideal: Math.max(0, Math.round(idealRemaining)),
        actual: actualRemaining !== null ? Math.max(0, Math.round(actualRemaining)) : null,
      });
    }
    return data;
  }, [activeSprint, sprintTasks]);

  const velocityData = useMemo(() => {
    return sprints.slice(0, 6).reverse().map(s => {
      const sTasks = tasks.filter(t => t.sprintId === s.id);
      const completed = sTasks.filter(t => t.status === "done").reduce((sum, t) => sum + (t.points || 0), 0);
      const committed = sTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      return { name: s.name.replace("Sprint ", "S"), completed, committed };
    });
  }, [sprints, tasks]);

  const totalPoints = sprintTasks.reduce((s, t) => s + (t.points || 0), 0);
  const donePoints = sprintTasks.filter(t => t.status === "done").reduce((s, t) => s + (t.points || 0), 0);
  const inProgressPoints = sprintTasks.filter(t => t.status === "inprogress").reduce((s, t) => s + (t.points || 0), 0);
  const avgVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((s, v) => s + v.completed, 0) / velocityData.length)
    : 0;

  const maxBurndown = Math.max(...burndownData.map(d => Math.max(d.ideal, d.actual || 0)), 1);
  const maxVelocity = Math.max(...velocityData.flatMap(v => [v.completed, v.committed]), 1);

  return (
    <div className="h-full pt-6 max-w-[1600px] mx-auto w-full px-6 overflow-y-auto pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Sprints</h1>
          <p className="text-muted-foreground mt-1">Track sprint progress, burndown, and team velocity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Points", value: totalPoints, icon: Target, color: "text-primary" },
          { label: "Completed", value: donePoints, icon: Zap, color: "text-emerald-400" },
          { label: "In Progress", value: inProgressPoints, icon: TrendingDown, color: "text-amber-400" },
          { label: "Avg Velocity", value: avgVelocity, icon: BarChart3, color: "text-blue-400" },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Burndown Chart</h2>
            {activeSprint && <Badge color="indigo" className="ml-auto">{activeSprint.name}</Badge>}
          </div>

          <div className="relative h-64">
            <svg viewBox={`0 0 ${burndownData.length * 50} 240`} className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="0" y2="220" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="0" y1="220" x2={burndownData.length * 50} y2="220" stroke="currentColor" className="text-border" strokeWidth="1" />

              {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                <g key={pct}>
                  <line
                    x1="0" y1={220 - pct * 200}
                    x2={burndownData.length * 50} y2={220 - pct * 200}
                    stroke="currentColor" className="text-border/30" strokeWidth="0.5" strokeDasharray="4"
                  />
                  <text x="-5" y={220 - pct * 200 + 4} className="fill-muted-foreground" fontSize="8" textAnchor="end">
                    {Math.round(maxBurndown * pct)}
                  </text>
                </g>
              ))}

              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="6 3"
                opacity="0.5"
                points={burndownData.map((d, i) => `${i * 50 + 25},${220 - (d.ideal / maxBurndown) * 200}`).join(" ")}
              />

              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={burndownData
                  .filter(d => d.actual !== null)
                  .map((d, i) => `${i * 50 + 25},${220 - ((d.actual || 0) / maxBurndown) * 200}`)
                  .join(" ")}
              />

              {burndownData.filter(d => d.actual !== null).map((d, i) => (
                <circle key={i} cx={i * 50 + 25} cy={220 - ((d.actual || 0) / maxBurndown) * 200} r="3" fill="#22c55e" />
              ))}
            </svg>

            <div className="flex items-center gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-6 h-0.5 bg-primary/50" style={{ borderTop: "2px dashed #6366f1" }} />
                Ideal
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                Actual
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="font-display font-bold text-lg">Velocity Chart</h2>
          </div>

          <div className="relative h-64">
            <svg viewBox={`0 0 ${Math.max(velocityData.length, 1) * 80} 240`} className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="220" x2={velocityData.length * 80} y2="220" stroke="currentColor" className="text-border" strokeWidth="1" />

              {velocityData.map((v, i) => {
                const barW = 28;
                const x = i * 80 + 20;
                const committedH = (v.committed / maxVelocity) * 190;
                const completedH = (v.completed / maxVelocity) * 190;
                return (
                  <g key={i}>
                    <rect x={x} y={220 - committedH} width={barW} height={committedH} rx="4" fill="#6366f1" opacity="0.25" />
                    <rect x={x} y={220 - completedH} width={barW} height={completedH} rx="4" fill="#6366f1" />
                    <text x={x + barW / 2} y={235} className="fill-muted-foreground" fontSize="9" textAnchor="middle">{v.name}</text>
                    <text x={x + barW / 2} y={215 - completedH} className="fill-foreground" fontSize="8" textAnchor="middle" fontWeight="bold">{v.completed}</text>
                  </g>
                );
              })}
            </svg>

            <div className="flex items-center gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-3 bg-primary rounded-sm" />
                Completed
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-3 bg-primary/25 rounded-sm" />
                Committed
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg">All Sprints</h2>
        </div>
        <div className="space-y-3">
          {sprints.map(s => {
            const sTasks = tasks.filter(t => t.sprintId === s.id);
            const done = sTasks.filter(t => t.status === "done").length;
            const total = sTasks.length;
            const project = projects.find(p => p.id === s.projectId);
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div key={s.id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{s.name}</span>
                    <Badge color={s.status === "active" ? "green" : s.status === "completed" ? "blue" : "gray"}>{s.status}</Badge>
                    {project && <span className="text-xs text-muted-foreground">{project.name}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {format(new Date(s.startDate), "MMM d")} – {format(new Date(s.endDate), "MMM d")} · {s.goal || "No goal set"}
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
      </Card>
    </div>
  );
}
