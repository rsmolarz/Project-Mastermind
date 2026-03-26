import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Badge, Button, Input, Modal } from "@/components/ui/shared";
import { UserPlus, Mail, Building, Shield, Trash2, Copy, Check, ExternalLink, Users } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { format } from "date-fns";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } }).then(r => r.json());

export default function Guests() {
  const queryClient = useQueryClient();
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ["guests"],
    queryFn: () => apiFetch("/guests"),
  });
  const { data: projects = [] } = useProjects();

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "viewer", accessLevel: "view_only", projectIds: [] as number[] });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const invite = useMutation({
    mutationFn: (data: any) => apiFetch("/guests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setShowInvite(false);
      setForm({ name: "", email: "", company: "", role: "viewer", accessLevel: "view_only", projectIds: [] });
    },
  });

  const removeGuest = useMutation({
    mutationFn: (id: number) => apiFetch(`/guests/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  });

  const toggleProject = (pid: number) => {
    setForm(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(pid)
        ? prev.projectIds.filter(id => id !== pid)
        : [...prev.projectIds, pid],
    }));
  };

  const copyInviteLink = (guest: any) => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${guest.inviteToken}`);
    setCopiedId(guest.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const accessBadge: Record<string, string> = {
    view_only: "bg-blue-500/20 text-blue-400",
    comment: "bg-amber-500/20 text-amber-400",
    edit: "bg-emerald-500/20 text-emerald-400",
    full: "bg-primary/20 text-primary",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> Guest Access
          </h1>
          <p className="text-muted-foreground mt-1">Invite external collaborators with limited access to specific projects</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Invite Guest
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{guests.length}</div>
          <div className="text-xs text-muted-foreground">Total Guests</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{guests.filter((g: any) => g.active).length}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{guests.filter((g: any) => !g.active).length}</div>
          <div className="text-xs text-muted-foreground">Inactive</div>
        </Card>
      </div>

      {guests.length === 0 ? (
        <Card className="p-12 text-center">
          <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No guests invited yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Invite external collaborators to view or contribute to specific projects</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {guests.map((guest: any) => (
            <Card key={guest.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {guest.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{guest.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${accessBadge[guest.accessLevel] || accessBadge.view_only}`}>
                      {guest.accessLevel.replace("_", " ")}
                    </span>
                    {!guest.active && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {guest.email}</span>
                    {guest.company && <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {guest.company}</span>}
                    <span>Invited {format(new Date(guest.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  {(guest.projectIds as number[])?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {(guest.projectIds as number[]).map(pid => {
                        const p = projects.find((pr: any) => pr.id === pid);
                        return p ? (
                          <span key={pid} className="text-xs px-2 py-0.5 bg-secondary rounded-full">{p.name}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyInviteLink(guest)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy invite link"
                  >
                    {copiedId === guest.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeGuest.mutate(guest.id)}
                    className="p-2 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
                    title="Remove guest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showInvite} title="Invite Guest" onClose={() => setShowInvite(false)}>
          <div className="space-y-4 p-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Guest name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email *</label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="guest@company.com" type="email" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Company</label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Access Level</label>
              <div className="flex gap-2">
                {[["view_only", "View Only"], ["comment", "Comment"], ["edit", "Edit"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, accessLevel: val })}
                    className={`px-3 py-1.5 rounded-lg text-sm ${form.accessLevel === val ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Project Access</label>
              <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                {projects.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => toggleProject(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                      form.projectIds.includes(p.id) ? "bg-primary/20 text-primary border border-primary/50" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
              {projects.length === 0 && <p className="text-xs text-muted-foreground">No projects yet</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInvite(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => invite.mutate(form)} disabled={!form.name || !form.email} className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" /> Send Invite
              </Button>
            </div>
          </div>
        </Modal>
    </div>
  );
}
