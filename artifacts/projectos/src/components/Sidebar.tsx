import { Link, useLocation } from "wouter";
import { 
  Home, CheckSquare, Clock, Target, FileText, PieChart, 
  Megaphone, Search, Sparkles, Hexagon
} from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Avatar } from "./ui/shared";

const NAV_MAIN = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: CheckSquare, label: "My Tasks", path: "/tasks" },
];

const NAV_TOOLS = [
  { icon: FileText, label: "Docs & Wiki", path: "/documents" },
  { icon: Clock, label: "Time Tracking", path: "/time" },
];

const NAV_INSIGHTS = [
  { icon: PieChart, label: "Portfolio", path: "/portfolio" },
  { icon: Target, label: "Goals & OKRs", path: "/goals" },
  { icon: Megaphone, label: "Announcements", path: "/announcements" },
];

export function Sidebar({ 
  onOpenCmd, 
  onOpenAi 
}: { 
  onOpenCmd: () => void; 
  onOpenAi: () => void;
}) {
  const [location] = useLocation();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const isActive = location === item.path;
    return (
      <Link href={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 flex flex-col h-full bg-card border-r border-border shadow-xl z-10 shrink-0 hidden md:flex">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 mr-3">
          <Hexagon className="w-5 h-5 text-white fill-white/20" />
        </div>
        <div className="font-display font-bold tracking-tight text-lg">ProjectOS</div>
      </div>

      {/* Search Trigger */}
      <div className="p-4 shrink-0">
        <button 
          onClick={onOpenCmd}
          className="w-full flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-xl text-muted-foreground hover:border-primary/50 transition-colors group"
        >
          <Search className="w-4 h-4 group-hover:text-primary" />
          <span className="text-sm">Search...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>
      </div>

      {/* Scrollable Nav */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Workspace</div>
          <div className="space-y-0.5">
            {NAV_MAIN.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Active Projects</div>
            <div className="space-y-0.5">
              {projects.map(p => (
                <Link key={p.id} href={`/tasks?projectId=${p.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-medium text-sm truncate flex-1">{p.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Tools</div>
          <div className="space-y-0.5">
            {NAV_TOOLS.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Insights</div>
          <div className="space-y-0.5">
            {NAV_INSIGHTS.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </div>

      </div>

      {/* Footer Team & AI */}
      <div className="p-4 border-t border-border shrink-0 bg-background/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-medium text-muted-foreground">Team Online</span>
          <div className="flex -space-x-1">
            {members.slice(0,4).map(m => (
              <Avatar key={m.id} name={m.name} color={m.color} />
            ))}
          </div>
        </div>
        
        <button 
          onClick={onOpenAi}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-primary font-bold hover:from-primary/20 hover:to-accent/20 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] group"
        >
          <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm">Ask AI Assistant</span>
          <kbd className="ml-auto text-[10px] font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">⌘I</kbd>
        </button>
      </div>
    </div>
  );
}
