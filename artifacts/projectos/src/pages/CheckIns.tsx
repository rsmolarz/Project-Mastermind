import { useState, useMemo } from "react";
import { useMembers } from "@/hooks/use-members";
import { Card, Avatar, Badge, Input, Button, Textarea } from "@/components/ui/shared";
import { MessageCircle, Plus, Calendar, ChevronRight, Clock, CheckCircle2, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type CheckIn = {
  id: number;
  question: string;
  frequency: "daily" | "weekly" | "friday";
  responses: { memberId: number; text: string; timestamp: string }[];
  createdAt: string;
};

const DEFAULT_QUESTIONS = [
  "What did you work on today?",
  "What's your plan for tomorrow?",
  "Anything blocking your progress?",
  "What's one thing you learned this week?",
  "How are you feeling about the project?",
];

export default function CheckInsPage() {
  const { data: members = [] } = useMembers();
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-checkins") || "[]"); } catch { return []; }
  });
  const [activeCheckIn, setActiveCheckIn] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newFrequency, setNewFrequency] = useState<"daily" | "weekly" | "friday">("daily");

  const save = (updated: CheckIn[]) => {
    setCheckIns(updated);
    localStorage.setItem("projectos-checkins", JSON.stringify(updated));
  };

  const createCheckIn = () => {
    if (!newQuestion.trim()) return;
    const ci: CheckIn = { id: Date.now(), question: newQuestion.trim(), frequency: newFrequency, responses: [], createdAt: new Date().toISOString() };
    save([ci, ...checkIns]);
    setNewQuestion("");
    setShowCreate(false);
  };

  const addResponse = (checkInId: number) => {
    if (!responseText.trim()) return;
    const updated = checkIns.map(ci => {
      if (ci.id !== checkInId) return ci;
      return { ...ci, responses: [...ci.responses, { memberId: 1, text: responseText.trim(), timestamp: new Date().toISOString() }] };
    });
    save(updated);
    setResponseText("");
  };

  const deleteCheckIn = (id: number) => {
    save(checkIns.filter(ci => ci.id !== id));
    if (activeCheckIn === id) setActiveCheckIn(null);
  };

  const active = checkIns.find(ci => ci.id === activeCheckIn);
  const freqLabel: Record<string, string> = { daily: "Every day", weekly: "Every Monday", friday: "Every Friday" };
  const freqColor: Record<string, string> = { daily: "bg-blue-500/15 text-blue-400", weekly: "bg-emerald-500/15 text-emerald-400", friday: "bg-violet-500/15 text-violet-400" };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Check-ins</h1>
            <p className="text-sm text-muted-foreground">Automatic team check-ins and status updates</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Check-in</Button>
      </div>

      {showCreate && (
        <Card className="p-5 border-primary/20">
          <h3 className="font-bold mb-3">Create Check-in Question</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Question</label>
              <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="e.g. What did you work on today?" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block w-full">Quick Templates</label>
              {DEFAULT_QUESTIONS.map(q => (
                <button key={q} onClick={() => setNewQuestion(q)} className="text-[10px] px-2 py-1 bg-secondary/50 border border-border rounded-lg hover:border-primary/30 transition-colors">{q}</button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Frequency</label>
              <div className="flex gap-2">
                {(["daily", "weekly", "friday"] as const).map(f => (
                  <button key={f} onClick={() => setNewFrequency(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${newFrequency === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground bg-secondary/50"}`}>
                    {freqLabel[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createCheckIn} disabled={!newQuestion.trim()}>Create</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2">
          {checkIns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No check-ins yet</p>
              <p className="text-xs mt-1">Create your first automatic check-in</p>
            </div>
          ) : (
            checkIns.map(ci => (
              <Card key={ci.id} onClick={() => setActiveCheckIn(ci.id)}
                className={`p-3 cursor-pointer transition-all ${activeCheckIn === ci.id ? "border-primary/30 bg-primary/5" : "hover:border-border/60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{ci.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${freqColor[ci.frequency]}`}>{freqLabel[ci.frequency]}</span>
                      <span className="text-[10px] text-muted-foreground">{ci.responses.length} responses</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteCheckIn(ci.id); }} className="text-muted-foreground/40 hover:text-rose-400"><X className="w-3 h-3" /></button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="col-span-2">
          {active ? (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{active.question}</h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${freqColor[active.frequency]}`}>{freqLabel[active.frequency]}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Created {format(new Date(active.createdAt), "MMM d, yyyy")}
                </span>
              </div>

              <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                {active.responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No responses yet. Be the first!</p>
                ) : (
                  active.responses.map((r, i) => {
                    const member = members.find((m: any) => m.id === r.memberId);
                    return (
                      <div key={i} className="flex gap-3 bg-secondary/20 rounded-xl p-3">
                        <Avatar name={member?.name || "You"} color={member?.color || "#6366f1"} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold">{member?.name || "You"}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-foreground/80">{r.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Input value={responseText} onChange={e => setResponseText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addResponse(active.id)}
                  placeholder="Write your response..." className="flex-1" />
                <Button onClick={() => addResponse(active.id)} disabled={!responseText.trim()}>Reply</Button>
              </div>
            </Card>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Select a check-in to view responses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
