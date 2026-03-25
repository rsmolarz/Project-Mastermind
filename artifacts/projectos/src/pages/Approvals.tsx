import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const statusColors: Record<string, { text: string; bg: string; label: string }> = {
  pending: { text: "text-amber-400", bg: "bg-amber-400/10", label: "Pending" },
  approved: { text: "text-emerald-400", bg: "bg-emerald-400/10", label: "Approved" },
  rejected: { text: "text-rose-400", bg: "bg-rose-400/10", label: "Rejected" },
};

export default function Approvals() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [respondTo, setRespondTo] = useState<{ id: number; action: string } | null>(null);
  const [responseComment, setResponseComment] = useState("");
  const [form, setForm] = useState({ taskId: "", requesterId: "", approverId: "", comment: "" });

  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals", filter],
    queryFn: () => apiFetch(`/approvals${filter !== "all" ? `?status=${filter}` : ""}`),
  });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks-all"], queryFn: () => apiFetch("/tasks") });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => apiFetch("/members") });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/approvals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["approvals"] }); setShowCreate(false); },
  });

  const respond = useMutation({
    mutationFn: ({ id, status, responseComment }: any) => apiFetch(`/approvals/${id}/respond`, { method: "PATCH", body: JSON.stringify({ status, responseComment }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["approvals"] }); setRespondTo(null); setResponseComment(""); },
  });

  const pending = approvals.filter((a: any) => a.status === "pending");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Approvals
            </h1>
            <p className="text-muted-foreground mt-1">Request and manage task approvals from your team</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Request Approval
          </button>
        </div>

        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{pending.length}</span>}
            </button>
          ))}
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-violet-400" /> Request Approval</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Task</label>
                <select value={form.taskId} onChange={e => setForm({ ...form, taskId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select task...</option>
                  {tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Requester</label>
                <select value={form.requesterId} onChange={e => setForm({ ...form, requesterId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Approver</label>
                <select value={form.approverId} onChange={e => setForm({ ...form, approverId: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Comment (optional)</label>
              <input value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Please review this task..." className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => create.mutate({ taskId: parseInt(form.taskId), requesterId: parseInt(form.requesterId), approverId: parseInt(form.approverId), comment: form.comment })} disabled={!form.taskId || !form.requesterId || !form.approverId} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                Submit Request
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {approvals.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No approvals yet</p>
              <p className="text-sm">Request approval on tasks that need sign-off from your team.</p>
            </div>
          )}
          {approvals.map((a: any) => {
            const sc = statusColors[a.status] || statusColors.pending;
            return (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{a.task?.title || `Task #${a.taskId}`}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>From: <strong className="text-foreground">{a.requester?.name || "Unknown"}</strong></span>
                      <span>To: <strong className="text-foreground">{a.approver?.name || "Unknown"}</strong></span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    {a.comment && <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1"><MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />{a.comment}</p>}
                    {a.responseComment && <p className="text-sm mt-1 ml-4 text-muted-foreground italic">Response: {a.responseComment}</p>}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex items-center gap-1">
                      {respondTo?.id === a.id ? (
                        <div className="flex items-center gap-2">
                          <input value={responseComment} onChange={e => setResponseComment(e.target.value)} placeholder="Comment..." className="bg-background border border-border rounded-lg px-2 py-1 text-xs w-40" />
                          <button onClick={() => respond.mutate({ id: a.id, status: respondTo.action, responseComment })} className={`p-1.5 rounded-lg text-xs font-medium ${respondTo.action === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                            Confirm
                          </button>
                          <button onClick={() => setRespondTo(null)} className="text-xs text-muted-foreground">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setRespondTo({ id: a.id, action: "approved" })} className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRespondTo({ id: a.id, action: "rejected" })} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
