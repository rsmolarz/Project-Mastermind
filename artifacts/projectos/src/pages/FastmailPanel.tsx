import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import {
  Mail, Search, Inbox, RefreshCw, Send, User, Shield,
  ChevronRight, ChevronDown, Loader2, Plus, Trash2,
  ArrowDownLeft, ArrowUpRight, Paperclip, Star, Eye,
  Phone, Building, AtSign, X, Check, Clock, Globe,
  ArrowLeft,
} from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPatch(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type FastmailTab = "inbox" | "contacts" | "masked" | "compose";

export default function FastmailPanel() {
  const [activeTab, setActiveTab] = useState<FastmailTab>("inbox");
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["fastmail-session"],
    queryFn: () => apiFetch("/fastmail/session"),
  });

  if (!session?.connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">Fastmail not connected</p>
          {session?.error && (
            <p className="text-xs text-red-400">{session.error}</p>
          )}
        </div>
      </div>
    );
  }

  const tabs: { id: FastmailTab; label: string; icon: any }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "contacts", label: "Contacts", icon: User },
    { id: "masked", label: "Masked Email", icon: Shield },
    { id: "compose", label: "Compose", icon: Send },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Fastmail
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {session.username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "inbox" && <InboxPanel />}
        {activeTab === "contacts" && <ContactsPanel />}
        {activeTab === "masked" && <MaskedEmailPanel />}
        {activeTab === "compose" && <ComposePanel onSent={() => {
          setActiveTab("inbox");
          queryClient.invalidateQueries({ queryKey: ["fastmail-emails"] });
        }} />}
      </div>
    </div>
  );
}

function InboxPanel() {
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState(0);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: mailboxData } = useQuery({
    queryKey: ["fastmail-mailboxes"],
    queryFn: () => apiFetch("/fastmail/mailboxes"),
  });

  const mailboxes = mailboxData?.mailboxes || [];
  const inboxId = mailboxes.find((m: any) => m.role === "inbox")?.id;

  const activeMailboxId = selectedMailbox || inboxId;

  const { data: emailData, isLoading } = useQuery({
    queryKey: ["fastmail-emails", activeMailboxId, searchQuery, position],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeMailboxId) params.set("mailboxId", activeMailboxId);
      if (searchQuery) params.set("search", searchQuery);
      params.set("position", String(position));
      params.set("limit", "50");
      return apiFetch(`/fastmail/emails?${params}`);
    },
    enabled: !!activeMailboxId,
  });

  const { data: emailDetail } = useQuery({
    queryKey: ["fastmail-email-detail", selectedEmailId],
    queryFn: () => apiFetch(`/fastmail/email/${selectedEmailId}`),
    enabled: !!selectedEmailId,
  });

  const emails = emailData?.emails || [];
  const total = emailData?.total || 0;

  const sortedMailboxes = useMemo(() => {
    const roleOrder: Record<string, number> = {
      inbox: 0, drafts: 1, scheduled: 2, sent: 3, archive: 4, junk: 5, trash: 6,
    };
    return [...mailboxes].sort((a: any, b: any) => {
      const aOrder = a.role ? (roleOrder[a.role] ?? 50) : 99;
      const bOrder = b.role ? (roleOrder[b.role] ?? 50) : 99;
      return aOrder - bOrder;
    });
  }, [mailboxes]);

  if (selectedEmailId && emailDetail?.email) {
    return (
      <EmailDetailView
        email={emailDetail.email}
        onBack={() => setSelectedEmailId(null)}
        mailboxes={mailboxes}
      />
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-52 border-r border-border flex flex-col bg-card/30">
        <div className="p-2 space-y-0.5">
          {sortedMailboxes.map((mb: any) => (
            <button
              key={mb.id}
              onClick={() => { setSelectedMailbox(mb.id); setPosition(0); setSearchQuery(""); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] transition-colors ${
                activeMailboxId === mb.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <MailboxIcon role={mb.role} />
              <span className="truncate flex-1">{mb.name}</span>
              {mb.unreadEmails > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium tabular-nums">
                  {mb.unreadEmails}
                </span>
              )}
              {mb.totalEmails > 0 && mb.unreadEmails === 0 && (
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {mb.totalEmails > 999 ? `${(mb.totalEmails / 1000).toFixed(1)}K` : mb.totalEmails}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPosition(0); }}
              placeholder="Search emails..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{total.toLocaleString()} emails</span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["fastmail-emails"] })}
            className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No emails</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((email: any) => {
                const isUnread = !email.keywords?.$seen;
                const isFlagged = email.keywords?.$flagged;
                const from = email.from?.[0];
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors text-left ${
                      isUnread ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary">
                      {(from?.name || from?.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[13px] truncate ${isUnread ? "font-semibold" : "font-medium text-foreground/80"}`}>
                          {from?.name || from?.email || "Unknown"}
                        </span>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {isFlagged && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                          {email.hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatDate(email.receivedAt)}
                          </span>
                        </div>
                      </div>
                      <div className={`text-[13px] truncate ${isUnread ? "font-medium" : "text-foreground/70"}`}>
                        {email.subject || "(no subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground/60 truncate mt-0.5">
                        {email.preview}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {total > 50 && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Showing {position + 1}–{Math.min(position + 50, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPosition(Math.max(0, position - 50))}
                disabled={position === 0}
                className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setPosition(position + 50)}
                disabled={position + 50 >= total}
                className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MailboxIcon({ role }: { role: string | null }) {
  const cls = "w-3.5 h-3.5";
  switch (role) {
    case "inbox": return <Inbox className={cls} />;
    case "sent": return <ArrowUpRight className={cls} />;
    case "drafts": return <Mail className={cls} />;
    case "trash": return <Trash2 className={cls} />;
    case "junk": return <Shield className={cls} />;
    case "archive": return <Inbox className={cls} />;
    default: return <Mail className={cls} />;
  }
}

function EmailDetailView({ email, onBack, mailboxes }: { email: any; onBack: () => void; mailboxes: any[] }) {
  const from = email.from?.[0];
  const to = email.to || [];
  const cc = email.cc || [];

  let body = "";
  if (email.htmlBody?.length && email.bodyValues) {
    const partId = email.htmlBody[0].partId;
    body = email.bodyValues[partId]?.value || "";
  } else if (email.textBody?.length && email.bodyValues) {
    const partId = email.textBody[0].partId;
    body = email.bodyValues[partId]?.value || "";
  }

  const isHtml = email.htmlBody?.length > 0 && body.includes("<");

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-muted-foreground">Back to list</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl font-semibold mb-3">{email.subject || "(no subject)"}</h2>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {(from?.name || from?.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{from?.name || from?.email}</span>
                {from?.name && <span className="text-xs text-muted-foreground">&lt;{from.email}&gt;</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                To: {to.map((t: any) => t.name || t.email).join(", ")}
              </div>
              {cc.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Cc: {cc.map((c: any) => c.name || c.email).join(", ")}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(email.receivedAt).toLocaleString()} · {formatSize(email.size)}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {isHtml ? (
            <div
              className="prose prose-invert prose-sm max-w-none [&_a]:text-primary [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body, {
                ALLOWED_TAGS: [
                  "p", "br", "div", "span", "a", "b", "i", "u", "em", "strong",
                  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
                  "table", "thead", "tbody", "tr", "td", "th", "img",
                  "blockquote", "pre", "code", "hr", "sub", "sup",
                ],
                ALLOWED_ATTR: ["href", "src", "alt", "title", "width", "height", "style", "class", "target", "rel"],
                ALLOW_DATA_ATTR: false,
              }) }}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap text-foreground/80 font-sans">{body}</pre>
          )}
        </div>

        {email.attachments?.length > 0 && (
          <div className="px-6 py-4 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Attachments ({email.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att: any, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-xs">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{att.name || "attachment"}</span>
                  <span className="text-muted-foreground">{formatSize(att.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactsPanel() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fastmail-contacts"],
    queryFn: () => apiFetch("/fastmail/contacts"),
  });

  const contacts = data?.contacts || [];

  const filtered = useMemo(() => {
    if (!searchQuery) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.emails?.some((e: string) => e.toLowerCase().includes(q)) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const c of filtered) {
      const letter = (c.name || "?")[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} contacts</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <User className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No contacts found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([letter, items]) => (
              <div key={letter}>
                <div className="px-5 py-1.5 bg-card/50 text-xs font-semibold text-muted-foreground sticky top-0">
                  {letter}
                </div>
                {items.map((contact: any) => (
                  <div key={contact.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {(contact.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{contact.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {contact.emails?.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <AtSign className="w-3 h-3 shrink-0" />
                            {contact.emails[0]}
                          </span>
                        )}
                        {contact.phones?.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 shrink-0" />
                            {contact.phones[0]}
                          </span>
                        )}
                        {contact.company && (
                          <span className="flex items-center gap-1 truncate">
                            <Building className="w-3 h-3 shrink-0" />
                            {contact.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MaskedEmailPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["fastmail-masked-emails"],
    queryFn: () => apiFetch("/fastmail/masked-emails"),
  });

  const maskedEmails = data?.maskedEmails || [];

  async function handleCreate() {
    setCreating(true);
    try {
      await apiPost("/fastmail/masked-emails", {
        forDomain: newDomain,
        description: newDesc,
        emailPrefix: newPrefix || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["fastmail-masked-emails"] });
      setShowCreate(false);
      setNewDomain("");
      setNewDesc("");
      setNewPrefix("");
    } catch (e) {
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, currentState: string) {
    const newState = currentState === "enabled" ? "disabled" : "enabled";
    await apiPatch(`/fastmail/masked-emails/${id}`, { state: newState });
    queryClient.invalidateQueries({ queryKey: ["fastmail-masked-emails"] });
  }

  async function handleDelete(id: string) {
    await apiDelete(`/fastmail/masked-emails/${id}`);
    queryClient.invalidateQueries({ queryKey: ["fastmail-masked-emails"] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{maskedEmails.length} masked emails</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Masked Email
        </button>
      </div>

      {showCreate && (
        <div className="px-5 py-4 border-b border-border bg-card/50 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Domain (optional)</label>
              <input
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Description</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this for?"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Prefix (optional)</label>
              <input
                value={newPrefix}
                onChange={e => setNewPrefix(e.target.value)}
                placeholder="my-prefix"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-1.5 text-muted-foreground text-xs hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : maskedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No masked emails yet</p>
            <p className="text-xs mt-1">Create one to protect your real email address</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {maskedEmails.map((me: any) => (
              <div key={me.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  me.state === "enabled" ? "bg-emerald-400" :
                  me.state === "disabled" ? "bg-amber-400" : "bg-red-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono truncate">{me.email}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {me.forDomain && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {me.forDomain}
                      </span>
                    )}
                    {me.description && <span>{me.description}</span>}
                    {me.lastMessageAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last: {formatDate(me.lastMessageAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(me.id, me.state)}
                    className={`p-1.5 rounded-md text-xs ${
                      me.state === "enabled"
                        ? "text-emerald-400 hover:bg-emerald-400/10"
                        : "text-amber-400 hover:bg-amber-400/10"
                    }`}
                    title={me.state === "enabled" ? "Disable" : "Enable"}
                  >
                    {me.state === "enabled" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(me.id)}
                    className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComposePanel({ onSent }: { onSent: () => void }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!to.trim()) { setError("Recipient is required"); return; }
    setSending(true);
    setError("");
    try {
      const result = await apiPost("/fastmail/send", {
        to: to.split(",").map(e => ({ email: e.trim() })),
        cc: cc ? cc.split(",").map(e => ({ email: e.trim() })) : undefined,
        subject,
        textBody: body,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onSent(), 1500);
      } else {
        setError(result.error || "Failed to send");
      }
    } catch (e: any) {
      setError(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium">Email sent successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">New Message</h3>
        <p className="text-xs text-muted-foreground mt-0.5">From: medmoney@fastmail.com</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">To</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com (comma-separated for multiple)"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Cc (optional)</label>
          <input
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message..."
            rows={12}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
