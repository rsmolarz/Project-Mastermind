import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Card, Badge, Button } from "@/components/ui/shared";
import { Mountain, ChevronDown, GripVertical } from "lucide-react";

type HillItem = { id: number; title: string; progress: number; projectId: number; color: string };

export default function HillChartPage() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [hillOverrides, setHillOverrides] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-hill-chart") || "{}"); } catch { return {}; }
  });
  const [dragging, setDragging] = useState<number | null>(null);

  const filteredTasks = useMemo(() => {
    let t = tasks.filter((t: any) => t.status !== "done");
    if (selectedProject) t = t.filter((t: any) => t.projectId === selectedProject);
    return t;
  }, [tasks, selectedProject]);

  const hillItems: HillItem[] = useMemo(() => {
    return filteredTasks.map((task: any) => {
      const statusProgress: Record<string, number> = { backlog: 5, todo: 15, inprogress: 40, review: 70, done: 100, blocked: 25 };
      const base = statusProgress[task.status] || 20;
      const progress = hillOverrides[task.id] ?? base;
      const project = projects.find((p: any) => p.id === task.projectId);
      return { id: task.id, title: task.title, progress, projectId: task.projectId, color: project?.color || "#6366f1" };
    });
  }, [filteredTasks, projects, hillOverrides]);

  const getHillY = (progress: number) => {
    const x = progress / 100;
    return Math.sin(x * Math.PI) * 0.85;
  };

  const getHillPath = () => {
    const points: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * 700 + 50;
      const y = 250 - getHillY(i) * 200;
      points.push(`${x},${y}`);
    }
    return `M50,250 ${points.map((p, i) => (i === 0 ? `L${p}` : `L${p}`)).join(" ")} L750,250`;
  };

  const handleHillClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(100, Math.round(((x - 50) / 700) * 100)));
    const next = { ...hillOverrides, [dragging]: progress };
    setHillOverrides(next);
    localStorage.setItem("projectos-hill-chart", JSON.stringify(next));
    setDragging(null);
  };

  const figuredOut = hillItems.filter(i => i.progress <= 50).length;
  const makingItHappen = hillItems.filter(i => i.progress > 50).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Mountain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Hill Chart</h1>
            <p className="text-sm text-muted-foreground">Visualize progress beyond percentages</p>
          </div>
        </div>
        <select value={selectedProject || ""} onChange={e => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm outline-none focus:border-primary">
          <option value="">All Projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{figuredOut}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Figuring it out</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{makingItHappen}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Making it happen</div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Click a dot in the list, then click on the hill to move it</p>
        </div>

        <svg viewBox="0 0 800 300" className="w-full h-auto cursor-pointer" onClick={handleHillClick}>
          <defs>
            <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={getHillPath()} fill="url(#hillGrad)" stroke="rgb(99,102,241)" strokeWidth="2" opacity="0.6" />
          <line x1="400" y1="50" x2="400" y2="250" stroke="rgb(99,102,241)" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          <text x="225" y="270" textAnchor="middle" fill="rgb(161,161,170)" fontSize="11" fontWeight="bold">Figuring things out</text>
          <text x="575" y="270" textAnchor="middle" fill="rgb(161,161,170)" fontSize="11" fontWeight="bold">Making it happen</text>

          {hillItems.map(item => {
            const x = (item.progress / 100) * 700 + 50;
            const y = 250 - getHillY(item.progress) * 200;
            return (
              <g key={item.id}>
                <circle cx={x} cy={y} r={dragging === item.id ? 8 : 6} fill={item.color}
                  stroke={dragging === item.id ? "white" : "transparent"} strokeWidth="2"
                  className="transition-all cursor-pointer hover:r-8" opacity={0.9} />
                <text x={x} y={y - 12} textAnchor="middle" fill="rgb(228,228,231)" fontSize="9"
                  className="pointer-events-none">{item.title.slice(0, 20)}{item.title.length > 20 ? "..." : ""}</text>
              </g>
            );
          })}
        </svg>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wider">Figuring Things Out</h3>
          <div className="space-y-2">
            {hillItems.filter(i => i.progress <= 50).map(item => (
              <div key={item.id} onClick={() => setDragging(dragging === item.id ? null : item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${dragging === item.id ? "bg-primary/15 border border-primary/30" : "hover:bg-white/5"}`}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm truncate flex-1">{item.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{item.progress}%</span>
              </div>
            ))}
            {hillItems.filter(i => i.progress <= 50).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing here yet</p>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider">Making It Happen</h3>
          <div className="space-y-2">
            {hillItems.filter(i => i.progress > 50).map(item => (
              <div key={item.id} onClick={() => setDragging(dragging === item.id ? null : item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${dragging === item.id ? "bg-primary/15 border border-primary/30" : "hover:bg-white/5"}`}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm truncate flex-1">{item.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{item.progress}%</span>
              </div>
            ))}
            {hillItems.filter(i => i.progress > 50).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing here yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
