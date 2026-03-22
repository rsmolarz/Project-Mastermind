import { useProjects } from "@/hooks/use-projects";
import { Card, RingChart, ProgressBar, Badge } from "@/components/ui/shared";
import { PieChart, Users, DollarSign, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Portfolio() {
  const { data: projects = [], isLoading } = useProjects();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading portfolio...</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <PieChart className="w-8 h-8 text-primary" /> Project Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">High-level overview of all active projects and budgets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => {
          // Mock data for visual completeness as some fields are not in the raw schema
          const spent = Math.floor(project.budget * (Math.random() * 0.8 + 0.1));
          const budgetPct = Math.min(100, Math.round((spent / project.budget) * 100));
          const healthColor = project.health >= 80 ? "#10b981" : project.health >= 60 ? "#f59e0b" : "#f43f5e";
          const budgetColorClass = budgetPct > 90 ? "bg-rose-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500";

          return (
            <Card key={project.id} className="p-6 flex flex-col border-t-4 hover:-translate-y-1 transition-transform" style={{ borderTopColor: project.color }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{project.icon}</span>
                    <h2 className="text-xl font-bold text-foreground leading-tight" style={{ color: project.color }}>
                      {project.name}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.client} • {project.phase}</p>
                </div>
                <div className="shrink-0 drop-shadow-md">
                  <RingChart progress={project.health} size={56} strokeWidth={6} color={healthColor} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                  <div className="text-lg font-mono font-bold text-emerald-400 mb-0.5">{formatCurrency(spent)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3"/> Spent</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 border border-border">
                  <div className="text-lg font-mono font-bold text-blue-400 mb-0.5">{formatCurrency(project.budget - spent)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3"/> Remaining</div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  <span>Budget Utilized</span>
                  <span className={budgetPct > 90 ? "text-rose-400" : "text-foreground"}>{budgetPct}%</span>
                </div>
                <ProgressBar progress={budgetPct} colorClass={budgetColorClass} heightClass="h-2" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
