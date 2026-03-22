import { useState } from "react";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import { useAiChatMutation } from "@/hooks/use-ai";
import { Card, Avatar, Button } from "@/components/ui/shared";
import { Sparkles, RefreshCw, Sunrise } from "lucide-react";

export default function Standups() {
  const { data: members = [] } = useMembers();
  const { data: tasks = [] } = useTasks();
  const aiChat = useAiChatMutation();
  const [standups, setStandups] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const generateLocalStandup = (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return "";

    const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(memberId));
    const inProgress = memberTasks.filter(t => t.status === "inprogress");
    const todo = memberTasks.filter(t => t.status === "todo");
    const blocked = memberTasks.filter(t => t.status === "blocked");
    const done = memberTasks.filter(t => t.status === "done");

    const yesterday = done.length > 0
      ? `Completed work on ${done[0].title}`
      : inProgress.length > 0
        ? `Made progress on ${inProgress[0].title}`
        : "Handled team tasks and reviews";

    const today = inProgress.length > 0
      ? `Focusing on ${inProgress.map(t => t.title).slice(0, 2).join(" and ")}`
      : todo.length > 0
        ? `Starting ${todo[0].title}`
        : "Available for new tasks";

    const blockers = blocked.length > 0
      ? `Blocked on ${blocked.map(t => t.title).join(", ")}`
      : "No blockers";

    return `Yesterday: ${yesterday}\nToday: ${today}\nBlockers: ${blockers}`;
  };

  const generateStandup = async (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    setLoading(prev => ({ ...prev, [memberId]: true }));

    try {
      const memberTasks = tasks.filter(t =>
        (t.assigneeIds as number[])?.includes(memberId) && t.status !== "done"
      ).slice(0, 4);

      const msg = `standup for ${member.name} (${member.role}). Tasks: ${memberTasks.map(t => `[${t.status}] ${t.title}`).join("; ") || "no current tasks"}`;

      aiChat.mutate(
        { data: { message: msg } },
        {
          onSuccess: (result) => {
            setStandups(prev => ({ ...prev, [memberId]: result.reply }));
            setLoading(prev => ({ ...prev, [memberId]: false }));
          },
          onError: () => {
            setStandups(prev => ({ ...prev, [memberId]: generateLocalStandup(memberId) }));
            setLoading(prev => ({ ...prev, [memberId]: false }));
          }
        }
      );
    } catch {
      setStandups(prev => ({ ...prev, [memberId]: generateLocalStandup(memberId) }));
      setLoading(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const generateAll = () => {
    const allLoading: Record<number, boolean> = {};
    members.forEach(m => { allLoading[m.id] = true; });
    setLoading(allLoading);

    const results: Record<number, string> = {};
    members.forEach(m => {
      results[m.id] = generateLocalStandup(m.id);
    });
    setStandups(results);

    const allDone: Record<number, boolean> = {};
    members.forEach(m => { allDone[m.id] = false; });
    setLoading(allDone);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Daily Standups</h1>
          <p className="text-muted-foreground mt-1">AI-generated standups from live task data.</p>
        </div>
        <Button onClick={generateAll} className="gap-2">
          <Sparkles className="w-4 h-4" /> Generate All
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-4">
          <Sunrise className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <div className="font-display font-bold text-lg">Good morning! Time for standups.</div>
            <p className="text-sm text-muted-foreground">AI generates each person's standup from their live task data. Review and share.</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {members.map(member => {
          const memberTasks = tasks.filter(t =>
            (t.assigneeIds as number[])?.includes(member.id) && t.status !== "done"
          );
          const standup = standups[member.id];
          const isLoading = loading[member.id];

          return (
            <Card key={member.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-background shrink-0" style={{ backgroundColor: member.color }}>
                  {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.role} · {memberTasks.length} open tasks
                  </div>
                </div>
                <button
                  onClick={() => generateStandup(member.id)}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {standup ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background rounded-xl p-4 border border-border">
                  {standup}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8 bg-background rounded-xl border border-border">
                  Click the sparkle button to generate standup
                </div>
              )}

              {standup && (
                <div className="text-[10px] text-muted-foreground font-mono mt-3">
                  Generated just now
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
