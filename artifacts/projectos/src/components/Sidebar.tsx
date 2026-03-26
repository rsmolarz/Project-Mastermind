import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, CheckSquare, Clock, Target, FileText, PieChart, 
  Megaphone, Search, Sparkles, Hexagon, AlertTriangle, ClipboardList, Repeat, Shield, MessageSquare, Mail, BookOpen, Calendar,
  Users, Zap, FileInput, Flag, ShieldCheck, BarChart3, Sun, Activity, Tag, LayoutTemplate, Star, Trash2, Settings, UserPlus,
  Pencil, Puzzle, Brain, StickyNote, Bell, RefreshCw, X, Wifi, Layers, Inbox, FolderOpen, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import { Avatar } from "./ui/shared";

function FolderGroup({ name, projects, tasks }: { name: string; projects: any[]; tasks: any[] }) {
  const [open, setOpen] = useState(true);
  const totalOpen = projects.reduce((sum, p) => sum + tasks.filter(t => t.projectId === p.id && t.status !== "done").length, 0);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 w-full text-left rounded-lg hover:bg-white/5 transition-colors">
        {open ? <ChevronDownIcon className="w-3 h-3 text-muted-foreground" /> : <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />}
        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-bold text-foreground flex-1 truncate">{name}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{totalOpen}</span>
      </button>
      {open && (
        <div className="ml-3 pl-2 border-l border-border/30 space-y-0.5 mt-0.5">
          {projects.map(p => {
            const openCount = tasks.filter(t => t.projectId === p.id && t.status !== "done").length;
            return (
              <Link key={p.id} href={`/tasks?projectId=${p.id}`} className="flex items-center gap-3 px-3 py-1.5 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-medium truncate flex-1">{p.name}</span>
                {openCount > 0 && <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{openCount}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const { data: tasks = [] } = useTasks();
  const [favorites, setFavorites] = useState<{ label: string; path: string; icon: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-favorites") || "[]"); } catch { return []; }
  });
  const [projectFolders, setProjectFolders] = useState<Record<number, string>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-project-folders") || "{}"); } catch { return {}; }
  });

  const removeFavorite = (path: string) => {
    const next = favorites.filter(f => f.path !== path);
    setFavorites(next);
    localStorage.setItem("projectos-favorites", JSON.stringify(next));
  };

  const ALL_PAGES = [
    { label: "Dashboard", path: "/", icon: "🏠" }, { label: "My Day", path: "/my-day", icon: "☀️" },
    { label: "Tasks", path: "/tasks", icon: "✅" }, { label: "Docs & Wiki", path: "/documents", icon: "📄" },
    { label: "Time & Billing", path: "/time", icon: "⏰" }, { label: "Sprints", path: "/sprints", icon: "🔄" },
    { label: "Cycles", path: "/cycles", icon: "🔁" }, { label: "Messaging", path: "/messaging", icon: "💬" },
    { label: "Email Hub", path: "/email", icon: "📧" }, { label: "Calendar", path: "/calendar", icon: "📅" },
    { label: "Milestones", path: "/milestones", icon: "🏁" }, { label: "Forms", path: "/forms", icon: "📋" },
    { label: "Whiteboard", path: "/whiteboard", icon: "🎨" }, { label: "Mind Maps", path: "/mind-maps", icon: "🧠" },
    { label: "Notepad", path: "/notepad", icon: "📝" }, { label: "Reminders", path: "/reminders", icon: "🔔" },
    { label: "Portfolio", path: "/portfolio", icon: "📊" }, { label: "Goals & OKRs", path: "/goals", icon: "🎯" },
    { label: "Workload", path: "/workload", icon: "👥" }, { label: "Reports", path: "/reports", icon: "📈" },
    { label: "Activity Feed", path: "/activity", icon: "📡" }, { label: "Project Updates", path: "/project-updates", icon: "📢" },
    { label: "Standups", path: "/standups", icon: "🧍" }, { label: "Announcements", path: "/announcements", icon: "📣" },
    { label: "Automations", path: "/automations", icon: "⚡" }, { label: "Approvals", path: "/approvals", icon: "✔️" },
    { label: "Tags", path: "/tags", icon: "🏷️" }, { label: "Templates", path: "/templates", icon: "📑" },
    { label: "Integrations", path: "/integrations", icon: "🔌" }, { label: "Pulse", path: "/pulse", icon: "📡" },
    { label: "Everything", path: "/everything", icon: "🔮" }, { label: "Inbox", path: "/inbox", icon: "📥" },
    { label: "Super Admin", path: "/admin", icon: "🛡️" },
    { label: "Settings", path: "/settings", icon: "⚙️" }, { label: "Guest Access", path: "/guests", icon: "👤" },
    { label: "Trash & Archive", path: "/trash", icon: "🗑️" },
  ];

  const toggleFavorite = (path: string) => {
    const existing = favorites.find(f => f.path === path);
    let next: typeof favorites;
    if (existing) {
      next = favorites.filter(f => f.path !== path);
    } else {
      const page = ALL_PAGES.find(p => p.path === path);
      if (!page) return;
      next = [...favorites, page];
    }
    setFavorites(next);
    localStorage.setItem("projectos-favorites", JSON.stringify(next));
  };

  const isFavorited = (path: string) => favorites.some(f => f.path === path);

  const overdue = tasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const isActive = location === item.path && !item.query;
    const canFav = !item.query && ALL_PAGES.some(p => p.path === item.path);
    return (
      <div className="relative group/nav">
        <Link href={item.query ? `${item.path}?${item.query}` : item.path} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
          <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : item.alert ? 'text-rose-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
          <span className="font-medium text-sm flex-1">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${item.alert ? 'bg-rose-500/20 text-rose-400' : 'bg-secondary text-muted-foreground'}`}>
              {item.badge}
            </span>
          )}
        </Link>
        {canFav && (
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item.path); }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all ${isFavorited(item.path) ? 'text-amber-400 opacity-100' : 'opacity-20 hover:opacity-100 text-muted-foreground hover:text-amber-400'}`}>
            <Star className={`w-3 h-3 ${isFavorited(item.path) ? 'fill-amber-400' : ''}`} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 flex flex-col h-full bg-card border-r border-border shadow-xl z-10 shrink-0 hidden md:flex">
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 mr-3">
          <Hexagon className="w-5 h-5 text-white fill-white/20" />
        </div>
        <div className="font-display font-bold tracking-tight text-lg">ProjectOS</div>
      </div>

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

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">

        {favorites.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Favorites
            </div>
            <div className="space-y-0.5">
              {favorites.map(fav => (
                <div key={fav.path} className="relative group/fav">
                  <Link href={fav.path} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${location === fav.path ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
                    <span className="text-sm">{fav.icon}</span>
                    <span className="font-medium text-sm flex-1">{fav.label}</span>
                  </Link>
                  <button onClick={() => removeFavorite(fav.path)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/fav:opacity-100 text-muted-foreground hover:text-rose-400 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Workspace</div>
          <div className="space-y-0.5">
            <NavItem item={{ icon: Home, label: "Dashboard", path: "/" }} />
            <NavItem item={{ icon: Sun, label: "My Day", path: "/my-day" }} />
            <NavItem item={{ icon: Layers, label: "Everything", path: "/everything" }} />
            <NavItem item={{ icon: Inbox, label: "Inbox", path: "/inbox" }} />
            <NavItem item={{ icon: CheckSquare, label: "My Tasks", path: "/tasks", badge: tasks.filter(t => (t.assigneeIds as number[])?.includes(1) && t.status !== "done").length }} />
            <NavItem item={{ icon: AlertTriangle, label: "Overdue", path: "/tasks", query: "filter=overdue", badge: overdue.length, alert: true }} />
          </div>
        </div>

        {projects.length > 0 && (() => {
          const folders: Record<string, typeof projects> = {};
          const ungrouped: typeof projects = [];
          projects.forEach(p => {
            const folder = projectFolders[p.id];
            if (folder) {
              if (!folders[folder]) folders[folder] = [];
              folders[folder].push(p);
            } else {
              ungrouped.push(p);
            }
          });
          return (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Spaces & Projects</div>
                <button onClick={() => {
                  const name = prompt("New folder name:");
                  if (name?.trim() && ungrouped.length > 0) {
                    const projectName = prompt(`Which project to add to "${name.trim()}"? Enter project name:\n${ungrouped.map(p => `- ${p.name}`).join("\n")}`);
                    const target = ungrouped.find(p => p.name.toLowerCase().includes((projectName || "").toLowerCase()));
                    if (target) {
                      const updated = { ...projectFolders, [target.id]: name.trim() };
                      setProjectFolders(updated);
                      localStorage.setItem("projectos-project-folders", JSON.stringify(updated));
                    }
                  }
                }} className="text-muted-foreground hover:text-primary" title="Create folder">
                  <FolderOpen className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1">
                {Object.entries(folders).map(([folderName, folderProjects]) => (
                  <FolderGroup key={folderName} name={folderName} projects={folderProjects} tasks={tasks} />
                ))}
                <div className="space-y-0.5">
                  {ungrouped.map(p => {
                    const openCount = tasks.filter(t => t.projectId === p.id && t.status !== "done").length;
                    return (
                      <Link key={p.id} href={`/tasks?projectId=${p.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-medium text-sm truncate flex-1">{p.name}</span>
                        {openCount > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {openCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Tools</div>
          <div className="space-y-0.5">
            <NavItem item={{ icon: FileText, label: "Docs & Wiki", path: "/documents" }} />
            <NavItem item={{ icon: Clock, label: "Time & Billing", path: "/time" }} />
            <NavItem item={{ icon: Repeat, label: "Sprints", path: "/sprints" }} />
            <NavItem item={{ icon: RefreshCw, label: "Cycles", path: "/cycles" }} />
            <NavItem item={{ icon: MessageSquare, label: "Messaging", path: "/messaging" }} />
            <NavItem item={{ icon: Mail, label: "Email Hub", path: "/email" }} />
            <NavItem item={{ icon: Calendar, label: "Calendar", path: "/calendar" }} />
            <NavItem item={{ icon: Flag, label: "Milestones", path: "/milestones" }} />
            <NavItem item={{ icon: FileInput, label: "Forms", path: "/forms" }} />
            <NavItem item={{ icon: Pencil, label: "Whiteboard", path: "/whiteboard" }} />
            <NavItem item={{ icon: Brain, label: "Mind Maps", path: "/mind-maps" }} />
            <NavItem item={{ icon: StickyNote, label: "Notepad", path: "/notepad" }} />
            <NavItem item={{ icon: Bell, label: "Reminders", path: "/reminders" }} />
            <NavItem item={{ icon: Wifi, label: "Pulse", path: "/pulse" }} />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Insights</div>
          <div className="space-y-0.5">
            <NavItem item={{ icon: PieChart, label: "Portfolio", path: "/portfolio" }} />
            <NavItem item={{ icon: Target, label: "Goals & OKRs", path: "/goals" }} />
            <NavItem item={{ icon: Users, label: "Workload", path: "/workload" }} />
            <NavItem item={{ icon: BarChart3, label: "Reports", path: "/reports" }} />
            <NavItem item={{ icon: Activity, label: "Activity Feed", path: "/activity" }} />
            <NavItem item={{ icon: ClipboardList, label: "Project Updates", path: "/project-updates" }} />
            <NavItem item={{ icon: ClipboardList, label: "Standups", path: "/standups" }} />
            <NavItem item={{ icon: Megaphone, label: "Announcements", path: "/announcements" }} />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Workflow</div>
          <div className="space-y-0.5">
            <NavItem item={{ icon: Zap, label: "Automations", path: "/automations" }} />
            <NavItem item={{ icon: ShieldCheck, label: "Approvals", path: "/approvals" }} />
            <NavItem item={{ icon: Tag, label: "Tags", path: "/tags" }} />
            <NavItem item={{ icon: LayoutTemplate, label: "Templates", path: "/templates" }} />
            <NavItem item={{ icon: Puzzle, label: "Integrations", path: "/integrations" }} />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Admin</div>
          <div className="space-y-0.5">
            <NavItem item={{ icon: Shield, label: "Super Admin", path: "/admin" }} />
            <NavItem item={{ icon: Settings, label: "Settings", path: "/settings" }} />
            <NavItem item={{ icon: UserPlus, label: "Guest Access", path: "/guests" }} />
            <NavItem item={{ icon: Search, label: "Search", path: "/search" }} />
            <NavItem item={{ icon: Trash2, label: "Trash & Archive", path: "/trash" }} />
            <NavItem item={{ icon: BookOpen, label: "Platform Guide", path: "/guide" }} />
          </div>
        </div>

      </div>

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
