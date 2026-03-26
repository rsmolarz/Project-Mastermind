import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Check, Clock, Calendar, AlertTriangle, Star, Filter } from "lucide-react";
import { Card, Button, Input, Badge } from "@/components/ui/shared";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";

type Reminder = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  starred: boolean;
  createdAt: string;
};

const STORAGE_KEY = "projectos-reminders";
const genId = () => Math.random().toString(36).slice(2, 9);

function loadReminders(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveReminders(reminders: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "overdue" | "completed">("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const update = (updated: Reminder[]) => {
    setReminders(updated);
    saveReminders(updated);
  };

  const addReminder = () => {
    if (!newTitle.trim()) return;
    const r: Reminder = {
      id: genId(),
      title: newTitle,
      description: newDesc,
      dueDate: newDate || null,
      dueTime: newTime,
      priority: newPriority,
      completed: false,
      starred: false,
      createdAt: new Date().toISOString(),
    };
    update([r, ...reminders]);
    setNewTitle(""); setNewDesc(""); setNewDate(""); setNewTime("09:00"); setNewPriority("medium");
    setShowNew(false);
  };

  const toggleComplete = (id: string) => {
    update(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const toggleStar = (id: string) => {
    update(reminders.map(r => r.id === id ? { ...r, starred: !r.starred } : r));
  };

  const deleteReminder = (id: string) => {
    update(reminders.filter(r => r.id !== id));
  };

  const addQuick = (label: string, daysAhead: number) => {
    const r: Reminder = {
      id: genId(),
      title: label,
      description: "",
      dueDate: format(addDays(new Date(), daysAhead), "yyyy-MM-dd"),
      dueTime: "09:00",
      priority: "medium",
      completed: false,
      starred: false,
      createdAt: new Date().toISOString(),
    };
    update([r, ...reminders]);
  };

  const filtered = reminders
    .filter(r => {
      if (filter === "completed") return r.completed;
      if (filter === "overdue") return !r.completed && r.dueDate && isPast(new Date(`${r.dueDate}T${r.dueTime}`));
      if (filter === "upcoming") return !r.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const overdueCount = reminders.filter(r => !r.completed && r.dueDate && isPast(new Date(`${r.dueDate}T${r.dueTime}`))).length;
  const todayCount = reminders.filter(r => !r.completed && r.dueDate && isToday(new Date(r.dueDate))).length;
  const upcomingCount = reminders.filter(r => !r.completed).length;

  const getDueLabel = (r: Reminder) => {
    if (!r.dueDate) return null;
    const d = new Date(r.dueDate);
    if (isToday(d)) return { text: `Today at ${r.dueTime}`, color: "text-amber-400" };
    if (isTomorrow(d)) return { text: `Tomorrow at ${r.dueTime}`, color: "text-blue-400" };
    if (isPast(d) && !r.completed) return { text: `Overdue: ${format(d, "MMM d")}`, color: "text-rose-400" };
    return { text: format(d, "MMM d") + ` at ${r.dueTime}`, color: "text-muted-foreground" };
  };

  const PRIORITY_COLORS: Record<string, string> = { high: "text-rose-400", medium: "text-amber-400", low: "text-slate-400" };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" /> Reminders
          </h1>
          <p className="text-muted-foreground mt-1">Personal reminders and follow-ups.</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)} className="gap-2">
          <Plus className="w-4 h-4" /> New Reminder
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilter("all")}>
          <div className="text-2xl font-bold text-foreground">{reminders.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Total</div>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilter("upcoming")}>
          <div className="text-2xl font-bold text-primary">{upcomingCount}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Upcoming</div>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilter("overdue")}>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-rose-400" : "text-muted-foreground"}`}>{overdueCount}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Overdue</div>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilter("completed")}>
          <div className="text-2xl font-bold text-emerald-400">{reminders.filter(r => r.completed).length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Done</div>
        </Card>
      </div>

      {showNew && (
        <Card className="p-5 border-primary/30">
          <div className="space-y-4">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Reminder title..." className="text-lg font-medium" autoFocus />
            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Add description (optional)" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date</label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time</label>
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Priority</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addReminder} disabled={!newTitle.trim()}>Add Reminder</Button>
              <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium mr-1">Quick add:</span>
        {[
          { label: "Follow up tomorrow", days: 1 },
          { label: "Review next week", days: 7 },
          { label: "Check in 30 days", days: 30 },
        ].map(q => (
          <button key={q.label} onClick={() => addQuick(q.label, q.days)}
            className="text-xs px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            + {q.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2">
        {(["all", "upcoming", "overdue", "completed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">{filter === "all" ? "No reminders yet" : `No ${filter} reminders`}</p>
          </div>
        )}
        {filtered.map(r => {
          const due = getDueLabel(r);
          return (
            <Card key={r.id} className={`p-4 flex items-start gap-3 transition-all ${r.completed ? "opacity-60" : ""}`}>
              <button onClick={() => toggleComplete(r.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${r.completed ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"}`}>
                {r.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.title}</span>
                  <span className={`text-[10px] font-bold uppercase ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                </div>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                {due && (
                  <div className={`flex items-center gap-1 mt-1.5 text-xs ${due.color}`}>
                    <Clock className="w-3 h-3" /> {due.text}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleStar(r.id)}
                  className={`p-1.5 rounded-lg transition-colors ${r.starred ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}`}>
                  <Star className={`w-4 h-4 ${r.starred ? "fill-current" : ""}`} />
                </button>
                <button onClick={() => deleteReminder(r.id)} className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
