import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Send, Plus, Search, Clock, Bell, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, Trash2, Edit3, RefreshCw, Inbox, Route,
  Calendar, AlertTriangle, MailPlus, Filter, ChevronRight, Tag,
  Target, Zap, Globe, Settings2, Play, Pause, MapPin, FileText
} from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

type Tab = "inbox" | "compose" | "routes" | "reminders";

const statusColors: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  sent: "text-emerald-400 bg-emerald-400/10",
  failed: "text-rose-400 bg-rose-400/10",
  cancelled: "text-gray-400 bg-gray-400/10",
};

export default function EmailHub() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [composeProjectId, setComposeProjectId] = useState("");
  const [composeFrom, setComposeFrom] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeResult, setComposeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [routeProjectId, setRouteProjectId] = useState("");
  const [routeEmail, setRouteEmail] = useState("");
  const [logFilter, setLogFilter] = useState<string>("");
  const [logSearch, setLogSearch] = useState("");
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({ title: "", message: "", scheduledAt: "", notificationType: "in_app", target: "", projectId: "" });
  const [viewingEmail, setViewingEmail] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects"),
  });

  const { data: emailStats } = useQuery({
    queryKey: ["email-routing-stats"],
    queryFn: () => apiFetch("/email-routing/stats"),
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["email-logs", logFilter, logSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (logFilter) params.set("direction", logFilter);
      if (logSearch) params.set("search", logSearch);
      return apiFetch(`/email-routing/logs?${params}`);
    },
  });

  const { data: emailRoutes = [] } = useQuery({
    queryKey: ["email-routes"],
    queryFn: () => apiFetch("/email-routing/routes"),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => apiFetch("/reminders"),
  });

  const createRoute = useMutation({
    mutationFn: (data: any) => apiFetch("/email-routing/routes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-routes"] });
      queryClient.invalidateQueries({ queryKey: ["email-routing-stats"] });
      setRouteProjectId("");
      setRouteEmail("");
    },
  });

  const toggleRoute = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/email-routing/routes/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-routes"] }),
  });

  const deleteRoute = useMutation({
    mutationFn: (id: number) => apiFetch(`/email-routing/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-routes"] });
      queryClient.invalidateQueries({ queryKey: ["email-routing-stats"] });
    },
  });

  const createReminder = useMutation({
    mutationFn: (data: any) => apiFetch("/reminders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setShowAddReminder(false);
      setReminderForm({ title: "", message: "", scheduledAt: "", notificationType: "in_app", target: "", projectId: "" });
    },
  });

  const cancelReminder = useMutation({
    mutationFn: (id: number) => apiFetch(`/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const sendNow = useMutation({
    mutationFn: (id: number) => apiFetch(`/reminders/${id}/send-now`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const handleCompose = async () => {
    setComposeSending(true);
    setComposeResult(null);
    try {
      await apiFetch("/email-routing/send-to-project", {
        method: "POST",
        body: JSON.stringify({
          projectId: parseInt(composeProjectId),
          fromAddress: composeFrom || "user@projectos.local",
          toAddress: composeTo,
          subject: composeSubject,
          bodyText: composeBody,
        }),
      });
      setComposeResult({ success: true, message: "Email logged to project successfully!" });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["email-routing-stats"] });
      setComposeSubject("");
      setComposeBody("");
      setComposeTo("");
    } catch (e: any) {
      setComposeResult({ success: false, message: e.message });
    }
    setComposeSending(false);
  };

  const tabs = [
    { id: "inbox" as Tab, icon: Inbox, label: "Email Inbox", count: emailStats?.totalEmails },
    { id: "compose" as Tab, icon: MailPlus, label: "Compose" },
    { id: "routes" as Tab, icon: Route, label: "Email Routes", count: emailStats?.activeRoutes },
    { id: "reminders" as Tab, icon: Bell, label: "Reminders", count: reminders.filter((r: any) => r.status === "pending").length },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Email Hub
            </h1>
            <p className="text-muted-foreground mt-1">Route emails to projects, schedule reminders, and manage communications</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total Emails", value: emailStats?.totalEmails || 0, icon: Mail, color: "text-violet-400", bg: "bg-violet-400/10" },
            { label: "Inbound", value: emailStats?.inbound || 0, icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Outbound", value: emailStats?.outbound || 0, icon: ArrowUpRight, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Active Routes", value: emailStats?.activeRoutes || 0, icon: Route, color: "text-amber-400", bg: "bg-amber-400/10" },
            { label: "Pending Reminders", value: reminders.filter((r: any) => r.status === "pending").length, icon: Clock, color: "text-rose-400", bg: "bg-rose-400/10" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 bg-card/50 border border-border rounded-2xl p-1.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "inbox" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Search emails..."
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {["", "inbound", "outbound"].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    logFilter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "" ? "All" : f === "inbound" ? "Inbound" : "Outbound"}
                </button>
              ))}
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["email-logs"] })}
                className="ml-auto p-2 rounded-lg hover:bg-white/5 text-muted-foreground"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {viewingEmail ? (
              <div className="bg-card border border-border rounded-2xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <button onClick={() => setViewingEmail(null)} className="text-sm text-primary hover:underline">← Back to inbox</button>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    viewingEmail.direction === "inbound" ? "text-emerald-400 bg-emerald-400/10" : "text-blue-400 bg-blue-400/10"
                  }`}>
                    {viewingEmail.direction}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">{viewingEmail.subject}</h2>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div><span className="text-xs">From:</span> <span className="text-foreground">{viewingEmail.fromAddress}</span></div>
                    <div><span className="text-xs">To:</span> <span className="text-foreground">{viewingEmail.toAddress || "—"}</span></div>
                    <div><span className="text-xs">Provider:</span> <span className="text-foreground">{viewingEmail.provider}</span></div>
                    <div><span className="text-xs">Date:</span> <span className="text-foreground">{new Date(viewingEmail.createdAt).toLocaleString()}</span></div>
                  </div>
                  {viewingEmail.projectId && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-primary" />
                      <span>Routed to Project #{viewingEmail.projectId}</span>
                    </div>
                  )}
                  <div className="bg-background border border-border rounded-xl p-4 text-sm whitespace-pre-wrap">
                    {viewingEmail.bodyText || viewingEmail.bodyHtml || "No content"}
                  </div>
                  {viewingEmail.attachments && viewingEmail.attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold">Attachments</h4>
                      {viewingEmail.attachments.map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-xs">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{a.filename}</span>
                          <span className="text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl">
                <div className="divide-y divide-border">
                  {emailLogs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No emails yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Use the Compose tab to send project emails, or configure inbound routes</p>
                    </div>
                  ) : emailLogs.map((log: any) => (
                    <button
                      key={log.id}
                      onClick={() => setViewingEmail(log)}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        log.direction === "inbound" ? "bg-emerald-400/10" : "bg-blue-400/10"
                      }`}>
                        {log.direction === "inbound" ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{log.subject}</span>
                          {log.projectId && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              Project #{log.projectId}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {log.direction === "inbound" ? `From: ${log.fromAddress}` : `To: ${log.toAddress || "—"}`}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "compose" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-card border border-border rounded-2xl p-6 space-y-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MailPlus className="w-5 h-5 text-primary" />
                Send to Project
              </h3>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project</label>
                <select
                  value={composeProjectId}
                  onChange={e => setComposeProjectId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} {p.tag ? `[${p.tag}]` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
                  <input
                    type="text"
                    value={composeFrom}
                    onChange={e => setComposeFrom(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
                <textarea
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={8}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {composeResult && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                  composeResult.success
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                }`}>
                  {composeResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {composeResult.message}
                </div>
              )}

              <button
                onClick={handleCompose}
                disabled={composeSending || !composeProjectId || !composeSubject}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
              >
                {composeSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {composeSending ? "Sending..." : "Send to Project"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  Subject Tag Routing
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Include a project tag in your email subject to auto-route inbound emails to the right project:
                </p>
                <div className="space-y-2">
                  {projects.filter((p: any) => p.tag).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-background rounded-lg">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-xs font-medium">{p.name}</span>
                      <code className="ml-auto text-[10px] font-mono text-primary">[{p.tag}]</code>
                    </div>
                  ))}
                  {projects.filter((p: any) => p.tag).length === 0 && (
                    <p className="text-[10px] text-muted-foreground/70">No project tags configured yet. Add tags to projects to enable auto-routing.</p>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  How It Works
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span>Compose an email and select a project</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span>Email is logged and tagged to the project</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span>View project emails in the inbox tab</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <span>Inbound emails auto-route via subject tags or email routes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "routes" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Add Email Route
              </h3>
              <div className="flex gap-3">
                <select
                  value={routeProjectId}
                  onChange={e => setRouteProjectId(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select project...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="email"
                  value={routeEmail}
                  onChange={e => setRouteEmail(e.target.value)}
                  placeholder="project-inbox@yourdomain.com"
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => createRoute.mutate({ projectId: parseInt(routeProjectId), assignedEmail: routeEmail })}
                  disabled={!routeProjectId || !routeEmail}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Add Route
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Route className="w-4 h-4 text-amber-400" />
                  Active Email Routes
                </h3>
              </div>
              <div className="divide-y divide-border">
                {emailRoutes.length === 0 ? (
                  <div className="p-12 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No email routes configured</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add routes to automatically send inbound emails to the right project</p>
                  </div>
                ) : emailRoutes.map((route: any) => (
                  <div key={route.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${route.isActive ? "bg-emerald-400/10" : "bg-gray-400/10"}`}>
                      <Route className={`w-4 h-4 ${route.isActive ? "text-emerald-400" : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{route.assignedEmail}</span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          {route.projectColor && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: route.projectColor }} />}
                          <span className="text-sm font-medium">{route.projectName || `Project #${route.projectId}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleRoute.mutate({ id: route.id, isActive: !route.isActive })}
                        className={`p-1.5 rounded-lg ${route.isActive ? "hover:bg-amber-500/10 text-amber-400" : "hover:bg-emerald-500/10 text-emerald-400"}`}
                        title={route.isActive ? "Pause" : "Activate"}
                      >
                        {route.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this route?")) deleteRoute.mutate(route.id); }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${route.isActive ? "text-emerald-400 bg-emerald-400/10" : "text-gray-400 bg-gray-400/10"}`}>
                      {route.isActive ? "Active" : "Paused"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "reminders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold">Scheduled Reminders</h3>
              <button
                onClick={() => setShowAddReminder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                New Reminder
              </button>
            </div>

            {showAddReminder && (
              <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold">Create Reminder</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Title</label>
                    <input
                      value={reminderForm.title}
                      onChange={e => setReminderForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Reminder title..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Scheduled At</label>
                    <input
                      type="datetime-local"
                      value={reminderForm.scheduledAt}
                      onChange={e => setReminderForm(p => ({ ...p, scheduledAt: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Message</label>
                  <textarea
                    value={reminderForm.message}
                    onChange={e => setReminderForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Reminder message..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Type</label>
                    <select
                      value={reminderForm.notificationType}
                      onChange={e => setReminderForm(p => ({ ...p, notificationType: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="in_app">In-App Notification</option>
                      <option value="sms">SMS</option>
                      <option value="call">Voice Call</option>
                      <option value="email">Email (via SMS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {reminderForm.notificationType === "in_app" ? "Target (optional)" : "Phone/Email"}
                    </label>
                    <input
                      value={reminderForm.target}
                      onChange={e => setReminderForm(p => ({ ...p, target: e.target.value }))}
                      placeholder={reminderForm.notificationType === "in_app" ? "Optional" : "+1234567890"}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Project (optional)</label>
                    <select
                      value={reminderForm.projectId}
                      onChange={e => setReminderForm(p => ({ ...p, projectId: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">None</option>
                      {projects.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => createReminder.mutate({
                      ...reminderForm,
                      scheduledAt: new Date(reminderForm.scheduledAt).toISOString(),
                      projectId: reminderForm.projectId ? parseInt(reminderForm.projectId) : null,
                    })}
                    disabled={!reminderForm.title || !reminderForm.message || !reminderForm.scheduledAt}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    Create Reminder
                  </button>
                  <button
                    onClick={() => setShowAddReminder(false)}
                    className="px-5 py-2 bg-secondary text-muted-foreground rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl">
              <div className="divide-y divide-border">
                {reminders.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No reminders scheduled</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Create reminders to get notified via SMS, call, or in-app</p>
                  </div>
                ) : reminders.map((r: any) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      r.notificationType === "sms" ? "bg-emerald-400/10"
                        : r.notificationType === "call" ? "bg-blue-400/10"
                        : r.notificationType === "email" ? "bg-violet-400/10"
                        : "bg-amber-400/10"
                    }`}>
                      {r.notificationType === "sms" ? <Mail className="w-4 h-4 text-emerald-400" />
                        : r.notificationType === "call" ? <Bell className="w-4 h-4 text-blue-400" />
                        : r.notificationType === "email" ? <Mail className="w-4 h-4 text-violet-400" />
                        : <Bell className="w-4 h-4 text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.message}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.scheduledAt).toLocaleString()}
                    </div>
                    {r.target && (
                      <span className="text-[10px] font-mono text-muted-foreground">{r.target}</span>
                    )}
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[r.status] || "text-gray-400 bg-gray-400/10"}`}>
                      {r.status}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === "pending" && (
                        <>
                          <button
                            onClick={() => sendNow.mutate(r.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400"
                            title="Send Now"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelReminder.mutate(r.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
