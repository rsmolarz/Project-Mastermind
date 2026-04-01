import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, Trash2, Clock, Target, Flame, Coffee, CheckCircle2, Play, Settings2, CalendarClock, Shield, Repeat, TrendingUp, Sparkles, Sun, Moon, Zap } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const habitCategories = [
  { id: "wellness", label: "Wellness", icon: "🧘", color: "#10b981" },
  { id: "learning", label: "Learning", icon: "📚", color: "#6366f1" },
  { id: "exercise", label: "Exercise", icon: "🏋️", color: "#f97316" },
  { id: "social", label: "Social", icon: "👥", color: "#ec4899" },
  { id: "creative", label: "Creative", icon: "🎨", color: "#8b5cf6" },
  { id: "admin", label: "Admin", icon: "📋", color: "#64748b" },
];

const habitPresets = [
  { title: "Morning Walk", durationMinutes: 30, preferredTime: "07:00", category: "exercise", icon: "🚶" },
  { title: "Meditation", durationMinutes: 15, preferredTime: "07:30", category: "wellness", icon: "🧘" },
  { title: "Reading", durationMinutes: 30, preferredTime: "20:00", category: "learning", icon: "📖" },
  { title: "Journaling", durationMinutes: 15, preferredTime: "21:00", category: "wellness", icon: "📝" },
  { title: "Workout", durationMinutes: 45, preferredTime: "06:30", category: "exercise", icon: "💪" },
  { title: "Learning Block", durationMinutes: 45, preferredTime: "16:00", category: "learning", icon: "🎓" },
  { title: "Email Triage", durationMinutes: 20, preferredTime: "09:00", category: "admin", icon: "📧" },
  { title: "Team Check-in", durationMinutes: 15, preferredTime: "10:00", category: "social", icon: "🤝" },
];

const blockTypeColors: Record<string, string> = {
  focus: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
  task: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  habit: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  break: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  meeting: "bg-rose-500/20 border-rose-500/40 text-rose-300",
};

export default function SmartSchedule() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"planner" | "focus" | "habits" | "settings">("planner");
  const [showNewFocus, setShowNewFocus] = useState(false);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [planDate, setPlanDate] = useState(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();
  const [focusForm, setFocusForm] = useState({ title: "Focus Time", weeklyGoalHours: 16, minBlockMinutes: 60, maxBlockMinutes: 180, preferredStartTime: "09:00", preferredEndTime: "12:00", mode: "proactive", color: "#6366f1", daysOfWeek: [1, 2, 3, 4, 5] });
  const [habitForm, setHabitForm] = useState({ title: "", durationMinutes: 30, preferredTime: "08:00", category: "wellness", frequency: "daily", timesPerWeek: 5, idealDays: [1, 2, 3, 4, 5], color: "#10b981" });

  const { data: prefs } = useQuery({ queryKey: ["schedule-prefs"], queryFn: () => apiFetch("/schedule/preferences") });
  const { data: focusBlocks = [] } = useQuery({ queryKey: ["focus-blocks"], queryFn: () => apiFetch("/schedule/focus-blocks") });
  const { data: habits = [] } = useQuery({ queryKey: ["habits"], queryFn: () => apiFetch("/schedule/habits") });
  const { data: analytics } = useQuery({ queryKey: ["schedule-analytics"], queryFn: () => apiFetch("/schedule/analytics") });
  const { data: todayBlocks } = useQuery({
    queryKey: ["schedule-blocks", planDate],
    queryFn: () => {
      const start = new Date(planDate); start.setHours(0, 0, 0, 0);
      const end = new Date(planDate); end.setHours(23, 59, 59, 999);
      return apiFetch(`/schedule/blocks?start=${start.toISOString()}&end=${end.toISOString()}`);
    },
  });

  const onErr = (err: any) => toast({ title: "Error", description: err?.message || "Something went wrong", variant: "destructive" });

  const autoPlan = useMutation({
    mutationFn: () => apiFetch("/schedule/auto-plan", { method: "POST", body: JSON.stringify({ date: planDate }) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-analytics"] });
      toast({ title: "Day planned", description: `${data.summary?.total || 0} blocks scheduled` });
    },
    onError: onErr,
  });

  const createFocus = useMutation({
    mutationFn: (data: any) => apiFetch("/schedule/focus-blocks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["focus-blocks"] }); setShowNewFocus(false); toast({ title: "Focus block created" }); },
    onError: onErr,
  });

  const toggleFocus = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiFetch(`/schedule/focus-blocks/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus-blocks"] }),
    onError: onErr,
  });

  const deleteFocus = useMutation({
    mutationFn: (id: number) => apiFetch(`/schedule/focus-blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus-blocks"] }),
    onError: onErr,
  });

  const createHabit = useMutation({
    mutationFn: (data: any) => apiFetch("/schedule/habits", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["habits"] }); setShowNewHabit(false); setHabitForm({ title: "", durationMinutes: 30, preferredTime: "08:00", category: "wellness", frequency: "daily", timesPerWeek: 5, idealDays: [1, 2, 3, 4, 5], color: "#10b981" }); toast({ title: "Habit created" }); },
    onError: onErr,
  });

  const completeHabit = useMutation({
    mutationFn: (id: number) => apiFetch(`/schedule/habits/${id}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-analytics"] });
    },
    onError: onErr,
  });

  const deleteHabit = useMutation({
    mutationFn: (id: number) => apiFetch(`/schedule/habits/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
    onError: onErr,
  });

  const updatePrefs = useMutation({
    mutationFn: (data: any) => apiFetch("/schedule/preferences", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule-prefs"] }),
    onError: onErr,
  });

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              AI Schedule
            </h1>
            <p className="text-muted-foreground mt-1">Auto-plan your day, protect focus time, and build habits that stick</p>
          </div>
          <button onClick={() => autoPlan.mutate()} disabled={autoPlan.isPending} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50">
            <Sparkles className="w-4 h-4" /> {autoPlan.isPending ? "Planning..." : "Auto-Plan Day"}
          </button>
        </div>

        {analytics && (
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Focus Hours", value: analytics.thisWeek?.focusHours || 0, target: analytics.focusGoal?.target, color: "text-indigo-400", icon: Shield },
              { label: "Task Hours", value: analytics.thisWeek?.taskHours || 0, color: "text-blue-400", icon: Clock },
              { label: "Habit Hours", value: analytics.thisWeek?.habitHours || 0, color: "text-emerald-400", icon: Repeat },
              { label: "Habit Streak", value: analytics.habits?.longestStreak || 0, color: "text-amber-400", icon: Flame },
              { label: "Total Blocks", value: analytics.totalBlocks || 0, color: "text-violet-400", icon: CalendarClock },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  {s.target && <span className="text-[10px] text-muted-foreground">Goal: {s.target}h</span>}
                </div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}{typeof s.value === "number" && s.label.includes("Hours") ? "h" : ""}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                {s.target && (
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, (Number(s.value) / s.target) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 w-fit">
          {[
            { id: "planner", label: "Daily Planner", icon: CalendarClock },
            { id: "focus", label: "Focus Time", icon: Shield },
            { id: "habits", label: "Habits", icon: Repeat },
            { id: "settings", label: "Settings", icon: Settings2 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "planner" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              <span className="text-sm text-muted-foreground">{new Date(planDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>

            {(!todayBlocks || todayBlocks.length === 0) ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No schedule planned yet</p>
                <p className="text-sm text-muted-foreground mb-4">Click "Auto-Plan Day" to let AI build your optimal schedule.</p>
                <button onClick={() => autoPlan.mutate()} disabled={autoPlan.isPending} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  <Sparkles className="w-4 h-4 inline mr-1" /> {autoPlan.isPending ? "Planning..." : "Auto-Plan This Day"}
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="divide-y divide-border">
                  {(todayBlocks as any[]).map((block: any) => {
                    const start = new Date(block.startTime);
                    const end = new Date(block.endTime);
                    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                    return (
                      <div key={block.id} className={`flex items-center gap-4 p-4 border-l-4 ${blockTypeColors[block.type] || "border-border"}`} style={{ borderLeftColor: block.color }}>
                        <div className="w-20 text-right shrink-0">
                          <div className="text-sm font-mono font-medium">{start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          <div className="text-[10px] text-muted-foreground">{durationMin} min</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{block.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${blockTypeColors[block.type]}`}>{block.type}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "focus" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400" /> Focus Time Defender</h2>
                <p className="text-xs text-muted-foreground mt-1">Protect deep work blocks — the AI will defend your focus time from meeting creep</p>
              </div>
              <button onClick={() => setShowNewFocus(true)} className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Focus Block
              </button>
            </div>

            {showNewFocus && (
              <div className="bg-card border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-400" /> New Focus Block</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Title</label>
                    <input value={focusForm.title} onChange={e => setFocusForm({ ...focusForm, title: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Weekly Goal (hours)</label>
                    <input type="number" min={1} max={60} value={focusForm.weeklyGoalHours} onChange={e => setFocusForm({ ...focusForm, weeklyGoalHours: parseInt(e.target.value) || 16 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Mode</label>
                    <select value={focusForm.mode} onChange={e => setFocusForm({ ...focusForm, mode: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                      <option value="proactive">Proactive (schedule ahead)</option>
                      <option value="reactive">Reactive (defend when at risk)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Start Time</label>
                    <input type="time" value={focusForm.preferredStartTime} onChange={e => setFocusForm({ ...focusForm, preferredStartTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">End Time</label>
                    <input type="time" value={focusForm.preferredEndTime} onChange={e => setFocusForm({ ...focusForm, preferredEndTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Min Block (min)</label>
                    <input type="number" min={15} max={240} value={focusForm.minBlockMinutes} onChange={e => setFocusForm({ ...focusForm, minBlockMinutes: parseInt(e.target.value) || 60 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Max Block (min)</label>
                    <input type="number" min={30} max={480} value={focusForm.maxBlockMinutes} onChange={e => setFocusForm({ ...focusForm, maxBlockMinutes: parseInt(e.target.value) || 180 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Active Days</label>
                  <div className="flex gap-2">
                    {dayNames.map((day, i) => (
                      <button key={i} onClick={() => setFocusForm({ ...focusForm, daysOfWeek: focusForm.daysOfWeek.includes(i) ? focusForm.daysOfWeek.filter(d => d !== i) : [...focusForm.daysOfWeek, i] })}
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${focusForm.daysOfWeek.includes(i) ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "bg-secondary text-muted-foreground border border-border"}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createFocus.mutate(focusForm)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">Create Focus Block</button>
                  <button onClick={() => setShowNewFocus(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            )}

            {focusBlocks.length === 0 && !showNewFocus && (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No focus blocks configured</p>
                <p className="text-sm text-muted-foreground">Set up focus time blocks to protect your deep work.</p>
              </div>
            )}

            {focusBlocks.map((fb: any) => (
              <div key={fb.id} className="bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-10 rounded-full" style={{ backgroundColor: fb.color || "#6366f1" }} />
                    <div>
                      <h3 className="font-semibold">{fb.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatTime(fb.preferredStartTime)} — {formatTime(fb.preferredEndTime)}</span>
                        <span className="capitalize px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">{fb.mode}</span>
                        <span>{fb.weeklyGoalHours}h/week goal</span>
                        <span>{(fb.daysOfWeek as number[]).map(d => dayNames[d]).join(", ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleFocus.mutate({ id: fb.id, enabled: !fb.enabled })} className={`p-2 rounded-lg ${fb.enabled ? "text-indigo-400 hover:bg-indigo-500/10" : "text-muted-foreground hover:bg-secondary"}`}>
                      {fb.enabled ? <Shield className="w-4 h-4" /> : <Shield className="w-4 h-4 opacity-40" />}
                    </button>
                    <button onClick={() => deleteFocus.mutate(fb.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Repeat className="w-5 h-5 text-emerald-400" /> Smart Habits</h2>
                <p className="text-xs text-muted-foreground mt-1">Build routines that flexibly reschedule around your calendar</p>
              </div>
              <button onClick={() => setShowNewHabit(true)} className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Habit
              </button>
            </div>

            {!showNewHabit && habits.length === 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Quick Start — Preset Habits</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {habitPresets.map((p, i) => (
                    <button key={i} onClick={() => { setHabitForm({ ...habitForm, title: p.title, durationMinutes: p.durationMinutes, preferredTime: p.preferredTime, category: p.category }); setShowNewHabit(true); }}
                      className="text-left bg-card border border-border rounded-xl p-3 hover:border-emerald-500/30 transition-colors group">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{p.icon}</span>
                        <span className="text-sm font-medium group-hover:text-emerald-400">{p.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{p.durationMinutes} min · {formatTime(p.preferredTime)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showNewHabit && (
              <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Repeat className="w-4 h-4 text-emerald-400" /> New Habit</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Title</label>
                    <input value={habitForm.title} onChange={e => setHabitForm({ ...habitForm, title: e.target.value })} placeholder="e.g., Morning Walk" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Duration (minutes)</label>
                    <input type="number" min={5} max={240} value={habitForm.durationMinutes} onChange={e => setHabitForm({ ...habitForm, durationMinutes: parseInt(e.target.value) || 30 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Preferred Time</label>
                    <input type="time" value={habitForm.preferredTime} onChange={e => setHabitForm({ ...habitForm, preferredTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {habitCategories.map(c => (
                        <button key={c.id} onClick={() => setHabitForm({ ...habitForm, category: c.id, color: c.color })}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${habitForm.category === c.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-border hover:border-border/80"}`}>
                          <span>{c.icon}</span> {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Active Days</label>
                    <div className="flex gap-2">
                      {dayNames.map((day, i) => (
                        <button key={i} onClick={() => setHabitForm({ ...habitForm, idealDays: habitForm.idealDays.includes(i) ? habitForm.idealDays.filter(d => d !== i) : [...habitForm.idealDays, i] })}
                          className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${habitForm.idealDays.includes(i) ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-secondary text-muted-foreground border border-border"}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createHabit.mutate(habitForm)} disabled={!habitForm.title} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">Create Habit</button>
                  <button onClick={() => setShowNewHabit(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            )}

            {habits.length > 0 && (
              <div className="space-y-3">
                {habits.map((habit: any) => {
                  const cat = habitCategories.find(c => c.id === habit.category);
                  const completedToday = habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString();
                  return (
                    <div key={habit.id} className={`bg-card border rounded-2xl p-5 transition-colors ${completedToday ? "border-emerald-500/40 bg-emerald-500/5" : "border-border hover:border-emerald-500/30"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => completeHabit.mutate(habit.id)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${completedToday ? "bg-emerald-500/20" : "bg-secondary hover:bg-emerald-500/10"}`}>
                            {completedToday ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <span>{cat?.icon || "🔄"}</span>}
                          </button>
                          <div>
                            <h3 className={`font-semibold ${completedToday ? "line-through text-muted-foreground" : ""}`}>{habit.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>{habit.durationMinutes} min</span>
                              <span>{formatTime(habit.preferredTime)}</span>
                              <span className="capitalize px-1.5 py-0.5 rounded" style={{ backgroundColor: (cat?.color || "#10b981") + "20", color: cat?.color }}>{cat?.label || habit.category}</span>
                              {habit.streak > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-400"><Flame className="w-3 h-3" />{habit.streak} day streak</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">{habit.totalCompletions}</div>
                            <div className="text-[10px] text-muted-foreground">completions</div>
                          </div>
                          <button onClick={() => deleteHabit.mutate(habit.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-muted-foreground" /> Schedule Preferences</h2>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Sun className="w-3 h-3" /> Work Start Time</label>
                  <input type="time" value={prefs?.workStartTime || "09:00"} onChange={e => updatePrefs.mutate({ workStartTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Moon className="w-3 h-3" /> Work End Time</label>
                  <input type="time" value={prefs?.workEndTime || "17:00"} onChange={e => updatePrefs.mutate({ workEndTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Buffer Between Meetings (min)</label>
                  <input type="number" min={0} max={60} value={prefs?.bufferMinutes ?? 15} onChange={e => updatePrefs.mutate({ bufferMinutes: parseInt(e.target.value) || 15 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Coffee className="w-3 h-3" /> Lunch Start</label>
                  <input type="time" value={prefs?.lunchStartTime || "12:00"} onChange={e => updatePrefs.mutate({ lunchStartTime: e.target.value })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Lunch Duration (min)</label>
                  <input type="number" min={15} max={120} value={prefs?.lunchDurationMinutes ?? 60} onChange={e => updatePrefs.mutate({ lunchDurationMinutes: parseInt(e.target.value) || 60 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Max Meetings/Day</label>
                  <input type="number" min={0} max={20} value={prefs?.maxMeetingsPerDay ?? 6} onChange={e => updatePrefs.mutate({ maxMeetingsPerDay: parseInt(e.target.value) || 6 })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prefs?.autoScheduleTasks !== false} onChange={e => updatePrefs.mutate({ autoScheduleTasks: e.target.checked })} className="rounded" />
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Auto-schedule tasks into calendar
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prefs?.defendFocusTime !== false} onChange={e => updatePrefs.mutate({ defendFocusTime: e.target.checked })} className="rounded" />
                  <Shield className="w-3.5 h-3.5 text-indigo-400" /> Defend focus time from meetings
                </label>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">Work Days</label>
                <div className="flex gap-2">
                  {dayNames.map((day, i) => {
                    const active = (prefs?.workDays as number[] || [1, 2, 3, 4, 5]).includes(i);
                    return (
                      <button key={i} onClick={() => {
                        const current = prefs?.workDays as number[] || [1, 2, 3, 4, 5];
                        updatePrefs.mutate({ workDays: active ? current.filter((d: number) => d !== i) : [...current, i] });
                      }}
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${active ? "bg-primary/20 text-primary border border-primary/40" : "bg-secondary text-muted-foreground border border-border"}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
