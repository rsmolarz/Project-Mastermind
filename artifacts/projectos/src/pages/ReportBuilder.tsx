import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { useTimeEntries } from "@/hooks/use-time";
import { Card, Button, Badge, Input } from "@/components/ui/shared";
import { BarChart3, Plus, X, Download, Filter, Table2, PieChart, Save } from "lucide-react";

type ReportConfig = {
  id: number;
  name: string;
  groupBy: "project" | "member" | "status" | "priority" | "type";
  metric: "count" | "points" | "hours" | "budget";
  filters: { projects: number[]; statuses: string[]; priorities: string[] };
  createdAt: string;
};

export default function ReportBuilderPage() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  const { data: entries = [] } = useTimeEntries();
  const [savedReports, setSavedReports] = useState<ReportConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-report-builder") || "[]"); } catch { return []; }
  });
  const [activeReport, setActiveReport] = useState<ReportConfig | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<ReportConfig>>({
    name: "", groupBy: "project", metric: "count", filters: { projects: [], statuses: [], priorities: [] }
  });

  const save = (updated: ReportConfig[]) => { setSavedReports(updated); localStorage.setItem("projectos-report-builder", JSON.stringify(updated)); };

  const createReport = () => {
    if (!form.name?.trim()) return;
    const report = { ...form, id: Date.now(), createdAt: new Date().toISOString() } as ReportConfig;
    save([...savedReports, report]);
    setActiveReport(report);
    setShowCreate(false);
  };

  const reportData = useMemo(() => {
    if (!activeReport) return [];
    let filteredTasks = [...tasks];
    const f = activeReport.filters;
    if (f.projects?.length) filteredTasks = filteredTasks.filter((t: any) => f.projects.includes(t.projectId));
    if (f.statuses?.length) filteredTasks = filteredTasks.filter((t: any) => f.statuses.includes(t.status));
    if (f.priorities?.length) filteredTasks = filteredTasks.filter((t: any) => f.priorities.includes(t.priority));

    const groups: Record<string, { label: string; count: number; points: number; hours: number; color: string }> = {};
    filteredTasks.forEach((task: any) => {
      let key: string;
      let label: string;
      let color = "#6366f1";
      switch (activeReport.groupBy) {
        case "project":
          key = String(task.projectId);
          const p = projects.find((p: any) => p.id === task.projectId);
          label = p?.name || "Unknown";
          color = p?.color || "#6366f1";
          break;
        case "member":
          key = String(task.assigneeIds?.[0] || 0);
          const m = members.find((m: any) => m.id === task.assigneeIds?.[0]);
          label = m?.name || "Unassigned";
          color = m?.color || "#6b7280";
          break;
        case "status": key = task.status; label = task.status; color = "#3b82f6"; break;
        case "priority": key = task.priority; label = task.priority; color = task.priority === "critical" ? "#ef4444" : task.priority === "high" ? "#f97316" : "#3b82f6"; break;
        case "type": key = task.type; label = task.type; color = "#8b5cf6"; break;
        default: key = "all"; label = "All"; break;
      }
      if (!groups[key]) groups[key] = { label, count: 0, points: 0, hours: 0, color };
      groups[key].count++;
      groups[key].points += task.points || 0;
      const taskHours = entries.filter((e: any) => e.taskId === task.id).reduce((a: number, e: any) => a + e.hours, 0);
      groups[key].hours += taskHours;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [activeReport, tasks, projects, members, entries]);

  const maxVal = Math.max(1, ...reportData.map(d => d[activeReport?.metric || "count"] || d.count));

  const exportCsv = () => {
    if (!reportData.length) return;
    const headers = ["Group", "Count", "Points", "Hours"];
    const rows = reportData.map(d => [d.label, d.count, d.points, d.hours.toFixed(1)]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${activeReport?.name || "export"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Report Builder</h1>
            <p className="text-sm text-muted-foreground">Build custom cross-project reports and rollups</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeReport && <Button variant="secondary" onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</Button>}
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Report</Button>
        </div>
      </div>

      {showCreate && (
        <Card className="p-5 border-primary/20">
          <h3 className="font-bold mb-3">Create Report</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Report name" className="col-span-2" />
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Group By</label>
              <div className="flex gap-1 flex-wrap">{(["project", "member", "status", "priority", "type"] as const).map(g => (
                <button key={g} onClick={() => setForm({ ...form, groupBy: g })} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${form.groupBy === g ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>{g}</button>
              ))}</div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Metric</label>
              <div className="flex gap-1">{(["count", "points", "hours"] as const).map(m => (
                <button key={m} onClick={() => setForm({ ...form, metric: m })} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${form.metric === m ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>{m}</button>
              ))}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createReport} disabled={!form.name?.trim()}>Create</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Saved Reports</h3>
          {savedReports.map(r => (
            <Card key={r.id} onClick={() => setActiveReport(r)} className={`p-3 cursor-pointer transition-all ${activeReport?.id === r.id ? "border-primary/30 bg-primary/5" : "hover:border-border/60"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{r.groupBy} × {r.metric}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); save(savedReports.filter(s => s.id !== r.id)); if (activeReport?.id === r.id) setActiveReport(null); }}
                  className="text-muted-foreground/40 hover:text-rose-400"><X className="w-3 h-3" /></button>
              </div>
            </Card>
          ))}
          {savedReports.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No saved reports</p>}
        </div>

        <div className="col-span-3">
          {activeReport ? (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{activeReport.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">Grouped by {activeReport.groupBy} · Metric: {activeReport.metric}</p>
                </div>
              </div>
              <div className="space-y-3">
                {reportData.map((row, i) => {
                  const val = row[activeReport.metric as keyof typeof row] as number || row.count;
                  const pct = (val / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium capitalize truncate">{row.label}</div>
                      <div className="flex-1 h-8 bg-secondary/30 rounded-lg overflow-hidden relative">
                        <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: row.color, opacity: 0.7 }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold">
                          {activeReport.metric === "hours" ? val.toFixed(1) : val}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {reportData.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No data for this report configuration</p>}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground uppercase">
                      <th className="text-left py-2">Group</th><th className="text-right py-2">Tasks</th><th className="text-right py-2">Points</th><th className="text-right py-2">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="py-2 capitalize">{row.label}</td>
                        <td className="py-2 text-right font-mono">{row.count}</td>
                        <td className="py-2 text-right font-mono">{row.points}</td>
                        <td className="py-2 text-right font-mono">{row.hours.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Select or create a report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
