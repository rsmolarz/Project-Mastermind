import { useState, useEffect, useMemo } from "react";
import { useTimeEntries, useCreateTimeEntryMutation } from "@/hooks/use-time";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Input, Avatar, Badge } from "@/components/ui/shared";
import { Play, Square, Clock, DollarSign, TrendingUp, Percent } from "lucide-react";
import { format } from "date-fns";

export default function Time() {
  const { data: entries = [], isLoading } = useTimeEntries();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  
  const createEntry = useCreateTimeEntryMutation();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [desc, setDesc] = useState("");
  const [projId, setProjId] = useState<number>(1);
  const [memberId, setMemberId] = useState<number>(1);

  useEffect(() => {
    let interval: any;
    if (running) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const toggleTimer = () => {
    if (!running) {
      setRunning(true);
    } else {
      const member = members.find(m => m.id === memberId);
      const hours = Math.max(0.25, Math.round((elapsed / 3600) * 4) / 4);
      const rate = member?.rate || 100;
      
      createEntry.mutate({
        data: {
          memberId,
          projectId: projId,
          description: desc || "Timer entry",
          hours,
          date: new Date().toISOString(),
          billable: true,
          rate
        }
      });
      
      setRunning(false);
      setElapsed(0);
      setDesc("");
    }
  };

  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayHours = entries.filter(e => new Date(e.date).toDateString() === todayStr).reduce((a, e) => a + e.hours, 0);
  const weekAmount = entries.filter(e => new Date(e.date) >= weekAgo).reduce((a, e) => a + e.amount, 0);
  const billableHours = entries.filter(e => e.billable).reduce((a, e) => a + e.hours, 0);
  const billablePct = entries.length > 0 ? Math.round(entries.filter(e => e.billable).length / entries.length * 100) : 0;

  const grouped = useMemo(() => {
    const g: Record<string, { dateStr: string; date: Date; entries: typeof entries }> = {};
    entries.slice(0, 60).forEach(e => {
      const d = new Date(e.date);
      const k = d.toDateString();
      if (!g[k]) g[k] = { dateStr: k, date: d, entries: [] };
      g[k].entries.push(e);
    });
    return Object.values(g).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [entries]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 lg:p-8 pb-0 shrink-0">
        <h1 className="text-3xl font-display font-bold">Time & Billing</h1>
        <p className="text-muted-foreground mt-1">Track hours and generate billing reports.</p>
      </div>

      <div className="px-6 lg:px-8 pt-6 shrink-0">
        <Card className={`p-6 border-2 transition-colors ${running ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-border'}`}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`font-mono text-5xl font-black tracking-tighter w-48 text-center ${running ? 'text-emerald-400' : 'text-foreground'}`}>
              {formatTime(elapsed)}
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
              <select 
                value={memberId} 
                onChange={e => setMemberId(parseInt(e.target.value))}
                disabled={running}
                className="px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm outline-none focus:border-primary min-w-[130px]"
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select 
                value={projId} 
                onChange={e => setProjId(parseInt(e.target.value))}
                disabled={running}
                className="px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm outline-none focus:border-primary min-w-[130px]"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input 
                placeholder="What are you working on?" 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !running && toggleTimer()}
                className="flex-1 text-sm"
              />
            </div>

            <button 
              onClick={toggleTimer}
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-xl ${
                running ? 'bg-rose-500 text-white shadow-rose-500/25' : 'bg-emerald-500 text-white shadow-emerald-500/25'
              }`}
            >
              {running ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 lg:px-8 py-4 shrink-0">
        <Card className="p-4">
          <Clock className="w-5 h-5 text-primary mb-2" />
          <div className="text-2xl font-mono font-bold text-primary">{todayHours.toFixed(1)}h</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Today</div>
        </Card>
        <Card className="p-4">
          <DollarSign className="w-5 h-5 text-sky-400 mb-2" />
          <div className="text-2xl font-mono font-bold text-sky-400">${weekAmount.toLocaleString()}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">This Week</div>
        </Card>
        <Card className="p-4">
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-mono font-bold text-emerald-400">{billableHours.toFixed(1)}h</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Billable</div>
        </Card>
        <Card className="p-4">
          <Percent className="w-5 h-5 text-teal-400 mb-2" />
          <div className="text-2xl font-mono font-bold text-teal-400">{billablePct}%</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Billable %</div>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-secondary/90 backdrop-blur-sm">Date</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-secondary/90 backdrop-blur-sm">Member</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-secondary/90 backdrop-blur-sm">Project</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-secondary/90 backdrop-blur-sm">Description</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-secondary/90 backdrop-blur-sm">Hours</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-secondary/90 backdrop-blur-sm">Amount</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-secondary/90 backdrop-blur-sm">Bill.</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : grouped.map(group => {
                  const dayHours = group.entries.reduce((a, e) => a + e.hours, 0);
                  const dayAmount = group.entries.reduce((a, e) => a + e.amount, 0);
                  const isToday = group.dateStr === todayStr;
                  
                  return [
                    <tr key={`group-${group.dateStr}`}>
                      <td colSpan={7}>
                        <div className="flex items-center gap-3 px-4 py-2 bg-background border-b border-border">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {format(group.date, "EEE, MMM d")}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">·</span>
                          <span className="text-[10px] font-mono font-bold text-foreground">{dayHours.toFixed(1)}h</span>
                          <span className="text-[10px] font-mono text-muted-foreground">·</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">${dayAmount.toLocaleString()}</span>
                          {isToday && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>,
                    ...group.entries.map(entry => {
                      const member = members.find(m => m.id === entry.memberId);
                      const project = projects.find(p => p.id === entry.projectId);
                      return (
                        <tr key={entry.id} className="hover:bg-white/5 transition-colors border-b border-border/20">
                          <td className="p-4 font-mono text-sm text-muted-foreground">
                            {format(new Date(entry.date), "MMM d")}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={member?.name || "U"} color={member?.color} />
                              <span className="font-medium text-sm">{member?.name?.split(" ")[0]}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-semibold" style={{ color: project?.color }}>{project?.icon} {project?.name}</span>
                          </td>
                          <td className="p-4 text-sm text-foreground max-w-[200px] truncate">
                            {entry.description}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-sm">
                            {entry.hours.toFixed(1)}h
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-sm text-emerald-400">
                            ${entry.amount.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className={`w-2 h-2 rounded-full ${entry.billable ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                          </td>
                        </tr>
                      );
                    })
                  ];
                })}
                {entries.length === 0 && !isLoading && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No time entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
