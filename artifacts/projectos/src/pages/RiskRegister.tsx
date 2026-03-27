import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { Card, Button, Badge, Input } from "@/components/ui/shared";
import { ShieldAlert, Plus, X, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

type Risk = {
  id: number;
  title: string;
  description: string;
  projectId: number | null;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  status: "open" | "mitigating" | "resolved";
  mitigation: string;
  owner: string;
  createdAt: string;
};

const RISK_MATRIX: Record<string, Record<string, { score: number; label: string; color: string }>> = {
  high: { high: { score: 9, label: "Critical", color: "text-rose-400 bg-rose-500/15" }, medium: { score: 6, label: "High", color: "text-amber-400 bg-amber-500/15" }, low: { score: 3, label: "Medium", color: "text-blue-400 bg-blue-500/15" } },
  medium: { high: { score: 6, label: "High", color: "text-amber-400 bg-amber-500/15" }, medium: { score: 4, label: "Medium", color: "text-blue-400 bg-blue-500/15" }, low: { score: 2, label: "Low", color: "text-emerald-400 bg-emerald-500/15" } },
  low: { high: { score: 3, label: "Medium", color: "text-blue-400 bg-blue-500/15" }, medium: { score: 2, label: "Low", color: "text-emerald-400 bg-emerald-500/15" }, low: { score: 1, label: "Minimal", color: "text-slate-400 bg-slate-500/15" } },
};

export default function RiskRegisterPage() {
  const { data: projects = [] } = useProjects();
  const [risks, setRisks] = useState<Risk[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-risks") || "[]"); } catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Risk>>({ title: "", description: "", projectId: null, likelihood: "medium", impact: "medium", status: "open", mitigation: "", owner: "" });

  const save = (updated: Risk[]) => { setRisks(updated); localStorage.setItem("projectos-risks", JSON.stringify(updated)); };

  const createRisk = () => {
    if (!form.title?.trim()) return;
    save([...risks, { ...form, id: Date.now(), createdAt: new Date().toISOString() } as Risk]);
    setForm({ title: "", description: "", projectId: null, likelihood: "medium", impact: "medium", status: "open", mitigation: "", owner: "" });
    setShowCreate(false);
  };

  const updateStatus = (id: number, status: Risk["status"]) => save(risks.map(r => r.id === id ? { ...r, status } : r));
  const deleteRisk = (id: number) => save(risks.filter(r => r.id !== id));

  const filtered = filterStatus ? risks.filter(r => r.status === filterStatus) : risks;
  const openRisks = risks.filter(r => r.status === "open");
  const criticalRisks = risks.filter(r => RISK_MATRIX[r.likelihood]?.[r.impact]?.score >= 6);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Risk Register</h1>
            <p className="text-sm text-muted-foreground">Track and mitigate project risks</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Risk</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-foreground">{risks.length}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Total Risks</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-amber-400">{openRisks.length}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Open</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-rose-400">{criticalRisks.length}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Critical/High</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-emerald-400">{risks.filter(r => r.status === "resolved").length}</div><div className="text-[10px] font-bold uppercase text-muted-foreground">Resolved</div></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold mb-3 uppercase text-muted-foreground tracking-wider">Risk Matrix</h3>
        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
          <div /><div className="font-bold p-2 text-muted-foreground">Low Impact</div><div className="font-bold p-2 text-muted-foreground">Med Impact</div><div className="font-bold p-2 text-muted-foreground">High Impact</div>
          {(["high", "medium", "low"] as const).map(likelihood => (
            <>
              <div key={`label-${likelihood}`} className="font-bold p-2 text-muted-foreground capitalize">{likelihood} Prob</div>
              {(["low", "medium", "high"] as const).map(impact => {
                const cell = RISK_MATRIX[likelihood][impact];
                const count = risks.filter(r => r.likelihood === likelihood && r.impact === impact && r.status !== "resolved").length;
                return (
                  <div key={`${likelihood}-${impact}`} className={`p-3 rounded-lg ${cell.color}`}>
                    <div className="font-bold">{cell.label}</div>
                    {count > 0 && <div className="text-[9px] mt-0.5 font-mono">{count} risk{count > 1 ? "s" : ""}</div>}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </Card>

      <div className="flex gap-2">
        {[null, "open", "mitigating", "resolved"].map(s => (
          <button key={s || "all"} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filterStatus === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {showCreate && (
        <Card className="p-5 border-primary/20">
          <h3 className="font-bold mb-3">Add Risk</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Risk title" />
            <Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Risk owner" />
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="col-span-2" />
            <Input value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} placeholder="Mitigation plan" className="col-span-2" />
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Likelihood</label>
              <div className="flex gap-1 mt-1">{(["low", "medium", "high"] as const).map(l => (
                <button key={l} onClick={() => setForm({ ...form, likelihood: l })} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${form.likelihood === l ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>{l}</button>
              ))}</div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Impact</label>
              <div className="flex gap-1 mt-1">{(["low", "medium", "high"] as const).map(i => (
                <button key={i} onClick={() => setForm({ ...form, impact: i })} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${form.impact === i ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>{i}</button>
              ))}</div>
            </div>
            <select value={form.projectId || ""} onChange={e => setForm({ ...form, projectId: e.target.value ? parseInt(e.target.value) : null })}
              className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm outline-none col-span-2">
              <option value="">No project</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createRisk} disabled={!form.title?.trim()}>Add Risk</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map(risk => {
          const riskLevel = RISK_MATRIX[risk.likelihood]?.[risk.impact];
          const project = projects.find((p: any) => p.id === risk.projectId);
          return (
            <Card key={risk.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm">{risk.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskLevel?.color}`}>{riskLevel?.label} ({riskLevel?.score})</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${risk.status === "open" ? "bg-amber-500/15 text-amber-400" : risk.status === "mitigating" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"}`}>{risk.status}</span>
                    {project && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}
                  </div>
                  {risk.description && <p className="text-xs text-muted-foreground mb-1">{risk.description}</p>}
                  {risk.mitigation && <p className="text-xs text-foreground/70"><span className="font-bold">Mitigation:</span> {risk.mitigation}</p>}
                  {risk.owner && <span className="text-[10px] text-muted-foreground mt-1 block">Owner: {risk.owner}</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {risk.status === "open" && <button onClick={() => updateStatus(risk.id, "mitigating")} className="text-[10px] px-2 py-1 bg-blue-500/15 text-blue-400 rounded-lg hover:bg-blue-500/25">Mitigate</button>}
                  {risk.status === "mitigating" && <button onClick={() => updateStatus(risk.id, "resolved")} className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25">Resolve</button>}
                  <button onClick={() => deleteRisk(risk.id)} className="text-muted-foreground/40 hover:text-rose-400 p-1"><X className="w-3 h-3" /></button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No risks recorded</p>
            <p className="text-sm mt-1">Add risks to track and mitigate them</p>
          </div>
        )}
      </div>
    </div>
  );
}
