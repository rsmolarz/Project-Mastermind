import { useGoals } from "@/hooks/use-goals";
import { Card, RingChart, ProgressBar, Badge, Button } from "@/components/ui/shared";
import { Target, Sparkles, TrendingUp, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Goals() {
  const { data: goals = [], isLoading } = useGoals();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track": return "#10b981"; // emerald-500
      case "at_risk": return "#f59e0b"; // amber-500
      case "off_track": return "#f43f5e"; // rose-500
      default: return "#6366f1";
    }
  };
  
  const getStatusTailwind = (status: string) => {
    switch (status) {
      case "on_track": return "green"; 
      case "at_risk": return "yellow";
      case "off_track": return "red";
      default: return "gray";
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> Goals & OKRs
          </h1>
          <p className="text-muted-foreground mt-1">Track company objectives and key results.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary"><Sparkles className="w-4 h-4" /> AI Review</Button>
          <Button><Plus className="w-4 h-4" /> New Goal</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground col-span-full">Loading goals...</div>
        ) : goals.map(goal => (
          <Card key={goal.id} className="p-6 flex flex-col h-full border-l-4" style={{ borderLeftColor: getStatusColor(goal.status) }}>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge color={getStatusTailwind(goal.status)} className="capitalize">{goal.status.replace("_", " ")}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">Due {format(new Date(goal.due), "MMM d, yyyy")}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground leading-tight">{goal.title}</h2>
              </div>
              <div className="shrink-0 drop-shadow-lg">
                <RingChart progress={goal.progress} size={72} strokeWidth={8} color={getStatusColor(goal.status)} />
              </div>
            </div>

            <div className="mt-auto space-y-4 bg-secondary/30 p-4 rounded-xl border border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Key Results
              </h3>
              
              {goal.keyResults?.map(kr => {
                const krColor = kr.progress >= 70 ? "bg-emerald-500" : kr.progress >= 40 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={kr.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{kr.title}</span>
                      <span className="font-mono text-muted-foreground">{kr.current} / {kr.target} {kr.unit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar progress={kr.progress} colorClass={krColor} heightClass="h-1.5" />
                      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: getStatusColor(kr.progress >= 70 ? 'on_track' : kr.progress >= 40 ? 'at_risk' : 'off_track') }}>
                        {kr.progress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </Card>
        ))}
      </div>
    </div>
  );
}
