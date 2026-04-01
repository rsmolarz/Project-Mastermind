import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Workflow, Plus, Play, Pause, Trash2, ChevronRight, Sparkles, Clock, Hash, CheckCircle2, XCircle, ArrowRight, Zap, Brain, Mail, Bell, Filter, FileText, BookOpen } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const stepTypes = [
  { type: "ai_generate", label: "AI Generate", icon: Sparkles, color: "text-violet-400", desc: "Generate content with AI" },
  { type: "ai_summarize", label: "AI Summarize", icon: Brain, color: "text-blue-400", desc: "Summarize text or data" },
  { type: "ai_classify", label: "AI Classify", icon: Filter, color: "text-amber-400", desc: "Categorize and tag content" },
  { type: "ai_extract", label: "AI Extract", icon: FileText, color: "text-cyan-400", desc: "Extract structured data" },
  { type: "condition", label: "Condition", icon: ArrowRight, color: "text-emerald-400", desc: "Branch based on conditions" },
  { type: "notification", label: "Notification", icon: Bell, color: "text-rose-400", desc: "Send a notification" },
  { type: "email", label: "Send Email", icon: Mail, color: "text-indigo-400", desc: "Send an email" },
  { type: "delay", label: "Delay", icon: Clock, color: "text-orange-400", desc: "Wait before next step" },
];

const triggerOptions = [
  { value: "manual", label: "Manual Trigger" },
  { value: "schedule", label: "On Schedule" },
  { value: "webhook", label: "Webhook" },
  { value: "task_created", label: "Task Created" },
  { value: "task_completed", label: "Task Completed" },
  { value: "email_received", label: "Email Received" },
  { value: "form_submitted", label: "Form Submitted" },
];

const workflowTemplates = [
  { name: "Content Pipeline", description: "Generate, review, and publish content automatically", trigger: "manual", steps: [
    { id: "s1", type: "ai_generate", label: "Draft Content", config: { prompt: "Write a blog post about {{topic}}" }, position: { x: 0, y: 0 } },
    { id: "s2", type: "ai_summarize", label: "Create Summary", config: {}, position: { x: 0, y: 100 } },
    { id: "s3", type: "notification", label: "Notify Team", config: {}, position: { x: 0, y: 200 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }], icon: "📝", color: "border-violet-500/30" },
  { name: "Email Auto-Responder", description: "Classify incoming emails and send smart replies", trigger: "email_received", steps: [
    { id: "s1", type: "ai_classify", label: "Classify Email", config: {}, position: { x: 0, y: 0 } },
    { id: "s2", type: "condition", label: "Check Priority", config: {}, position: { x: 0, y: 100 } },
    { id: "s3", type: "ai_generate", label: "Draft Reply", config: { prompt: "Draft a professional reply" }, position: { x: 0, y: 200 } },
    { id: "s4", type: "email", label: "Send Reply", config: {}, position: { x: 0, y: 300 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }, { from: "s3", to: "s4" }], icon: "📧", color: "border-blue-500/30" },
  { name: "Task Triage", description: "Auto-classify and route new tasks with AI", trigger: "task_created", steps: [
    { id: "s1", type: "ai_classify", label: "Classify Task", config: {}, position: { x: 0, y: 0 } },
    { id: "s2", type: "ai_extract", label: "Extract Details", config: {}, position: { x: 0, y: 100 } },
    { id: "s3", type: "notification", label: "Alert Assignee", config: {}, position: { x: 0, y: 200 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }], icon: "🎯", color: "border-emerald-500/30" },
  { name: "Daily Digest", description: "Summarize daily activity and send a report", trigger: "schedule", steps: [
    { id: "s1", type: "ai_summarize", label: "Summarize Activity", config: {}, position: { x: 0, y: 0 } },
    { id: "s2", type: "ai_generate", label: "Format Report", config: { prompt: "Format this as a daily digest email" }, position: { x: 0, y: 100 } },
    { id: "s3", type: "email", label: "Send Digest", config: {}, position: { x: 0, y: 200 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }], icon: "📊", color: "border-amber-500/30" },
  { name: "Meeting Notes Processor", description: "Extract action items from meeting notes and create tasks", trigger: "manual", steps: [
    { id: "s1", type: "ai_extract", label: "Extract Action Items", config: {}, position: { x: 0, y: 0 } },
    { id: "s2", type: "ai_classify", label: "Prioritize Items", config: {}, position: { x: 0, y: 100 } },
    { id: "s3", type: "notification", label: "Notify Assignees", config: {}, position: { x: 0, y: 200 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }], icon: "📋", color: "border-rose-500/30" },
  { name: "Feedback Analyzer", description: "Analyze customer feedback and generate insights", trigger: "form_submitted", steps: [
    { id: "s1", type: "ai_classify", label: "Sentiment Analysis", config: {}, position: { x: 0, y: 0 } },
    { id: "s2", type: "ai_extract", label: "Extract Themes", config: {}, position: { x: 0, y: 100 } },
    { id: "s3", type: "ai_summarize", label: "Generate Insights", config: {}, position: { x: 0, y: 200 } },
    { id: "s4", type: "notification", label: "Alert Product Team", config: {}, position: { x: 0, y: 300 } },
  ], connections: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }, { from: "s3", to: "s4" }], icon: "💬", color: "border-cyan-500/30" },
];

export default function AiWorkflows() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger: "manual", steps: [] as any[], connections: [] as any[] });
  const [addingStep, setAddingStep] = useState(false);

  const { data: workflows = [] } = useQuery({ queryKey: ["ai-workflows"], queryFn: () => apiFetch("/ai-workflows") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/ai-workflows", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-workflows"] });
      setShowCreate(false);
      setForm({ name: "", description: "", trigger: "manual", steps: [], connections: [] });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiFetch(`/ai-workflows/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-workflows"] }),
  });

  const run = useMutation({
    mutationFn: (id: number) => apiFetch(`/ai-workflows/${id}/run`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-workflows"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/ai-workflows/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-workflows"] }),
  });

  const addStep = (type: string) => {
    const stepType = stepTypes.find(s => s.type === type);
    const newStep = {
      id: `step_${Date.now()}`,
      type,
      label: stepType?.label || type,
      config: type === "ai_generate" ? { prompt: "" } : {},
      position: { x: 0, y: form.steps.length * 100 },
    };
    const newConnections = form.steps.length > 0
      ? [...form.connections, { from: form.steps[form.steps.length - 1].id, to: newStep.id }]
      : form.connections;
    setForm({ ...form, steps: [...form.steps, newStep], connections: newConnections });
    setAddingStep(false);
  };

  const removeStep = (stepId: string) => {
    setForm({
      ...form,
      steps: form.steps.filter(s => s.id !== stepId),
      connections: form.connections.filter(c => c.from !== stepId && c.to !== stepId),
    });
  };

  const useTemplate = (t: typeof workflowTemplates[0]) => {
    setForm({ name: t.name, description: t.description, trigger: t.trigger, steps: t.steps, connections: t.connections });
    setShowCreate(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
              AI Workflows
            </h1>
            <p className="text-muted-foreground mt-1">Build multi-step AI automations with triggers, conditions, and actions</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Workflow
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Workflows", value: workflows.length, color: "text-violet-400" },
            { label: "Active", value: workflows.filter((w: any) => w.enabled).length, color: "text-emerald-400" },
            { label: "Total Runs", value: workflows.reduce((s: number, w: any) => s + (w.runCount || 0), 0), color: "text-blue-400" },
            { label: "Last 24h", value: workflows.filter((w: any) => w.lastRunAt && Date.now() - new Date(w.lastRunAt).getTime() < 86400000).length, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Workflow className="w-5 h-5 text-violet-400" /> Build Workflow</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Content Pipeline" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Trigger</label>
                <select value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {triggerOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this workflow do?" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-2">Steps ({form.steps.length})</label>
              <div className="space-y-2">
                {form.steps.map((step, idx) => {
                  const st = stepTypes.find(s => s.type === step.type);
                  const Icon = st?.icon || Zap;
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      {idx > 0 && <div className="w-0.5 h-4 bg-border absolute -mt-6 ml-[19px]" />}
                      <div className="flex items-center gap-3 flex-1 bg-background border border-border rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          <Icon className={`w-4 h-4 ${st?.color || "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <input value={step.label} onChange={e => {
                            const newSteps = [...form.steps];
                            newSteps[idx] = { ...step, label: e.target.value };
                            setForm({ ...form, steps: newSteps });
                          }} className="text-sm font-medium bg-transparent border-none outline-none w-full" />
                          <p className="text-[10px] text-muted-foreground">{st?.desc}</p>
                        </div>
                        {step.type === "ai_generate" && (
                          <input value={step.config?.prompt || ""} onChange={e => {
                            const newSteps = [...form.steps];
                            newSteps[idx] = { ...step, config: { ...step.config, prompt: e.target.value } };
                            setForm({ ...form, steps: newSteps });
                          }} placeholder="Enter prompt..." className="flex-1 text-xs bg-background border border-border rounded-lg px-2 py-1" />
                        )}
                        <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {idx < form.steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {addingStep ? (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {stepTypes.map(st => (
                    <button key={st.type} onClick={() => addStep(st.type)} className="text-left bg-background border border-border rounded-xl p-3 hover:border-violet-500/30 transition-colors">
                      <st.icon className={`w-4 h-4 ${st.color} mb-1`} />
                      <div className="text-xs font-medium">{st.label}</div>
                      <div className="text-[10px] text-muted-foreground">{st.desc}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => setAddingStep(true)} className="mt-3 flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-violet-500/30 hover:text-violet-400 transition-colors w-full justify-center">
                  <Plus className="w-4 h-4" /> Add Step
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => create.mutate(form)} disabled={!form.name || form.steps.length === 0} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Create Workflow
              </button>
              <button onClick={() => { setShowCreate(false); setForm({ name: "", description: "", trigger: "manual", steps: [], connections: [] }); }} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {!showCreate && workflows.length === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Workflow Templates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {workflowTemplates.map((t, i) => (
                <button key={i} onClick={() => useTemplate(t)} className={`text-left bg-card border ${t.color} rounded-xl p-4 hover:bg-white/5 transition-colors group`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-bold group-hover:text-primary transition-colors">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {t.steps.map((s, j) => {
                      const st = stepTypes.find(x => x.type === s.type);
                      const Icon = st?.icon || Zap;
                      return (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />}
                          <Icon className={`w-3 h-3 ${st?.color}`} />
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" /> Use this template
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {workflows.length === 0 && !showCreate && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <Workflow className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No AI workflows yet</p>
              <p className="text-sm">Build your first multi-step AI automation or pick a template above.</p>
            </div>
          )}
          {workflows.map((wf: any) => (
            <div key={wf.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wf.enabled ? "bg-violet-400/10" : "bg-secondary"}`}>
                    <Workflow className={`w-5 h-5 ${wf.enabled ? "text-violet-400" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{wf.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{wf.trigger?.replace("_", " ")}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{(wf.steps as any[])?.length || 0} steps</span>
                      {wf.lastRunStatus && (
                        <span className={`flex items-center gap-0.5 ${wf.lastRunStatus === "success" ? "text-emerald-400" : "text-amber-400"}`}>
                          {wf.lastRunStatus === "success" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {wf.lastRunStatus}
                        </span>
                      )}
                    </div>
                    {wf.description && <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mr-4">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{wf.runCount} runs</span>
                    {wf.lastRunAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                  </div>
                  <button onClick={() => run.mutate(wf.id)} className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Run">
                    <Play className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggle.mutate({ id: wf.id, enabled: !wf.enabled })} className={`p-2 rounded-lg ${wf.enabled ? "hover:bg-violet-500/10 text-violet-400" : "hover:bg-secondary text-muted-foreground"}`}>
                    {wf.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => remove.mutate(wf.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {(wf.steps as any[])?.length > 0 && (
                <div className="flex items-center gap-1 mt-3 pl-13">
                  {(wf.steps as any[]).map((step, i) => {
                    const st = stepTypes.find(s => s.type === step.type);
                    const Icon = st?.icon || Zap;
                    return (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                        <span className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg text-[10px]">
                          <Icon className={`w-3 h-3 ${st?.color}`} />
                          {step.label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
