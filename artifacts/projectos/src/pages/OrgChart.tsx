import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, ChevronDown, ChevronRight, Building2, UserCircle, Search, LayoutGrid, List, TreePine, Mail, Phone } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const roleColors: Record<string, string> = {
  admin: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  lead: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  member: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  viewer: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const departmentColors = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899",
];

type OrgNode = {
  id: number;
  name: string;
  role: string;
  email?: string;
  department?: string;
  avatar?: string;
  children: OrgNode[];
};

function buildHierarchy(members: any[]): OrgNode[] {
  const admins = members.filter(m => m.role === "admin");
  const managers = members.filter(m => m.role === "manager");
  const leads = members.filter(m => m.role === "lead");
  const regularMembers = members.filter(m => !["admin", "manager", "lead"].includes(m.role));

  const departments = new Map<string, any[]>();
  for (const m of [...leads, ...regularMembers]) {
    const dept = m.department || "General";
    if (!departments.has(dept)) departments.set(dept, []);
    departments.get(dept)!.push(m);
  }

  const deptNodes: OrgNode[] = Array.from(departments.entries()).map(([dept, members]) => ({
    id: -Math.abs(dept.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
    name: dept,
    role: "department",
    children: members.map(m => ({
      id: m.id,
      name: m.name || m.email,
      role: m.role,
      email: m.email,
      department: dept,
      avatar: m.avatar,
      children: [],
    })),
  }));

  const managerNodes: OrgNode[] = managers.map((mgr, i) => ({
    id: mgr.id,
    name: mgr.name || mgr.email,
    role: mgr.role,
    email: mgr.email,
    avatar: mgr.avatar,
    children: deptNodes.slice(
      Math.floor(i * deptNodes.length / managers.length),
      Math.floor((i + 1) * deptNodes.length / managers.length) || deptNodes.length
    ),
  }));

  const topNodes = admins.map(admin => ({
    id: admin.id,
    name: admin.name || admin.email,
    role: admin.role,
    email: admin.email,
    avatar: admin.avatar,
    children: managers.length > 0 ? managerNodes : deptNodes,
  }));

  return topNodes.length > 0 ? topNodes : managerNodes.length > 0 ? managerNodes : deptNodes;
}

function TreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isDepartment = node.role === "department";

  return (
    <div>
      <div className={`flex flex-col items-center ${depth > 0 ? "mt-6" : ""}`}>
        {depth > 0 && <div className="w-px h-6 bg-border" />}
        <div onClick={() => hasChildren && setExpanded(!expanded)}
          className={`relative px-5 py-3 rounded-xl border transition-all cursor-pointer hover:shadow-lg ${
            isDepartment ? "bg-card border-border min-w-[140px]" :
            `bg-card ${roleColors[node.role]?.includes("border") ? roleColors[node.role].split(" ").find(c => c.startsWith("border")) : "border-border"}`
          } ${hasChildren ? "hover:border-primary/30" : ""}`}>
          <div className="flex items-center gap-2">
            {isDepartment ? (
              <Building2 className="w-4 h-4 text-muted-foreground" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold">
                {node.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center">
              <div className={`text-sm font-semibold ${isDepartment ? "text-foreground" : ""}`}>{node.name}</div>
              {!isDepartment && (
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] capitalize ${roleColors[node.role] || "bg-secondary text-muted-foreground"}`}>
                  {node.role}
                </span>
              )}
            </div>
            {hasChildren && (
              expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="flex gap-4 justify-center">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const [view, setView] = useState<"tree" | "grid" | "list">("tree");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => apiFetch("/members") });

  const departments = useMemo(() => {
    const depts = new Set(members.map((m: any) => m.department || "General"));
    return Array.from(depts).sort();
  }, [members]);

  const hierarchy = useMemo(() => buildHierarchy(members), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      if (search && !(m.name || "").toLowerCase().includes(search.toLowerCase()) && !(m.email || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRole && m.role !== filterRole) return false;
      if (filterDept && (m.department || "General") !== filterDept) return false;
      return true;
    });
  }, [members, search, filterRole, filterDept]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m: any) => { counts[m.role] = (counts[m.role] || 0) + 1; });
    return counts;
  }, [members]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Org Chart</h1>
            <p className="text-muted-foreground mt-1">Visualize your organization structure and team hierarchy</p>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button onClick={() => setView("tree")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "tree" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <TreePine className="w-3.5 h-3.5 inline mr-1" /> Tree
            </button>
            <button onClick={() => setView("grid")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "grid" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" /> Grid
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5 inline mr-1" /> List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Members", value: members.length, color: "text-blue-400" },
            { label: "Admins", value: roleCounts["admin"] || 0, color: "text-violet-400" },
            { label: "Managers", value: roleCounts["manager"] || 0, color: "text-cyan-400" },
            { label: "Leads", value: roleCounts["lead"] || 0, color: "text-amber-400" },
            { label: "Departments", value: departments.length, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {(view === "grid" || view === "list") && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
              <option value="">All Roles</option>
              {Object.keys(roleCounts).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)} ({roleCounts[r]})</option>)}
            </select>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
              <option value="">All Departments</option>
              {departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {view === "tree" && (
          <div className="bg-card border border-border rounded-2xl p-8 overflow-x-auto">
            {hierarchy.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No members yet</p>
                <p className="text-sm">Add team members to see the org chart.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {hierarchy.map(node => <TreeNode key={node.id} node={node} />)}
              </div>
            )}
          </div>
        )}

        {view === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member: any) => (
              <div key={member.id} className="bg-card border border-border rounded-2xl p-5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-lg font-bold">
                    {(member.name || member.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name || "Unnamed"}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] capitalize border ${roleColors[member.role] || "bg-secondary text-muted-foreground"}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
                {member.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {member.email}
                  </div>
                )}
                {member.department && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Building2 className="w-3 h-3" /> {member.department}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "list" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Department</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member: any) => (
                  <tr key={member.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold">
                          {(member.name || member.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{member.name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] capitalize border ${roleColors[member.role] || "bg-secondary text-muted-foreground"}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{member.department || "General"}</td>
                    <td className="p-4 text-sm text-muted-foreground">{member.email || "-"}</td>
                    <td className="p-4 text-sm text-muted-foreground">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
