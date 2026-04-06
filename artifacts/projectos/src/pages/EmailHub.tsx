import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Search, ChevronRight, ChevronDown, Inbox, RefreshCw,
  ArrowDownLeft, ArrowUpRight, FolderOpen, Globe, Hash,
  BarChart3, TrendingUp, Loader2, AlertCircle, Zap,
  AlertTriangle, Clock, Send, CheckCircle2, CalendarClock
} from "lucide-react";
import FastmailPanel from "./FastmailPanel";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

interface ProjectNode {
  id: number;
  name: string;
  parent_id: number | null;
  icon: string | null;
  color: string | null;
  email_count: number;
  children: ProjectNode[];
  totalEmails: number;
}

interface EmailRow {
  id: number;
  subject: string;
  fromAddress: string;
  toAddress: string;
  receivedAt: string;
  direction: string;
  provider: string;
  projectId: number | null;
}

function buildTree(projects: any[]): { roots: ProjectNode[]; totalAssigned: number } {
  const map = new Map<number, ProjectNode>();
  let totalAssigned = 0;

  for (const p of projects) {
    map.set(p.id, { ...p, children: [], totalEmails: p.email_count });
    totalAssigned += p.email_count;
  }

  const roots: ProjectNode[] = [];
  for (const p of projects) {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(node);
    } else if (!p.parent_id) {
      roots.push(node);
    } else {
      roots.push(node);
    }
  }

  function sumChildren(node: ProjectNode): number {
    let total = node.email_count;
    for (const child of node.children) {
      total += sumChildren(child);
    }
    node.totalEmails = total;
    return total;
  }
  roots.forEach(sumChildren);

  roots.sort((a, b) => b.totalEmails - a.totalEmails);
  for (const r of roots) {
    r.children.sort((a, b) => b.totalEmails - a.totalEmails);
  }

  return { roots, totalAssigned };
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + "d ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months + "mo ago";
  return Math.floor(months / 12) + "y ago";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isThisYear) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

function ProjectTreeItem({
  node,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
}: {
  node: ProjectNode;
  level: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasEmails = node.totalEmails > 0;

  if (!hasEmails && !hasChildren) return null;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren && !isExpanded) onToggle(node.id);
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); } }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-colors group cursor-pointer ${
          isSelected
            ? "bg-primary/15 text-primary"
            : "hover:bg-white/5 text-foreground/80"
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggle(node.id); } }}
            className="w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <Mail className="w-3 h-3 text-muted-foreground/50" />
          </span>
        )}

        {node.icon ? (
          <span className="text-sm shrink-0">{node.icon}</span>
        ) : (
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}

        <span className="text-[13px] truncate flex-1 font-medium">{node.name}</span>

        {node.totalEmails > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ${
            isSelected ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
          }`}>
            {formatCount(node.totalEmails)}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.filter(c => c.totalEmails > 0).map(child => (
            <ProjectTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UrgentTasksPanel() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: urgentData, isLoading } = useQuery({
    queryKey: ["urgent-tasks-email"],
    queryFn: () => apiFetch("/urgent-tasks-email/tasks"),
  });

  const { data: emailHistory } = useQuery({
    queryKey: ["urgent-tasks-email-history"],
    queryFn: () => apiFetch("/urgent-tasks-email/history"),
  });

  const { data: addressData } = useQuery({
    queryKey: ["urgent-tasks-email-address"],
    queryFn: () => apiFetch("/urgent-tasks-email/address"),
  });

  const sendDigest = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`${API}/urgent-tasks-email/send-digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientEmail: email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.tasksSent === 0) {
        setSendStatus(data.message || "No urgent tasks to send.");
      } else {
        setSendStatus(`Digest sent! ${data.tasksSent} tasks, ${data.overdue} overdue.`);
      }
      setRecipientEmail("");
      queryClient.invalidateQueries({ queryKey: ["urgent-tasks-email-history"] });
    },
    onError: (err: any) => {
      setSendStatus(`Error: ${err.message}`);
    },
  });

  const priorityColor: Record<string, string> = {
    urgent: "bg-red-500/15 text-red-400 border-red-500/20",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Urgent Pending Tasks
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overdue and high-priority tasks requiring immediate attention
            </p>
          </div>
          <div className="flex items-center gap-3">
            {urgentData && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400 font-semibold">{urgentData.overdue}</span>
                  <span className="text-red-400/70">overdue</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-400 font-semibold">{urgentData.urgentCount + urgentData.highCount}</span>
                  <span className="text-orange-400/70">urgent/high</span>
                </div>
              </div>
            )}
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["urgent-tasks-email"] })}
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 border-b border-border bg-card/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>Email address:</span>
              <span className="font-mono text-foreground bg-white/5 px-2 py-0.5 rounded">{addressData?.address || "urgent-tasks@projectos.dev"}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !urgentData || urgentData.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/50" />
              <p className="text-muted-foreground">No urgent pending tasks. Everything is on track!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {urgentData.overdueList?.length > 0 && (
                <div className="px-6 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">Overdue ({urgentData.overdueList.length})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {urgentData.overdueList.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor[task.priority] || priorityColor.medium}`}>
                          {task.priority}
                        </div>
                        <span className="text-sm flex-1 truncate">{task.title}</span>
                        {task.project && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{task.project.name}</span>
                        )}
                        {task.due && (
                          <span className="text-[10px] text-red-400 font-medium shrink-0">
                            Due {new Date(task.due).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urgentData.urgentList?.length > 0 && (
                <div className="px-6 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-semibold text-orange-400">Urgent Priority ({urgentData.urgentList.length})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {urgentData.urgentList.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor.urgent}`}>
                          urgent
                        </div>
                        <span className="text-sm flex-1 truncate">{task.title}</span>
                        {task.project && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{task.project.name}</span>
                        )}
                        {task.due && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            Due {new Date(task.due).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urgentData.highList?.length > 0 && (
                <div className="px-6 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-yellow-400">High Priority ({urgentData.highList.length})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {urgentData.highList.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 transition-colors">
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor.high}`}>
                          high
                        </div>
                        <span className="text-sm flex-1 truncate">{task.title}</span>
                        {task.project && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{task.project.name}</span>
                        )}
                        {task.due && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            Due {new Date(task.due).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-80 border-l border-border flex flex-col bg-card/30">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Send Digest Email</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Email a summary of all urgent tasks</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="team@company.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => { setSendStatus(null); sendDigest.mutate(recipientEmail); }}
              disabled={!recipientEmail || sendDigest.isPending}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              {sendDigest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Urgent Digest
            </button>
            {sendStatus && (
              <div className={`text-xs px-3 py-2 rounded-lg ${sendStatus.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                {sendStatus}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sent History</h4>
            {!emailHistory || emailHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No digests sent yet</p>
            ) : (
              <div className="space-y-2">
                {emailHistory.map((log: any) => (
                  <div key={log.id} className="px-3 py-2 rounded-lg bg-white/5 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{log.toAddress}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(log.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{log.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailHub() {
  const [activeAccount, setActiveAccount] = useState<"gmail" | "fastmail" | "urgent-tasks">("gmail");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ["email-project-tree"],
    queryFn: () => apiFetch("/email-import/project-tree"),
    enabled: activeAccount === "gmail",
  });

  const tree = useMemo(() => {
    if (!treeData?.projects) return { roots: [], totalAssigned: 0 };
    return buildTree(treeData.projects);
  }, [treeData]);

  const filteredRoots = useMemo(() => {
    if (!sidebarSearch) return tree.roots;
    const q = sidebarSearch.toLowerCase();
    function matchNode(node: ProjectNode): ProjectNode | null {
      const nameMatch = node.name.toLowerCase().includes(q);
      const matchedChildren = node.children.map(matchNode).filter(Boolean) as ProjectNode[];
      if (nameMatch || matchedChildren.length > 0) {
        return { ...node, children: nameMatch ? node.children : matchedChildren };
      }
      return null;
    }
    return tree.roots.map(matchNode).filter(Boolean) as ProjectNode[];
  }, [tree.roots, sidebarSearch]);

  const emailsQueryKey = showUnassigned
    ? ["emails-by-project", "unassigned", page, searchQuery]
    : ["emails-by-project", selectedProjectId, page, searchQuery];

  const { data: emailData, isLoading: emailsLoading } = useQuery({
    queryKey: emailsQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (!showUnassigned && selectedProjectId) params.set("projectId", String(selectedProjectId));
      if (showUnassigned) {} 
      params.set("page", String(page));
      params.set("limit", "50");
      if (searchQuery) params.set("search", searchQuery);
      return apiFetch(`/email-import/emails-by-project?${params}`);
    },
    enabled: activeAccount === "gmail" && (showUnassigned || selectedProjectId !== null),
  });

  const selectedProject = useMemo(() => {
    if (!treeData?.projects || !selectedProjectId) return null;
    return treeData.projects.find((p: any) => p.id === selectedProjectId);
  }, [treeData, selectedProjectId]);

  const tabButtonClass = (tab: string) =>
    activeAccount === tab
      ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary/15 text-primary"
      : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5";

  const renderTabBar = () => (
    <div className="border-b border-border px-6 py-2 flex items-center gap-2 bg-card/30">
      <button onClick={() => setActiveAccount("gmail")} className={tabButtonClass("gmail")}>
        <Mail className="w-3.5 h-3.5" />
        Gmail
      </button>
      <button onClick={() => setActiveAccount("fastmail")} className={tabButtonClass("fastmail")}>
        <Zap className="w-3.5 h-3.5" />
        Fastmail
      </button>
      <button onClick={() => setActiveAccount("urgent-tasks")} className={tabButtonClass("urgent-tasks")}>
        <AlertTriangle className="w-3.5 h-3.5" />
        Urgent Tasks
      </button>
    </div>
  );

  if (activeAccount === "urgent-tasks") {
    return (
      <div className="h-full flex flex-col">
        {renderTabBar()}
        <div className="flex-1 min-h-0">
          <UrgentTasksPanel />
        </div>
      </div>
    );
  }

  if (activeAccount === "fastmail") {
    return (
      <div className="h-full flex flex-col">
        {renderTabBar()}
        <div className="flex-1 min-h-0">
          <FastmailPanel />
        </div>
      </div>
    );
  }

  function handleSelectProject(id: number) {
    setSelectedProjectId(id);
    setShowUnassigned(false);
    setPage(1);
    setSearchQuery("");
  }

  function handleToggle(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalEmails = treeData?.totalEmails || 0;
  const unassignedCount = treeData?.unassignedCount || 0;
  const assignedCount = totalEmails - unassignedCount;
  const assignmentRate = totalEmails > 0 ? ((assignedCount / totalEmails) * 100).toFixed(1) : "0";

  return (
    <div className="h-full flex flex-col">
      {renderTabBar()}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Email Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatCount(totalEmails)} emails across {treeData?.projects?.filter((p: any) => p.email_count > 0).length || 0} projects
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">{formatCount(assignedCount)} assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">{formatCount(unassignedCount)} unassigned</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{assignmentRate}%</span>
              </div>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["email-project-tree"] })}
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-72 border-r border-border flex flex-col bg-card/30">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Filter projects..."
                className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {treeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSelectedProjectId(null);
                    setShowUnassigned(false);
                    setPage(1);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    !selectedProjectId && !showUnassigned
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-white/5 text-foreground/80"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-[13px] font-semibold">Overview</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground tabular-nums">
                    {formatCount(totalEmails)}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowUnassigned(true);
                    setSelectedProjectId(null);
                    setPage(1);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    showUnassigned
                      ? "bg-amber-500/15 text-amber-400"
                      : "hover:bg-white/5 text-foreground/80"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Unassigned</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 tabular-nums">
                    {formatCount(unassignedCount)}
                  </span>
                </button>

                <div className="h-px bg-border my-2" />

                {filteredRoots.map(node => (
                  <ProjectTreeItem
                    key={node.id}
                    node={node}
                    level={0}
                    selectedId={selectedProjectId}
                    onSelect={handleSelectProject}
                    expandedIds={expandedIds}
                    onToggle={handleToggle}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!selectedProjectId && !showUnassigned ? (
            <OverviewPanel tree={tree} treeData={treeData} onSelect={handleSelectProject} />
          ) : (
            <EmailListPanel
              project={selectedProject}
              showUnassigned={showUnassigned}
              emailData={emailData}
              isLoading={emailsLoading}
              searchQuery={searchQuery}
              onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
              page={page}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({
  tree,
  treeData,
  onSelect,
}: {
  tree: { roots: ProjectNode[]; totalAssigned: number };
  treeData: any;
  onSelect: (id: number) => void;
}) {
  const topProjects = tree.roots
    .filter(r => r.totalEmails > 0)
    .slice(0, 13);

  const totalEmails = treeData?.totalEmails || 0;
  const unassigned = treeData?.unassignedCount || 0;
  const assigned = totalEmails - unassigned;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Emails", value: formatCount(totalEmails), icon: Mail, color: "text-violet-400", bg: "bg-violet-400/10" },
          { label: "Assigned", value: formatCount(assigned), icon: FolderOpen, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { label: "Unassigned", value: formatCount(unassigned), icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Projects", value: String(treeData?.projects?.filter((p: any) => p.email_count > 0).length || 0), icon: Hash, color: "text-blue-400", bg: "bg-blue-400/10" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top-Level Projects</h3>
        <div className="grid grid-cols-1 gap-2">
          {topProjects.map(project => {
            const pct = totalEmails > 0 ? (project.totalEmails / totalEmails) * 100 : 0;
            return (
              <button
                key={project.id}
                onClick={() => onSelect(project.id)}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                  {project.icon || "📁"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{project.name}</span>
                    <span className="text-sm font-bold tabular-nums">{formatCount(project.totalEmails)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="bg-primary/60 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {project.children.filter(c => c.totalEmails > 0).length} sub-projects
                    </span>
                    <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmailListPanel({
  project,
  showUnassigned,
  emailData,
  isLoading,
  searchQuery,
  onSearchChange,
  page,
  onPageChange,
}: {
  project: any;
  showUnassigned: boolean;
  emailData: any;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  page: number;
  onPageChange: (p: number) => void;
}) {
  const emails: EmailRow[] = emailData?.emails || [];
  const total = emailData?.total || 0;
  const totalPages = emailData?.totalPages || 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showUnassigned ? (
            <>
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="font-semibold text-lg truncate">Unassigned Emails</h2>
            </>
          ) : (
            <>
              <span className="text-lg shrink-0">{project?.icon || "📁"}</span>
              <h2 className="font-semibold text-lg truncate">{project?.name || "Project"}</h2>
            </>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground tabular-nums shrink-0">
            {formatCount(total)}
          </span>
        </div>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map(email => (
              <div
                key={email.id}
                className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  email.direction === "inbound" ? "bg-emerald-400/10" : "bg-blue-400/10"
                }`}>
                  {email.direction === "inbound" ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium truncate">
                      {email.subject || "(no subject)"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {email.fromAddress}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                  {email.receivedAt ? formatDate(email.receivedAt) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-2.5 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({formatCount(total)} emails)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              First
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
