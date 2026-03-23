import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Phone, Mail, Send, Plus, Search, User, Building2,
  PhoneCall, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownLeft,
  Trash2, Edit3, MoreVertical, RefreshCw, Wifi, WifiOff, Tag, StickyNote,
  PhoneOutgoing, MessageCircle, History, Users, Settings2, ChevronRight,
  Globe, Hash, Shield, Zap,
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

type Tab = "compose" | "contacts" | "history" | "twilio" | "settings";
type Channel = "sms" | "voice" | "email";

const statusColors: Record<string, string> = {
  queued: "text-yellow-400 bg-yellow-400/10",
  sent: "text-blue-400 bg-blue-400/10",
  delivered: "text-emerald-400 bg-emerald-400/10",
  received: "text-violet-400 bg-violet-400/10",
  failed: "text-rose-400 bg-rose-400/10",
  undelivered: "text-rose-400 bg-rose-400/10",
  ringing: "text-yellow-400 bg-yellow-400/10",
  "in-progress": "text-blue-400 bg-blue-400/10",
  completed: "text-emerald-400 bg-emerald-400/10",
  busy: "text-orange-400 bg-orange-400/10",
  "no-answer": "text-gray-400 bg-gray-400/10",
  canceled: "text-gray-400 bg-gray-400/10",
};

export default function Messaging() {
  const [tab, setTab] = useState<Tab>("compose");
  const [channel, setChannel] = useState<Channel>("sms");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [callMessage, setCallMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", role: "" });
  const [editingContact, setEditingContact] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [twilioTab, setTwilioTab] = useState<"messages" | "calls">("messages");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["messaging-status"],
    queryFn: () => apiFetch("/messaging/status"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", contactSearch],
    queryFn: () => apiFetch(`/contacts${contactSearch ? `?search=${encodeURIComponent(contactSearch)}` : ""}`),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["message-history", historyFilter],
    queryFn: () => apiFetch(`/messaging/history${historyFilter ? `?channel=${historyFilter}` : ""}`),
  });

  const { data: twilioMessages = [] } = useQuery({
    queryKey: ["twilio-messages"],
    queryFn: () => apiFetch("/messaging/twilio/messages"),
    enabled: tab === "twilio",
  });

  const { data: twilioCalls = [] } = useQuery({
    queryKey: ["twilio-calls"],
    queryFn: () => apiFetch("/messaging/twilio/calls"),
    enabled: tab === "twilio",
  });

  const createContact = useMutation({
    mutationFn: (data: any) => apiFetch("/contacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["messaging-status"] });
      setShowAddContact(false);
      setNewContact({ name: "", email: "", phone: "", company: "", role: "" });
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setEditingContact(null);
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => apiFetch(`/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["messaging-status"] });
    },
  });

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      if (channel === "sms") {
        await apiFetch("/messaging/sms", { method: "POST", body: JSON.stringify({ to, body }) });
        setSendResult({ success: true, message: "SMS sent successfully!" });
      } else if (channel === "voice") {
        await apiFetch("/messaging/call", { method: "POST", body: JSON.stringify({ to, message: callMessage }) });
        setSendResult({ success: true, message: "Call initiated successfully!" });
      } else {
        await apiFetch("/messaging/email", { method: "POST", body: JSON.stringify({ to, subject, body }) });
        setSendResult({ success: true, message: "Email sent successfully!" });
      }
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
      queryClient.invalidateQueries({ queryKey: ["messaging-status"] });
      setBody("");
      setSubject("");
      setCallMessage("");
    } catch (e: any) {
      setSendResult({ success: false, message: e.message });
    }
    setSending(false);
  };

  const tabs = [
    { id: "compose" as Tab, icon: Send, label: "Compose" },
    { id: "contacts" as Tab, icon: Users, label: "Contacts" },
    { id: "history" as Tab, icon: History, label: "History" },
    { id: "twilio" as Tab, icon: Globe, label: "Twilio Live" },
    { id: "settings" as Tab, icon: Settings2, label: "Settings" },
  ];

  const channelOptions = [
    { id: "sms" as Channel, icon: MessageSquare, label: "SMS", color: "from-emerald-500 to-emerald-600" },
    { id: "voice" as Channel, icon: Phone, label: "Voice Call", color: "from-blue-500 to-blue-600" },
    { id: "email" as Channel, icon: Mail, label: "Email", color: "from-violet-500 to-violet-600" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Messaging Center
            </h1>
            <p className="text-muted-foreground mt-1">Send SMS, make calls, and manage contacts via Twilio</p>
          </div>
          <div className="flex items-center gap-3">
            {status?.configured ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Twilio Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-medium text-rose-400">Not Connected</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Messages", value: status?.stats?.totalMessages || 0, icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Contacts", value: status?.stats?.totalContacts || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Phone Numbers", value: status?.phoneNumbers?.length || 0, icon: Hash, color: "text-violet-400", bg: "bg-violet-400/10" },
            { label: "Twilio Phone", value: status?.twilioPhone || "—", icon: PhoneCall, color: "text-amber-400", bg: "bg-amber-400/10", isText: true },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-xl font-bold ${s.isText ? "text-sm" : ""}`}>
                {s.value}
              </div>
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
            </button>
          ))}
        </div>

        {tab === "compose" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <div className="flex gap-3">
                  {channelOptions.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => { setChannel(ch.id); setSendResult(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-medium ${
                        channel === ch.id
                          ? `border-primary bg-gradient-to-r ${ch.color} text-white shadow-lg`
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <ch.icon className="w-4 h-4" />
                      {ch.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {channel === "email" ? "Recipient Email / Phone" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder={channel === "email" ? "email@example.com or +1234567890" : "+1 (555) 123-4567"}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {channel === "email" && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Message subject..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                )}

                {channel === "voice" ? (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Text-to-Speech Message (optional)
                    </label>
                    <textarea
                      value={callMessage}
                      onChange={e => setCallMessage(e.target.value)}
                      placeholder="Message to speak when the call connects..."
                      rows={3}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder={channel === "sms" ? "Type your SMS message..." : "Compose your email body..."}
                      rows={channel === "email" ? 8 : 4}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    />
                    {channel === "sms" && (
                      <div className="text-xs text-muted-foreground mt-1">{body.length}/160 characters</div>
                    )}
                  </div>
                )}

                {sendResult && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                    sendResult.success
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}>
                    {sendResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {sendResult.message}
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !to || (channel !== "voice" && !body)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : channel === "voice" ? (
                    <PhoneOutgoing className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? "Sending..." : channel === "voice" ? "Make Call" : `Send ${channel.toUpperCase()}`}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Quick Select Contact
                </h3>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No contacts yet. Add some in the Contacts tab.</p>
                  ) : contacts.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setTo(channel === "email" ? (c.email || c.phone || "") : (c.phone || ""))}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{c.phone || c.email || "—"}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Quick Info
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>From Number</span>
                    <span className="font-mono text-foreground">{status?.twilioPhone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account</span>
                    <span className="text-foreground">{status?.accountInfo?.friendlyName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="text-emerald-400">{status?.accountInfo?.status || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div className="bg-card border border-border rounded-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>

            {showAddContact && (
              <div className="p-4 bg-primary/5 border-b border-border">
                <h4 className="text-sm font-bold mb-3">New Contact</h4>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: "name", placeholder: "Name *", icon: User },
                    { key: "email", placeholder: "Email", icon: Mail },
                    { key: "phone", placeholder: "+1234567890", icon: Phone },
                    { key: "company", placeholder: "Company", icon: Building2 },
                    { key: "role", placeholder: "Role", icon: Tag },
                  ].map(f => (
                    <div key={f.key} className="relative">
                      <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={(newContact as any)[f.key]}
                        onChange={e => setNewContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => createContact.mutate(newContact)}
                    disabled={!newContact.name}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAddContact(false)}
                    className="px-4 py-1.5 bg-secondary text-muted-foreground rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {contacts.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No contacts yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add contacts to quickly send messages</p>
                </div>
              ) : contacts.map((c: any) => (
                <div key={c.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary">
                    {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingContact?.id === c.id ? (
                      <div className="grid grid-cols-5 gap-2">
                        {["name", "email", "phone", "company", "role"].map(key => (
                          <input
                            key={key}
                            value={editingContact[key] || ""}
                            onChange={e => setEditingContact((prev: any) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={key}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">{c.name}</span>
                        {c.company && <span className="text-xs text-muted-foreground">{c.company}</span>}
                        {c.role && <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{c.role}</span>}
                        {c.phone && (
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{c.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingContact?.id === c.id ? (
                      <>
                        <button
                          onClick={() => updateContact.mutate(editingContact)}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingContact(null)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setTo(c.phone || ""); setTab("compose"); setChannel("sms"); }}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400"
                          title="Send SMS"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setTo(c.phone || ""); setTab("compose"); setChannel("voice"); }}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingContact({ ...c })}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact.mutate(c.id); }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="bg-card border border-border rounded-2xl">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <span className="text-sm font-bold">Filter:</span>
              {["", "sms", "voice", "email"].map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    historyFilter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "" ? "All" : f === "sms" ? "SMS" : f === "voice" ? "Voice" : "Email"}
                </button>
              ))}
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["message-history"] })}
                className="ml-auto p-2 rounded-lg hover:bg-white/5 text-muted-foreground"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {history.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Send your first message from the Compose tab</p>
                </div>
              ) : history.map((m: any) => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02]">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    m.channel === "sms" ? "bg-emerald-400/10" : m.channel === "voice" ? "bg-blue-400/10" : "bg-violet-400/10"
                  }`}>
                    {m.channel === "sms" ? (
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                    ) : m.channel === "voice" ? (
                      <Phone className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Mail className="w-4 h-4 text-violet-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.direction === "outbound" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.to_addr || m.to}</span>
                      {m.subject && <span className="text-xs text-muted-foreground">— {m.subject}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-md">{m.body}</div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[m.status] || "text-gray-400 bg-gray-400/10"}`}>
                    {m.status}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "twilio" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTwilioTab("messages")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                  twilioTab === "messages" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Twilio Messages
              </button>
              <button
                onClick={() => setTwilioTab("calls")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                  twilioTab === "calls" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Phone className="w-4 h-4" />
                Twilio Calls
              </button>
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["twilio-messages"] });
                  queryClient.invalidateQueries({ queryKey: ["twilio-calls"] });
                }}
                className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl">
              {twilioTab === "messages" ? (
                <div className="divide-y divide-border">
                  {twilioMessages.length === 0 ? (
                    <div className="p-12 text-center">
                      <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No Twilio messages found</p>
                    </div>
                  ) : twilioMessages.map((m: any) => (
                    <div key={m.sid} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs">{m.from}</span>
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{m.to}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-md">{m.body}</div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[m.status] || "text-gray-400 bg-gray-400/10"}`}>
                        {m.status}
                      </div>
                      {m.price && <span className="text-xs text-muted-foreground">${Math.abs(parseFloat(m.price)).toFixed(4)}</span>}
                      <div className="text-[10px] text-muted-foreground">
                        {m.dateSent ? new Date(m.dateSent).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {twilioCalls.length === 0 ? (
                    <div className="p-12 text-center">
                      <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No Twilio calls found</p>
                    </div>
                  ) : twilioCalls.map((c: any) => (
                    <div key={c.sid} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02]">
                      <div className="w-9 h-9 rounded-lg bg-blue-400/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs">{c.from}</span>
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{c.to}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Duration: {c.duration || "—"}s · Direction: {c.direction}
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[c.status] || "text-gray-400 bg-gray-400/10"}`}>
                        {c.status}
                      </div>
                      {c.price && <span className="text-xs text-muted-foreground">${Math.abs(parseFloat(c.price)).toFixed(4)}</span>}
                      <div className="text-[10px] text-muted-foreground">
                        {c.startTime ? new Date(c.startTime).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Twilio Account
              </h3>
              {status?.accountInfo?.error ? (
                <div className="text-rose-400 text-sm">{status.accountInfo.error}</div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Account Name", value: status?.accountInfo?.friendlyName },
                    { label: "Account Status", value: status?.accountInfo?.status },
                    { label: "Account Type", value: status?.accountInfo?.type },
                    { label: "Created", value: status?.accountInfo?.dateCreated ? new Date(status.accountInfo.dateCreated).toLocaleDateString() : null },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-400" />
                Phone Numbers
              </h3>
              {status?.phoneNumbers?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No phone numbers found</p>
              ) : (
                <div className="space-y-3">
                  {(status?.phoneNumbers || []).map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-background rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm">{p.phoneNumber}</span>
                        <span className="text-xs text-muted-foreground">{p.friendlyName}</span>
                      </div>
                      <div className="flex gap-2">
                        {p.capabilities?.sms && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded">SMS</span>
                        )}
                        {p.capabilities?.voice && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-400/10 text-blue-400 rounded">Voice</span>
                        )}
                        {p.capabilities?.mms && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-violet-400/10 text-violet-400 rounded">MMS</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                Webhook URLs
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure these URLs in your Twilio console to receive incoming messages and calls:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Incoming SMS Webhook</div>
                  <code className="text-xs font-mono text-emerald-400 break-all">
                    POST /api/messaging/webhook/incoming
                  </code>
                </div>
                <div className="p-3 bg-background rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Incoming Voice Webhook</div>
                  <code className="text-xs font-mono text-blue-400 break-all">
                    POST /api/messaging/webhook/voice
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
