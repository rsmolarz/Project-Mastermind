import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, MessageSquare, Power, PowerOff, Brain, Wrench, Send, X, ChevronDown, Sparkles, User, Settings2, BookOpen } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const roleIcons: Record<string, string> = {
  assistant: "🤖", researcher: "🔬", analyst: "📊", writer: "✍️", support: "🎧",
  coordinator: "📋", developer: "💻", designer: "🎨", sales: "💼", ops: "⚙️",
};

const availableTools = [
  { id: "web_search", label: "Web Search", desc: "Search the internet for information" },
  { id: "create_task", label: "Create Tasks", desc: "Create new tasks in projects" },
  { id: "update_task", label: "Update Tasks", desc: "Modify existing tasks" },
  { id: "send_email", label: "Send Email", desc: "Send emails via Resend" },
  { id: "read_documents", label: "Read Documents", desc: "Access project documents" },
  { id: "analyze_data", label: "Analyze Data", desc: "Analyze project metrics" },
  { id: "generate_report", label: "Generate Reports", desc: "Create project reports" },
  { id: "calendar_manage", label: "Manage Calendar", desc: "Schedule and manage events" },
  { id: "create_project", label: "Create Projects", desc: "Set up new projects" },
  { id: "sprint_plan", label: "Sprint Planning", desc: "Plan and organize sprints" },
  { id: "goal_track", label: "Track Goals", desc: "Monitor OKR progress" },
  { id: "notify", label: "Send Notifications", desc: "Push notifications to team" },
  { id: "summarize", label: "Summarize Content", desc: "Generate summaries" },
  { id: "translate", label: "Translate", desc: "Translate text between languages" },
  { id: "code_review", label: "Code Review", desc: "Review code changes" },
  { id: "brainstorm", label: "Brainstorm", desc: "Generate ideas and concepts" },
  { id: "write_copy", label: "Write Copy", desc: "Generate marketing copy" },
  { id: "extract_data", label: "Extract Data", desc: "Extract structured data from text" },
  { id: "classify", label: "Classify", desc: "Categorize and tag content" },
  { id: "workflow_run", label: "Run Workflows", desc: "Trigger AI workflows" },
  { id: "file_manage", label: "File Management", desc: "Organize files and attachments" },
  { id: "team_insights", label: "Team Insights", desc: "Analyze team performance" },
];

const agentTemplates = [
  { name: "Project Coordinator", role: "coordinator", description: "Manages project timelines, assigns tasks, and keeps everything on track", systemPrompt: "You are a project coordinator. Help manage tasks, deadlines, and team assignments. Be proactive about identifying blockers and suggesting solutions.", tools: ["create_task", "update_task", "sprint_plan", "notify"], icon: "📋", color: "border-violet-500/30" },
  { name: "Research Analyst", role: "researcher", description: "Researches topics, analyzes data, and provides actionable insights", systemPrompt: "You are a research analyst. Provide thorough, data-driven research and analysis. Cite sources when possible and present findings clearly.", tools: ["web_search", "analyze_data", "summarize", "extract_data"], icon: "🔬", color: "border-blue-500/30" },
  { name: "Content Writer", role: "writer", description: "Creates compelling content for blogs, emails, docs, and marketing", systemPrompt: "You are a skilled content writer. Create engaging, clear, and well-structured content tailored to the audience. Maintain consistent tone and style.", tools: ["write_copy", "summarize", "translate", "read_documents"], icon: "✍️", color: "border-emerald-500/30" },
  { name: "Support Agent", role: "support", description: "Handles customer queries, troubleshoots issues, and provides solutions", systemPrompt: "You are a customer support agent. Be empathetic, solution-oriented, and thorough. Escalate issues when needed and follow up proactively.", tools: ["read_documents", "send_email", "notify", "classify"], icon: "🎧", color: "border-amber-500/30" },
  { name: "Sales Assistant", role: "sales", description: "Qualifies leads, drafts proposals, and tracks deal progress", systemPrompt: "You are a sales assistant. Help qualify leads, draft compelling proposals, and track deal pipelines. Be persuasive but authentic.", tools: ["send_email", "create_task", "analyze_data", "write_copy"], icon: "💼", color: "border-rose-500/30" },
  { name: "DevOps Engineer", role: "developer", description: "Monitors systems, reviews code, and manages deployments", systemPrompt: "You are a DevOps engineer. Help with code reviews, deployment planning, incident response, and system monitoring. Be precise and methodical.", tools: ["code_review", "notify", "analyze_data", "create_task"], icon: "💻", color: "border-cyan-500/30" },
];

export default function AiAgents() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [chatAgent, setChatAgent] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatConversationId, setChatConversationId] = useState<number | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", role: "assistant", description: "", systemPrompt: "", model: "claude-3-5-sonnet-20241022",
    temperature: "0.7", tools: [] as string[], isPublic: false,
  });

  const { data: agents = [] } = useQuery({ queryKey: ["ai-agents"], queryFn: () => apiFetch("/ai-agents") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/ai-agents", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      setShowCreate(false);
      setForm({ name: "", role: "assistant", description: "", systemPrompt: "", model: "claude-3-5-sonnet-20241022", temperature: "0.7", tools: [], isPublic: false });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiFetch(`/ai-agents/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-agents"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/ai-agents/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-agents"] }),
  });

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatAgent || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const resp = await apiFetch(`/ai-agents/${chatAgent.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: msg, conversationId: chatConversationId }),
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: resp.reply }]);
      setChatConversationId(resp.conversationId);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    setChatLoading(false);
  };

  const openChat = (agent: any) => {
    setChatAgent(agent);
    setChatMessages([]);
    setChatConversationId(null);
    setChatInput("");
  };

  const useTemplate = (t: typeof agentTemplates[0]) => {
    setForm({ ...form, name: t.name, role: t.role, description: t.description, systemPrompt: t.systemPrompt, tools: t.tools });
    setShowCreate(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              AI Agents
            </h1>
            <p className="text-muted-foreground mt-1">Create custom AI agents with roles, knowledge, and tools to automate your workflow</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Agent
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Agents", value: agents.length, color: "text-cyan-400" },
            { label: "Active", value: agents.filter((a: any) => a.enabled).length, color: "text-emerald-400" },
            { label: "Total Runs", value: agents.reduce((s: number, a: any) => s + (a.totalRuns || 0), 0), color: "text-violet-400" },
            { label: "With Tools", value: agents.filter((a: any) => a.tools?.length > 0).length, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Bot className="w-5 h-5 text-cyan-400" /> Create Agent</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Research Bot" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {["assistant", "researcher", "analyst", "writer", "support", "coordinator", "developer", "designer", "sales", "ops"].map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Model</label>
                <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus (Best)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this agent do?" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">System Prompt (Training Instructions)</label>
              <textarea value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} placeholder="You are a helpful assistant that specializes in..." rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tools ({form.tools.length}/22 selected)</label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {availableTools.map(t => (
                  <button key={t.id} onClick={() => setForm({ ...form, tools: form.tools.includes(t.id) ? form.tools.filter(x => x !== t.id) : [...form.tools, t.id] })}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${form.tools.includes(t.id) ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-border hover:border-border/80"}`}>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Temperature</label>
                <input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className="w-24" />
                <span className="text-xs font-mono">{form.temperature}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} className="rounded" />
                Public (visible to all members)
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => create.mutate(form)} disabled={!form.name} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Create Agent
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {!showCreate && agents.length === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Agent Templates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentTemplates.map((t, i) => (
                <button key={i} onClick={() => useTemplate(t)} className={`text-left bg-card border ${t.color} rounded-xl p-4 hover:bg-white/5 transition-colors group`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-bold group-hover:text-primary transition-colors">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" /> Use this template
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {agents.length === 0 && !showCreate && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No agents yet</p>
              <p className="text-sm">Create your first AI agent or pick a template above to get started.</p>
            </div>
          )}
          {agents.map((agent: any) => (
            <div key={agent.id} className="bg-card border border-border rounded-2xl hover:border-cyan-500/30 transition-colors">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${agent.enabled ? "bg-cyan-400/10" : "bg-secondary"}`}>
                      {roleIcons[agent.role] || "🤖"}
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {agent.name}
                        {agent.isPublic && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">Public</span>}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{agent.role}</span>
                        <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">{agent.model?.split("-").slice(0, 3).join("-")}</span>
                        <span>{agent.totalRuns || 0} runs</span>
                        {agent.tools?.length > 0 && <span className="flex items-center gap-0.5"><Wrench className="w-3 h-3" />{agent.tools.length} tools</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openChat(agent)} className="p-2 rounded-lg hover:bg-cyan-500/10 text-muted-foreground hover:text-cyan-400" title="Chat">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Settings">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggle.mutate({ id: agent.id, enabled: !agent.enabled })} className={`p-2 rounded-lg ${agent.enabled ? "hover:bg-emerald-500/10 text-emerald-400" : "hover:bg-secondary text-muted-foreground"}`}>
                      {agent.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove.mutate(agent.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {agent.description && <p className="text-sm text-muted-foreground mt-2 pl-13">{agent.description}</p>}
              </div>
              {expandedAgent === agent.id && (
                <div className="border-t border-border p-5 space-y-3 bg-background/50">
                  <div>
                    <label className="text-xs text-muted-foreground">System Prompt</label>
                    <p className="text-sm mt-1 bg-background rounded-lg p-3 border border-border whitespace-pre-wrap">{agent.systemPrompt || "No system prompt configured"}</p>
                  </div>
                  {agent.tools?.length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground">Equipped Tools</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {agent.tools.map((t: string) => {
                          const tool = availableTools.find(at => at.id === t);
                          return <span key={t} className="px-2 py-1 bg-cyan-500/10 text-cyan-300 rounded-md text-xs">{tool?.label || t}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Model:</span> <span className="font-mono">{agent.model}</span></div>
                    <div><span className="text-muted-foreground">Temperature:</span> <span className="font-mono">{agent.temperature}</span></div>
                    <div><span className="text-muted-foreground">Created:</span> {new Date(agent.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {chatAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl w-[600px] h-[500px] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-sm">
                  {roleIcons[chatAgent.role] || "🤖"}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{chatAgent.name}</h3>
                  <p className="text-[10px] text-muted-foreground capitalize">{chatAgent.role}</p>
                </div>
              </div>
              <button onClick={() => setChatAgent(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>Start a conversation with {chatAgent.name}</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-white" : "bg-secondary"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-4 py-2.5 text-sm text-muted-foreground animate-pulse">Thinking...</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder={`Message ${chatAgent.name}...`} className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm" autoFocus />
                <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading} className="p-2 bg-primary text-white rounded-xl disabled:opacity-50"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
