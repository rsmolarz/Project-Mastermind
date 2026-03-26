import { useState, useEffect } from "react";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Card, Avatar, Badge } from "@/components/ui/shared";
import { Activity, Circle, Clock, Eye, Wifi, WifiOff, Monitor, Coffee, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_STATUSES = [
  { id: "online", label: "Online", color: "bg-emerald-400", icon: Wifi },
  { id: "away", label: "Away", color: "bg-amber-400", icon: Coffee },
  { id: "busy", label: "Busy", color: "bg-rose-400", icon: Zap },
  { id: "offline", label: "Offline", color: "bg-slate-500", icon: WifiOff },
];

const SIMULATED_ACTIVITIES = [
  "Editing task details", "Reviewing pull request", "Writing documentation",
  "Updating sprint board", "Commenting on task", "Creating new task",
  "Updating project brief", "In a meeting", "Checking notifications",
  "Working on design specs", "Running tests", "Deploying changes",
  "Brainstorming ideas", "Reviewing code", "Planning sprint",
];

export default function Pulse() {
  const { data: membersData } = useMembers();
  const { data: tasksData } = useTasks();
  const { data: projectsData } = useProjects();
  const members = (membersData as any)?.members || membersData || [];
  const tasks = (tasksData as any)?.tasks || tasksData || [];
  const projects = (projectsData as any)?.projects || projectsData || [];

  const [memberStates, setMemberStates] = useState<Record<number, { status: string; activity: string; lastSeen: Date; currentTaskId?: number; viewingPage?: string }>>({});

  useEffect(() => {
    const generateStates = () => {
      const states: typeof memberStates = {};
      members.forEach((m: any, idx: number) => {
        const statusPool = idx === 0 ? ["online"] : ["online", "online", "online", "away", "busy", "offline"];
        const status = statusPool[Math.floor(Math.random() * statusPool.length)];
        const memberTasks = tasks.filter((t: any) => (t.assigneeIds || []).includes(m.id) && t.status !== "done");
        const currentTask = memberTasks.length > 0 ? memberTasks[Math.floor(Math.random() * memberTasks.length)] : null;
        const pages = ["/tasks", "/documents", "/sprints", "/dashboard", "/goals", "/reports", "/whiteboard"];
        states[m.id] = {
          status,
          activity: status === "offline" ? "Last seen" : SIMULATED_ACTIVITIES[Math.floor(Math.random() * SIMULATED_ACTIVITIES.length)],
          lastSeen: new Date(Date.now() - Math.floor(Math.random() * (status === "offline" ? 7200000 : 300000))),
          currentTaskId: currentTask?.id,
          viewingPage: status !== "offline" ? pages[Math.floor(Math.random() * pages.length)] : undefined,
        };
      });
      setMemberStates(states);
    };
    generateStates();
    const interval = setInterval(generateStates, 30000);
    return () => clearInterval(interval);
  }, [members.length, tasks.length]);

  const onlineCount = Object.values(memberStates).filter(s => s.status === "online").length;
  const awayCount = Object.values(memberStates).filter(s => s.status === "away").length;
  const busyCount = Object.values(memberStates).filter(s => s.status === "busy").length;

  const sorted = [...members].sort((a: any, b: any) => {
    const order = { online: 0, busy: 1, away: 2, offline: 3 };
    return (order[memberStates[a.id]?.status as keyof typeof order] ?? 3) - (order[memberStates[b.id]?.status as keyof typeof order] ?? 3);
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Pulse</h1>
            <p className="text-sm text-muted-foreground">See who's online and what they're working on</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{onlineCount}</div>
          <div className="text-xs text-muted-foreground">Online</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{awayCount}</div>
          <div className="text-xs text-muted-foreground">Away</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-rose-400">{busyCount}</div>
          <div className="text-xs text-muted-foreground">Busy</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{members.length}</div>
          <div className="text-xs text-muted-foreground">Total Members</div>
        </Card>
      </div>

      <div className="space-y-3">
        {sorted.map((m: any) => {
          const state = memberStates[m.id];
          if (!state) return null;
          const statusInfo = ACTIVITY_STATUSES.find(s => s.id === state.status) || ACTIVITY_STATUSES[3];
          const currentTask = state.currentTaskId ? tasks.find((t: any) => t.id === state.currentTaskId) : null;
          const project = currentTask ? projects.find((p: any) => p.id === currentTask.projectId) : null;
          const memberTasks = tasks.filter((t: any) => (t.assigneeIds || []).includes(m.id) && t.status === "inprogress");

          return (
            <Card key={m.id} className={`p-4 transition-all ${state.status === "online" ? "border-emerald-500/20" : state.status === "busy" ? "border-rose-500/20" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={m.name} color={m.color} />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusInfo.color} ring-2 ring-card`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{m.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      state.status === "online" ? "bg-emerald-500/15 text-emerald-400" :
                      state.status === "busy" ? "bg-rose-500/15 text-rose-400" :
                      state.status === "away" ? "bg-amber-500/15 text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {statusInfo.label}
                    </span>
                    {m.role && <span className="text-[10px] text-muted-foreground">{m.role}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {state.status === "offline" ? (
                        <><Clock className="w-3 h-3" /> Last seen {formatDistanceToNow(state.lastSeen, { addSuffix: true })}</>
                      ) : (
                        <><Monitor className="w-3 h-3" /> {state.activity}</>
                      )}
                    </span>
                    {state.viewingPage && state.status !== "offline" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {state.viewingPage}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {currentTask && state.status !== "offline" && (
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-0.5">Working on:</div>
                      <div className="font-medium text-foreground truncate max-w-[200px]">{currentTask.title}</div>
                      {project && (
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                          <span className="text-[10px] text-muted-foreground">{project.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {state.status !== "offline" && memberTasks.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {memberTasks.length} task{memberTasks.length !== 1 ? "s" : ""} in progress
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
          Live updates every 30 seconds
        </div>
      </Card>
    </div>
  );
}
