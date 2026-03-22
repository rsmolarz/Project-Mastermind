import { useState, useMemo } from "react";
import { useTasks, useCreateTaskMutation, useUpdateTaskMutation } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useMembers } from "@/hooks/use-members";
import { Card, Badge, Avatar, Button, Modal, Input, Textarea } from "@/components/ui/shared";
import { Plus, CheckCircle2, Clock, PlayCircle, Eye, AlertOctagon, MoreHorizontal, Sparkles, LayoutGrid, List, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useSearch } from "wouter";

const STATUSES = [
  { id: "backlog", label: "Backlog", icon: Clock, color: "text-slate-400", border: "border-slate-400", dot: "bg-slate-400" },
  { id: "todo", label: "To Do", icon: CheckCircle2, color: "text-blue-400", border: "border-blue-400", dot: "bg-blue-400" },
  { id: "inprogress", label: "In Progress", icon: PlayCircle, color: "text-primary", border: "border-primary", dot: "bg-primary" },
  { id: "review", label: "Review", icon: Eye, color: "text-amber-400", border: "border-amber-400", dot: "bg-amber-400" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-400", dot: "bg-emerald-400" },
  { id: "blocked", label: "Blocked", icon: AlertOctagon, color: "text-rose-400", border: "border-rose-400", dot: "bg-rose-400" },
];

const PRIORITY_MAP: Record<string, { color: string; icon: string }> = {
  critical: { color: "red", icon: "🔴" },
  high: { color: "yellow", icon: "🟡" },
  medium: { color: "blue", icon: "🔵" },
  low: { color: "gray", icon: "⚪" },
};

export default function Tasks() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const filterProjectId = params.get("projectId") ? parseInt(params.get("projectId")!, 10) : null;
  const filterMode = params.get("filter");

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();

  const tasks = useMemo(() => {
    let filtered = allTasks;
    if (filterProjectId) {
      filtered = filtered.filter(t => t.projectId === filterProjectId);
    }
    if (filterMode === "overdue") {
      filtered = filtered.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
    }
    return filtered;
  }, [allTasks, filterProjectId, filterMode]);
  
  const updateTask = useUpdateTaskMutation();
  const createTask = useCreateTaskMutation();

  const [aiInput, setAiInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<any>({});

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("taskId", id.toString());
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("taskId"), 10);
    if (id) {
      updateTask.mutate({ id, data: { status: status as any } });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openTask = (task: any) => {
    setFormData(task);
    setIsNewTask(false);
    setIsModalOpen(true);
  };

  const openNewTask = () => {
    setFormData({ title: "", type: "task", status: "todo", priority: "medium", projectId: projects[0]?.id || 1, points: 1 });
    setIsNewTask(true);
    setIsModalOpen(true);
  };

  const saveTask = () => {
    if (isNewTask) {
      createTask.mutate({ data: formData as any }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      updateTask.mutate({ id: formData.id, data: formData }, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleAiCreate = () => {
    if (!aiInput) return;
    createTask.mutate({
      data: {
        title: aiInput,
        type: "task",
        status: "todo",
        priority: "high",
        projectId: projects[0]?.id || 1,
        points: 3,
        tags: ["ai-generated"]
      }
    }, {
      onSuccess: () => setAiInput("")
    });
  };

  const toggleCollapse = (statusId: string) => {
    setCollapsed(prev => ({ ...prev, [statusId]: !prev[statusId] }));
  };

  const renderKanban = () => (
    <div className="flex gap-6 overflow-x-auto pb-8 h-full items-start px-2">
      {STATUSES.map(status => {
        const columnTasks = tasks.filter(t => t.status === status.id).sort((a,b) => a.sortOrder - b.sortOrder);
        const Icon = status.icon;
        
        return (
          <div 
            key={status.id} 
            className="flex flex-col w-[320px] shrink-0 max-h-full"
            onDrop={(e) => handleDrop(e, status.id)}
            onDragOver={handleDragOver}
          >
            <div className={`flex items-center gap-2 mb-4 px-1 ${status.color}`}>
              <Icon className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-wider text-xs">{status.label}</h3>
              <span className="ml-auto bg-secondary px-2 py-0.5 rounded-full text-xs font-mono text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 min-h-[150px]">
              {columnTasks.map(task => {
                const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== 'done';
                return (
                  <Card 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => openTask(task)}
                    className={`p-4 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isOverdue ? 'border-rose-500/50 shadow-rose-500/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge color={
                        task.priority === 'critical' ? 'red' : 
                        task.priority === 'high' ? 'yellow' : 
                        task.priority === 'medium' ? 'blue' : 'gray'
                      }>
                        {task.priority}
                      </Badge>
                      <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                    
                    <h4 className={`font-medium text-sm leading-snug mb-4 ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-xs font-mono text-muted-foreground">
                        {task.points} pts
                      </div>
                      <div className="flex -space-x-1">
                        {task.assigneeIds?.map((id: number) => {
                          const m = members.find(m => m.id === id);
                          return m ? <Avatar key={id} name={m.name} color={m.color} /> : null;
                        })}
                      </div>
                    </div>
                  </Card>
                )
              })}
              
              <button 
                onClick={openNewTask}
                className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderList = () => (
    <div className="space-y-4 pb-8 px-2">
      {STATUSES.map(status => {
        const group = tasks.filter(t => t.status === status.id);
        const isCollapsed = collapsed[status.id];
        const Icon = status.icon;

        return (
          <div key={status.id}>
            <button
              onClick={() => toggleCollapse(status.id)}
              className={`flex items-center gap-2 w-full px-2 py-2 ${status.color} cursor-pointer border-b border-border`}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="font-bold uppercase tracking-wider text-xs">{status.label}</span>
              <span className="ml-2 bg-secondary px-2 py-0.5 rounded-full text-xs font-mono text-muted-foreground">
                {group.length}
              </span>
            </button>

            {!isCollapsed && group.map(task => {
              const pr = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
              const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== 'done';
              return (
                <div
                  key={task.id}
                  onClick={() => openTask(task)}
                  className="grid gap-3 px-3 py-3 cursor-pointer items-center border-b border-border/20 hover:bg-white/5 transition-colors"
                  style={{ gridTemplateColumns: "1fr 80px 90px 80px 50px" }}
                >
                  <div className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground opacity-50' : ''}`}>
                    {task.title}
                  </div>
                  <div className="flex -space-x-1">
                    {task.assigneeIds?.slice(0, 2).map((id: number) => {
                      const m = members.find(m => m.id === id);
                      return m ? <Avatar key={id} name={m.name} color={m.color} /> : null;
                    })}
                  </div>
                  <Badge color={pr.color}>
                    {pr.icon} {task.priority}
                  </Badge>
                  <div className={`text-xs font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-muted-foreground'}`}>
                    {task.due ? format(new Date(task.due), "MMM d") : "-"}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {task.points}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col pt-6 max-w-[1600px] mx-auto w-full px-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              {filterMode === "overdue" ? "Overdue Tasks" : filterProjectId ? `${projects.find(p => p.id === filterProjectId)?.name || "Project"} Tasks` : "Tasks"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {filterMode === "overdue" ? `${tasks.length} overdue tasks requiring attention.` : filterProjectId ? `Showing tasks for ${projects.find(p => p.id === filterProjectId)?.name || "selected project"}.` : "Manage and track your project tasks."}
            </p>
          </div>
          <div className="flex bg-secondary/50 border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === "kanban" ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === "list" ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <Input 
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiCreate()}
              placeholder="AI: 'fix auth bug critical due friday'" 
              className="pl-10"
            />
          </div>
          <Button onClick={openNewTask}><Plus className="w-4 h-4" /> New</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === "kanban" ? renderKanban() : renderList()}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isNewTask ? "Create Task" : "Edit Task"}
      >
        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
            <Input 
              value={formData.title || ""} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="text-lg font-medium"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
              <select 
                value={formData.status || "todo"} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</label>
              <select 
                value={formData.priority || "medium"} 
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Project</label>
              <select 
                value={formData.projectId || ""} 
                onChange={e => setFormData({...formData, projectId: parseInt(e.target.value, 10)})}
                className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Points</label>
              <select 
                value={formData.points || 1} 
                onChange={e => setFormData({...formData, points: parseInt(e.target.value, 10)})}
                className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {[1,2,3,5,8,13].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
            <Textarea 
              value={formData.notes || ""} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              placeholder="Add context, links, or details here..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveTask} 
              isLoading={createTask.isPending || updateTask.isPending}
            >
              {isNewTask ? "Create Task" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
