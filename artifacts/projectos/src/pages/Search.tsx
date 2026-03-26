import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Badge, Button, Input } from "@/components/ui/shared";
import { Search as SearchIcon, FileText, CheckSquare, Folder, Users, Filter, X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
const apiFetch = (path: string) =>
  fetch(`${API}${path}`, { credentials: "include" }).then(r => r.json());

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "tasks" | "projects" | "documents" | "members">("all");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => apiFetch(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });

  const filters = [
    { id: "all" as const, label: "All", count: results?.totalResults || 0 },
    { id: "tasks" as const, label: "Tasks", count: results?.tasks?.length || 0, icon: CheckSquare },
    { id: "projects" as const, label: "Projects", count: results?.projects?.length || 0, icon: Folder },
    { id: "documents" as const, label: "Documents", count: results?.documents?.length || 0, icon: FileText },
    { id: "members" as const, label: "Members", count: results?.members?.length || 0, icon: Users },
  ];

  const statusColors: Record<string, string> = {
    todo: "bg-blue-500/20 text-blue-400",
    inprogress: "bg-primary/20 text-primary",
    done: "bg-emerald-500/20 text-emerald-400",
    review: "bg-amber-500/20 text-amber-400",
    blocked: "bg-rose-500/20 text-rose-400",
    backlog: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">Find tasks, projects, documents, and team members</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search across everything..."
          className="w-full pl-12 pr-10 py-4 bg-card border border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {query.length >= 2 && (
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === f.id ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label} {f.count > 0 && <span className="ml-1 opacity-75">({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {isLoading && query.length >= 2 && (
        <div className="text-center py-12 text-muted-foreground">Searching...</div>
      )}

      {results && query.length >= 2 && (
        <div className="space-y-6">
          {(activeFilter === "all" || activeFilter === "tasks") && results.tasks?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Tasks ({results.tasks.length})
              </h2>
              <div className="space-y-2">
                {results.tasks.map((task: any) => (
                  <Card key={task.id} className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setLocation("/tasks")}>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status] || "bg-secondary text-muted-foreground"}`}>
                        {task.status}
                      </span>
                      <span className="font-medium flex-1">{task.title}</span>
                      <span className="text-xs text-muted-foreground">{task.priority}</span>
                      {task.due && <span className="text-xs text-muted-foreground">{format(new Date(task.due), "MMM d")}</span>}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {task.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.notes}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(activeFilter === "all" || activeFilter === "projects") && results.projects?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Folder className="w-4 h-4" /> Projects ({results.projects.length})
              </h2>
              <div className="space-y-2">
                {results.projects.map((p: any) => (
                  <Card key={p.id} className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setLocation(`/tasks?projectId=${p.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium flex-1">{p.icon} {p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.phase}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.description}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(activeFilter === "all" || activeFilter === "documents") && results.documents?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents ({results.documents.length})
              </h2>
              <div className="space-y-2">
                {results.documents.map((doc: any) => (
                  <Card key={doc.id} className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setLocation("/documents")}>
                    <div className="flex items-center gap-3">
                      <span>{doc.icon}</span>
                      <span className="font-medium flex-1">{doc.title}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(doc.updatedAt), "MMM d")}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(activeFilter === "all" || activeFilter === "members") && results.members?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Members ({results.members.length})
              </h2>
              <div className="space-y-2">
                {results.members.map((m: any) => (
                  <Card key={m.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: m.color }}>
                        {m.initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.role}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.totalResults === 0 && (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}

      {query.length < 2 && (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Start typing to search across your workspace</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Search tasks, projects, documents, and team members</p>
        </div>
      )}
    </div>
  );
}
