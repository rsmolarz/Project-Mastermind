import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, Badge } from "@/components/ui/shared";
import { Settings as SettingsIcon, Bell, BellOff, Globe, Palette, Mail, Save, Check } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } }).then(r => r.json());

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () => apiFetch("/user-preferences"),
  });

  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs && !form) setForm(prefs);
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/user-preferences", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !form) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const toggles = [
    { key: "notifyTaskAssigned", label: "Task assigned to me", desc: "When someone assigns a task to you" },
    { key: "notifyTaskCompleted", label: "Task completed", desc: "When a task you're involved in is completed" },
    { key: "notifyTaskCommented", label: "New comment on task", desc: "When someone comments on your tasks" },
    { key: "notifyMentioned", label: "Mentioned", desc: "When someone mentions you in a comment" },
    { key: "notifyDueDateApproaching", label: "Due date approaching", desc: "24 hours before a task is due" },
    { key: "notifyProjectUpdates", label: "Project updates", desc: "When project status reports are posted" },
    { key: "notifyApprovals", label: "Approval requests", desc: "When you receive approval requests" },
    { key: "notifyAnnouncements", label: "Announcements", desc: "New team announcements" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage your notification and display preferences</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          className="flex items-center gap-2"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Email Digest
        </h2>
        <div className="flex gap-3">
          {["realtime", "daily", "weekly", "never"].map(freq => (
            <button
              key={freq}
              onClick={() => setForm({ ...form, emailDigestFrequency: freq })}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                form.emailDigestFrequency === freq
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">How often to receive email summaries of your notifications</p>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notification Preferences
        </h2>
        <div className="space-y-4">
          {toggles.map(t => (
            <div key={t.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
              <button
                onClick={() => setForm({ ...form, [t.key]: !form[t.key] })}
                className={`w-10 h-6 rounded-full transition-colors relative ${form[t.key] ? "bg-primary" : "bg-secondary"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[t.key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" /> Display
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Default Task View</label>
            <div className="flex gap-2 flex-wrap">
              {["kanban", "list", "table", "calendar", "gallery", "gantt"].map(v => (
                <button
                  key={v}
                  onClick={() => setForm({ ...form, defaultView: v })}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                    form.defaultView === v ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"].map(tz => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Language</label>
            <select
              value={form.language}
              onChange={e => setForm({ ...form, language: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {[["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["ja", "Japanese"], ["zh", "Chinese"]].map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
