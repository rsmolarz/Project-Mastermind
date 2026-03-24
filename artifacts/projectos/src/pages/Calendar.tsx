import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw,
  Clock, MapPin, Users, Video, ExternalLink, Bell, Loader2, X,
  LayoutGrid, List, AlertTriangle, Check, Link2
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

function fetchApi(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, { credentials: "include", ...options });
}

interface CalendarEvent {
  id: number;
  googleEventId: string | null;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  status: string;
  colorId: string | null;
  organizer: string | null;
  attendees: Array<{ email: string; displayName?: string; responseStatus?: string }> | null;
  conferenceLink: string | null;
  htmlLink: string | null;
  projectId: number | null;
  syncedAt: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS: Record<string, string> = {
  "1": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "2": "bg-green-500/20 text-green-400 border-green-500/30",
  "3": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "4": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "5": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "6": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "7": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "8": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "9": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "10": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "11": "bg-red-500/20 text-red-400 border-red-500/30",
  default: "bg-primary/15 text-primary border-primary/30",
};

function getEventColor(colorId: string | null) {
  return EVENT_COLORS[colorId || ""] || EVENT_COLORS.default;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateRange(start: string, end: string, allDay: boolean) {
  if (allDay) return "All day";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function CalendarPage() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const startOfRange = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return d.toISOString();
  }, [currentDate]);

  const endOfRange = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
    return d.toISOString();
  }, [currentDate]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", startOfRange, endOfRange],
    queryFn: () => fetchApi(`/calendar/events?start=${startOfRange}&end=${endOfRange}`).then(r => r.json()),
  });

  const syncMutation = useMutation({
    mutationFn: () => fetchApi("/calendar/sync", { method: "POST" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const eventsForDay = (date: Date) => {
    return events.filter(e => {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      return isSameDay(start, date) || (start <= date && end >= date);
    });
  };

  const today = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.startTime) >= today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 20);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-primary" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Google Calendar integration — appointments, meetings, and reminders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm hover:bg-white/5 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync Now"}
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {syncMutation.isSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
          <Check className="w-4 h-4" />
          Synced: {(syncMutation.data as any)?.added || 0} added, {(syncMutation.data as any)?.updated || 0} updated, {(syncMutation.data as any)?.removed || 0} removed
        </motion.div>
      )}
      {syncMutation.isError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" /> Sync failed: {(syncMutation.error as Error)?.message}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-display font-bold min-w-[200px] text-center">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-white/5 transition-colors">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          <button onClick={() => setView("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "month" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Month
          </button>
          <button onClick={() => setView("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "agenda" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <List className="w-3.5 h-3.5" /> Agenda
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : view === "month" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-3 py-2 text-xs font-bold text-muted-foreground text-center uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = eventsForDay(day.date);
              const isToday = isSameDay(day.date, today);
              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDay(day.date); }}
                  className={`min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors ${!day.isCurrentMonth ? "opacity-40" : ""} ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-white" : "text-muted-foreground"}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(e.colorId)}`}
                      >
                        {!e.allDay && <span className="font-mono mr-1">{formatTime(e.startTime)}</span>}
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No upcoming events</p>
              <p className="text-xs text-muted-foreground mt-1">Sync your Google Calendar or create a new event</p>
            </div>
          ) : (
            upcomingEvents.map(e => {
              const startDate = new Date(e.startTime);
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedEvent(e)}
                  className="flex gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="text-center shrink-0 w-14">
                    <div className="text-xs text-muted-foreground">{DAY_NAMES[startDate.getDay()]}</div>
                    <div className="text-2xl font-bold">{startDate.getDate()}</div>
                    <div className="text-[10px] text-muted-foreground">{MONTH_NAMES[startDate.getMonth()].substring(0, 3)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getEventColor(e.colorId).split(" ")[0].replace("/20", "/60")}`} />
                      <h3 className="font-semibold text-sm truncate">{e.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {formatDateRange(e.startTime, e.endTime, e.allDay)}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin className="w-3 h-3" /> {e.location}
                        </span>
                      )}
                      {e.conferenceLink && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Video className="w-3 h-3" /> Video call
                        </span>
                      )}
                      {e.attendees && e.attendees.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" /> {e.attendees.length}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onSetReminder={() => {}} />
        )}
        {showCreateModal && (
          <CreateEventModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => { setShowCreateModal(false); qc.invalidateQueries({ queryKey: ["calendar-events"] }); }}
            initialDate={selectedDay}
          />
        )}
        {selectedDay && !showCreateModal && !selectedEvent && (
          <DayEventsPanel
            date={selectedDay}
            events={eventsForDay(selectedDay)}
            onClose={() => setSelectedDay(null)}
            onSelectEvent={setSelectedEvent}
            onCreateEvent={() => setShowCreateModal(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void; onSetReminder: () => void }) {
  const qc = useQueryClient();
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [reminderType, setReminderType] = useState("in_app");
  const [reminderTarget, setReminderTarget] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");

  const reminderMutation = useMutation({
    mutationFn: (body: any) => fetchApi(`/calendar/events/${event.id}/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => setReminderMsg("Reminder set!"),
    onError: (e: Error) => setReminderMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetchApi(`/calendar/events/${event.id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar-events"] }); onClose(); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{event.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatDateRange(event.startTime, event.endTime, event.allDay)}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          {event.conferenceLink && (
            <a href={event.conferenceLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-primary hover:underline">
              <Video className="w-4 h-4" />
              <span>Join video call</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Attendees ({event.attendees.length})</span>
              </div>
              <div className="space-y-1.5 ml-6">
                {event.attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${a.responseStatus === "accepted" ? "bg-emerald-400" : a.responseStatus === "declined" ? "bg-red-400" : a.responseStatus === "tentative" ? "bg-amber-400" : "bg-gray-400"}`} />
                    <span>{a.displayName || a.email}</span>
                    <span className="text-muted-foreground capitalize">({a.responseStatus || "pending"})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div className="bg-background rounded-xl p-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {event.htmlLink && (
            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Link2 className="w-3 h-3" /> Open in Google Calendar
            </a>
          )}

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-primary" /> Set Reminder
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Minutes before</label>
                <select value={reminderMinutes} onChange={e => setReminderMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="1440">1 day</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Notification type</label>
                <select value={reminderType} onChange={e => setReminderType(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                  <option value="in_app">In-App</option>
                  <option value="sms">SMS</option>
                  <option value="call">Voice Call</option>
                </select>
              </div>
            </div>
            {(reminderType === "sms" || reminderType === "call") && (
              <div className="mt-2">
                <label className="text-[11px] text-muted-foreground mb-1 block">Phone number</label>
                <input value={reminderTarget} onChange={e => setReminderTarget(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => reminderMutation.mutate({ minutesBefore: parseInt(reminderMinutes), notificationType: reminderType, target: reminderTarget })}
                disabled={reminderMutation.isPending || ((reminderType === "sms" || reminderType === "call") && !reminderTarget)}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {reminderMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                Set Reminder
              </button>
              {reminderMsg && <span className="text-xs text-emerald-400">{reminderMsg}</span>}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-between">
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-border rounded-lg text-sm hover:text-foreground transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateEventModal({ onClose, onCreated, initialDate }: { onClose: () => void; onCreated: () => void; initialDate: Date | null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState("");

  const defaultDate = initialDate || new Date();
  const dateStr = defaultDate.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(dateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(dateStr);
  const [endTime, setEndTime] = useState("10:00");
  const [attendeesStr, setAttendeesStr] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: any) => fetchApi("/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => {
      if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
      return r.json();
    }),
    onSuccess: () => onCreated(),
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }

    const start = allDay ? new Date(startDate + "T00:00:00") : new Date(startDate + "T" + startTime);
    const end = allDay ? new Date(endDate + "T23:59:59") : new Date(endDate + "T" + endTime);
    const attendees = attendeesStr.split(",").map(s => s.trim()).filter(Boolean);

    createMutation.mutate({ title: title.trim(), description: description || undefined, location: location || undefined, startTime: start.toISOString(), endTime: end.toISOString(), allDay, attendees: attendees.length > 0 ? attendees : undefined });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold">New Calendar Event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} id="allDay" className="rounded" />
            <label htmlFor="allDay" className="text-xs text-muted-foreground">All-day event</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Office, Zoom link, etc."
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Notes..."
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Attendees (comma-separated emails)</label>
            <input value={attendeesStr} onChange={e => setAttendeesStr(e.target.value)} placeholder="user@example.com, user2@example.com"
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm" />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" /> {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Event
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white/5 border border-border rounded-xl text-sm">Cancel</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function DayEventsPanel({ date, events, onClose, onSelectEvent, onCreateEvent }: {
  date: Date; events: CalendarEvent[]; onClose: () => void; onSelectEvent: (e: CalendarEvent) => void; onCreateEvent: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No events this day</p>
          ) : (
            events.map(e => (
              <div key={e.id} onClick={() => onSelectEvent(e)}
                className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(e.colorId)}`}>
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs mt-0.5 opacity-75">{formatDateRange(e.startTime, e.endTime, e.allDay)}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border">
          <button onClick={onCreateEvent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
