import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Send, Plus, Search, Clock, Bell, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, Trash2, Edit3, RefreshCw, Inbox, Route,
  Calendar, AlertTriangle, MailPlus, Filter, ChevronRight, Tag,
  Target, Zap, Globe, Settings2, Play, Pause, MapPin, FileText,
  FolderOpen, ThumbsUp, ThumbsDown, Sparkles, Download, Loader2,
  FolderInput, Check, ArrowRight
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

type Tab = "inbox" | "compose" | "routes" | "reminders" | "categories" | "import";

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
  const [importScanning, setImportScanning] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importFolder, setImportFolder] = useState("INBOX");
  const [importLimit, setImportLimit] = useState("100");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedHeadings, setSelectedHeadings] = useState<Set<string>>(new Set());
  const [creatingHeadings, setCreatingHeadings] = useState(false);
  const [headingResults, setHeadingResults] = useState<any>(null);
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

  const { data: emailCategories } = useQuery({
    queryKey: ["email-categories"],
    queryFn: () => apiFetch("/email-projects/categories"),
    enabled: tab === "categories",
  });

  const { data: emailRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ["email-recommendations"],
    queryFn: () => apiFetch("/email-projects/recommendations?limit=100&unassigned=false"),
    enabled: tab === "categories",
  });

  const { data: importStatus } = useQuery({
    queryKey: ["email-import-status"],
    queryFn: () => apiFetch("/email-import/status"),
    enabled: tab === "import",
  });

  const { data: imapFolders } = useQuery({
    queryKey: ["imap-folders"],
    queryFn: () => apiFetch("/email-import/folders").catch(() => ({ folders: [] })),
    enabled: tab === "import" && importStatus?.configured,
  });

  const scanEmails = async () => {
    setImportScanning(true);
    setImportResult(null);
    try {
      const result = await apiFetch("/email-import/scan", {
        method: "POST",
        body: JSON.stringify({ folder: importFolder, limit: parseInt(importLimit), skipExisting: true }),
      });
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["email-routing-stats"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    } catch (err: any) {
      setImportResult({ error: err.message });
    }
    setImportScanning(false);
  };

  const analyzeEmails = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    setSelectedHeadings(new Set());
    setHeadingResults(null);
    try {
      const result = await apiFetch("/email-import/analyze", { method: "POST" });
      setAnalysisResult(result);
      const auto = new Set<string>();
      for (const h of result.suggestedHeadings || []) {
        if (h.emailCount >= 1 && h.category !== "general") auto.add(h.category);
      }
      setSelectedHeadings(auto);
    } catch (err: any) {
      setAnalysisResult({ error: err.message });
    }
    setAnalyzing(false);
  };

  const createSelectedHeadings = async () => {
    if (selectedHeadings.size === 0) return;
    setCreatingHeadings(true);
    try {
      const headings = Array.from(selectedHeadings).map(cat => {
        const h = analysisResult?.suggestedHeadings?.find((s: any) => s.category === cat);
        return {
          category: cat,
          projectName: h?.displayName || cat.charAt(0).toUpperCase() + cat.slice(1),
          icon: h?.suggestedIcon,
          color: h?.suggestedColor,
        };
      });
      const result = await apiFetch("/email-import/create-headings", {
        method: "POST",
        body: JSON.stringify({ headings }),
      });
      setHeadingResults(result);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      queryClient.invalidateQueries({ queryKey: ["email-routing-stats"] });
    } catch (err: any) {
      setHeadingResults({ error: err.message });
    }
    setCreatingHeadings(false);
  };

  const acceptRecommendation = useMutation({
    mutationFn: (data: { emailId: number; projectId: number }) =>
      apiFetch("/email-projects/accept", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    },
  });

  const denyRecommendation = useMutation({
    mutationFn: (data: { emailId: number }) =>
      apiFetch("/email-projects/deny", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-recommendations"] });
    },
  });

  const createProjectFromCategory = useMutation({
    mutationFn: (data: { category: string; projectName: string }) =>
      apiFetch("/email-projects/create-from-category", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
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
    { id: "categories" as Tab, icon: FolderOpen, label: "Categories" },
    { id: "import" as Tab, icon: Download, label: "Import & Scan" },
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

        {tab === "import" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Download className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold">Import & Scan Emails</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect to your email inbox via IMAP, import emails, then analyze them to automatically create project headings for sorting.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Step 1: Connection Status
              </h3>
              {importStatus ? (
                importStatus.configured ? (
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-medium text-emerald-400">Connected</div>
                      <div className="text-xs text-muted-foreground">
                        IMAP: {importStatus.imapHost} | Account: {importStatus.username} | {importStatus.totalImported} emails imported so far
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-amber-400">Not Configured</div>
                      <div className="text-xs text-muted-foreground">{importStatus.message}. Go to Admin &gt; API &amp; Email to set up your email credentials.</div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
                </div>
              )}
            </div>

            {importStatus?.configured && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FolderInput className="w-4 h-4 text-indigo-400" />
                  Step 2: Import Emails
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Folder</label>
                    <select
                      value={importFolder}
                      onChange={e => setImportFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="INBOX">INBOX</option>
                      {imapFolders?.folders?.map((f: any) => (
                        f.path !== "INBOX" && <option key={f.path} value={f.path}>{f.name} {f.specialUse ? `(${f.specialUse})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Max Emails</label>
                    <select
                      value={importLimit}
                      onChange={e => setImportLimit(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="50">Last 50</option>
                      <option value="100">Last 100</option>
                      <option value="200">Last 200</option>
                      <option value="500">Last 500</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={scanEmails}
                  disabled={importScanning}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {importScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {importScanning ? "Scanning..." : "Scan & Import Emails"}
                </button>

                {importResult && (
                  <div className={`rounded-xl p-4 border ${importResult.error ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                    {importResult.error ? (
                      <div className="text-sm text-red-400">{importResult.error}</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Imported {importResult.imported} emails from {importResult.folder}
                          {importResult.skipped > 0 && <span className="text-muted-foreground font-normal">({importResult.skipped} already existed)</span>}
                        </div>
                        {importResult.emails?.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                            {importResult.emails.slice(0, 20).map((e: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs py-1">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate flex-1">{e.subject}</span>
                                <span className="text-muted-foreground shrink-0">{e.from}</span>
                              </div>
                            ))}
                            {importResult.emails.length > 20 && (
                              <div className="text-xs text-muted-foreground text-center py-1">...and {importResult.emails.length - 20} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Step 3: Analyze & Create Project Headings
                </h3>
                <button
                  onClick={analyzeEmails}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {analyzing ? "Analyzing..." : "Analyze Emails"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Scans all emails in the system and suggests project headings based on content patterns like billing, support, meetings, design, etc.
              </p>

              {analysisResult && !analysisResult.error && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Analyzed <strong className="text-foreground">{analysisResult.totalEmails}</strong> emails</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Found <strong className="text-foreground">{analysisResult.totalCategories}</strong> categories</span>
                  </div>

                  {analysisResult.existingSubjectTags?.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3">
                      <div className="text-xs font-medium text-blue-400 mb-1.5">Existing Subject Tags Found</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.existingSubjectTags.map((t: any) => (
                          <span key={t.tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-xs font-mono">[{t.tag}] x{t.count}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Suggested Project Headings</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedHeadings(new Set(analysisResult.suggestedHeadings.map((h: any) => h.category)))}
                          className="text-xs text-primary hover:underline"
                        >Select All</button>
                        <button
                          onClick={() => setSelectedHeadings(new Set())}
                          className="text-xs text-muted-foreground hover:underline"
                        >Clear</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysisResult.suggestedHeadings.map((h: any) => (
                        <button
                          key={h.category}
                          onClick={() => {
                            const next = new Set(selectedHeadings);
                            if (next.has(h.category)) next.delete(h.category); else next.add(h.category);
                            setSelectedHeadings(next);
                          }}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            selectedHeadings.has(h.category)
                              ? "bg-primary/10 border-primary/30"
                              : "bg-white/[0.02] border-border hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {selectedHeadings.has(h.category) && <Check className="w-3.5 h-3.5 text-primary" />}
                              <span className="text-lg">{h.suggestedIcon}</span>
                              <span className="text-sm font-medium">{h.displayName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.suggestedColor }} />
                              <span className="text-xs font-bold">{h.emailCount}</span>
                              <span className="text-[10px] text-muted-foreground">emails</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {h.sampleSubjects.slice(0, 2).join(" | ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {h.uniqueSenders} sender{h.uniqueSenders !== 1 ? "s" : ""}: {h.topSenders.slice(0, 3).join(", ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {analysisResult.topSenderDomains?.length > 0 && (
                    <div className="bg-white/[0.02] border border-border rounded-xl p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Top Sender Domains</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.topSenderDomains.slice(0, 15).map((d: any) => (
                          <span key={d.domain} className="px-2 py-0.5 bg-white/5 text-foreground rounded-md text-xs">{d.domain} ({d.count})</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <button
                      onClick={createSelectedHeadings}
                      disabled={selectedHeadings.size === 0 || creatingHeadings}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {creatingHeadings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Create {selectedHeadings.size} Project Heading{selectedHeadings.size !== 1 ? "s" : ""}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      This will create new projects and automatically sort matching emails into them.
                    </span>
                  </div>
                </div>
              )}

              {analysisResult?.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{analysisResult.error}</div>
              )}

              {headingResults && !headingResults.error && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Created {headingResults.created?.length} project heading{headingResults.created?.length !== 1 ? "s" : ""}
                  </div>
                  {headingResults.created?.map((r: any) => (
                    <div key={r.projectId} className="flex items-center gap-3 text-xs py-1">
                      <span className="font-medium">{r.projectName}</span>
                      <span className="text-muted-foreground">{r.assignedEmails} emails assigned</span>
                    </div>
                  ))}
                </div>
              )}
              {headingResults?.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{headingResults.error}</div>
              )}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Email Categories & Project Recommendations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Emails are auto-categorized and matched to your projects. Accept or deny suggestions below.
                </p>
              </div>
              <button
                onClick={() => refetchRecommendations()}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Rescan
              </button>
            </div>

            {emailCategories && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(emailCategories.categories as Record<string, { count: number }>).map(([cat, info]) => (
                  <div key={cat} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium capitalize">{cat}</span>
                    </div>
                    <div className="text-2xl font-bold">{info.count}</div>
                    <span className="text-xs text-muted-foreground">
                      {info.count === 1 ? "email" : "emails"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recommendations ({emailRecommendations?.total || 0})
              </h3>
              {emailRecommendations?.recommendations?.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No email recommendations right now.</p>
                  <p className="text-sm mt-1">Send more emails or add new projects to get suggestions.</p>
                </div>
              )}
              {emailRecommendations?.recommendations?.map((rec: any) => (
                <div key={rec.emailId} className="bg-card border border-border rounded-2xl p-4 hover:border-violet-500/30 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-400/10 text-violet-400 capitalize">
                          {rec.suggestedCategory}
                        </span>
                        {rec.currentProject && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/10 text-emerald-400">
                            Assigned: {rec.currentProject}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium truncate">{rec.subject || "(no subject)"}</h4>
                      <p className="text-sm text-muted-foreground truncate">{rec.from}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {rec.suggestedProject ? (
                        <>
                          <div className="text-right">
                            <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              {rec.suggestedProject.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rec.suggestedProject.confidence}% — {rec.suggestedProject.reason}
                            </div>
                          </div>
                          {!rec.currentProject && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => acceptRecommendation.mutate({ emailId: rec.emailId, projectId: rec.suggestedProject.id })}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                Accept
                              </button>
                              <button
                                onClick={() => denyRecommendation.mutate({ emailId: rec.emailId })}
                                className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition-colors"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                                Deny
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No match found</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
