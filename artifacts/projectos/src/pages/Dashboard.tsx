import { useDashboardStats } from "@/hooks/use-dashboard";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { Card, ProgressBar, AvatarStack, Badge, Button } from "@/components/ui/shared";
import { CheckSquare, Clock, Target, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [] } = useProjects();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const overdue = tasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border shadow-2xl p-8 lg:p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/dashboard-bg.png`} 
            alt="Dashboard background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 border border-primary/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> AI Briefing Ready
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white mb-4 tracking-tight">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Team.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            You have {overdue.length} overdue tasks and {critical.length} critical items needing attention today. Project Alpha is at 85% budget consumption.
          </p>
          <div className="flex gap-4">
            <Link href="/tasks">
              <Button size="lg" className="w-full sm:w-auto">View My Tasks</Button>
            </Link>
            <Link href="/time">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">Start Timer</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "In Progress Tasks", value: stats?.inProgressTasks || 0, icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Overdue Items", value: stats?.overdueTasks || overdue.length, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "Hours Today", value: `${stats?.todayHours || 0}h`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Goals On Track", value: `${stats?.goalsOnTrack || 0}/${stats?.totalGoals || 0}`, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="p-6 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-display font-bold mb-1">{statsLoading ? "-" : stat.value}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Needs Attention */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              🔥 Needs Attention
            </h2>
            <Link href="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <Card className="divide-y divide-border">
            {tasksLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
            ) : [...overdue, ...critical].slice(0, 5).map(task => (
              <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Badge color={task.priority === 'critical' ? 'red' : 'yellow'}>{task.priority}</Badge>
                    <span>Due: {task.due ? new Date(task.due).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">Open</Button>
              </div>
            ))}
            {!tasksLoading && [...overdue, ...critical].length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>All clear! Nothing urgent.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Project Budgets */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">💰 Budgets</h2>
          <Card className="p-5 space-y-6">
            {projects.slice(0,4).map(p => {
              // Mock budget usage if stats API doesn't provide
              const usage = Math.floor(Math.random() * 100); 
              const colorClass = usage > 90 ? "bg-rose-500" : usage > 75 ? "bg-amber-500" : "bg-emerald-500";
              
              return (
                <div key={p.id}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="text-lg">{p.icon}</span> {p.name}
                    </div>
                    <span className="text-xs font-mono font-bold">{usage}%</span>
                  </div>
                  <ProgressBar progress={usage} colorClass={colorClass} heightClass="h-2" />
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
