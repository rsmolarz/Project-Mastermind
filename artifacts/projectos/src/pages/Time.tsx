import { useState, useEffect } from "react";
import { useTimeEntries, useCreateTimeEntryMutation } from "@/hooks/use-time";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Input, Avatar, Badge } from "@/components/ui/shared";
import { Play, Square, Clock, DollarSign } from "lucide-react";
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

  // Timer logic
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
      // Stop and save
      const member = members.find(m => m.id === memberId);
      const hours = Math.max(0.25, Math.round((elapsed / 3600) * 4) / 4); // minimum 15m
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

  const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);
  const totalAmount = entries.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      
      <div>
        <h1 className="text-3xl font-display font-bold">Time & Billing</h1>
        <p className="text-muted-foreground mt-1">Track hours and generate billing reports.</p>
      </div>

      {/* Live Timer Card */}
      <Card className={`p-6 border-2 transition-colors ${running ? 'border-primary shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'border-border'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={`font-mono text-5xl font-black tracking-tighter w-48 text-center ${running ? 'text-primary' : 'text-foreground'}`}>
            {formatTime(elapsed)}
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
            <Input 
              placeholder="What are you working on?" 
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="flex-1 text-lg py-4"
              disabled={running}
            />
            <select 
              value={projId} 
              onChange={e => setProjId(parseInt(e.target.value))}
              disabled={running}
              className="px-4 bg-background/50 border border-border rounded-xl outline-none focus:border-primary min-w-[150px]"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select 
              value={memberId} 
              onChange={e => setMemberId(parseInt(e.target.value))}
              disabled={running}
              className="px-4 bg-background/50 border border-border rounded-xl outline-none focus:border-primary min-w-[150px]"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <button 
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-xl ${
              running ? 'bg-rose-500 text-white shadow-rose-500/25' : 'bg-emerald-500 text-white shadow-emerald-500/25'
            }`}
          >
            {running ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <Clock className="w-5 h-5 text-primary mb-3" />
          <div className="text-2xl font-mono font-bold">{totalHours.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Hours</div>
        </Card>
        <Card className="p-5">
          <DollarSign className="w-5 h-5 text-emerald-500 mb-3" />
          <div className="text-2xl font-mono font-bold">${totalAmount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Revenue</div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Member</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Hours</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : entries.map(entry => {
                const member = members.find(m => m.id === entry.memberId);
                const project = projects.find(p => p.id === entry.projectId);
                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member?.name || "U"} color={member?.color} />
                        <span className="font-medium text-sm">{member?.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge color="indigo">{project?.name || `Project ${entry.projectId}`}</Badge>
                    </td>
                    <td className="p-4 text-sm text-foreground max-w-[200px] truncate">
                      {entry.description}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm">
                      {entry.hours.toFixed(2)}h
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm text-emerald-400">
                      ${entry.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && !isLoading && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No time entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
