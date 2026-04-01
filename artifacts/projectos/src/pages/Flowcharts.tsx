import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Trash2, Sparkles, Save, ZoomIn, ZoomOut, MousePointer2, Diamond, Circle, Square, ArrowRight, Type, ChevronDown, Pencil } from "lucide-react";

const API = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, "/");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const nodeColors: Record<string, string> = {
  start: "#10b981", process: "#6366f1", decision: "#f59e0b", end: "#f43f5e", io: "#3b82f6", subprocess: "#8b5cf6",
};
const nodeShapes: Record<string, string> = {
  start: "rounded-full", process: "rounded-lg", decision: "rotate-45", end: "rounded-full", io: "skew-x-[-10deg] rounded-lg", subprocess: "rounded-lg border-double border-4",
};

type Node = { id: string; type: string; label: string; x: number; y: number; width: number; height: number; color: string };
type Edge = { id: string; from: string; to: string; label?: string };

export default function Flowcharts() {
  const queryClient = useQueryClient();
  const [activeChart, setActiveChart] = useState<any>(null);
  const [showList, setShowList] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "connect">("select");
  const [zoom, setZoom] = useState(1);
  const [newName, setNewName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: charts = [] } = useQuery({ queryKey: ["flowcharts"], queryFn: () => apiFetch("/flowcharts") });

  const createChart = useMutation({
    mutationFn: (data: any) => apiFetch("/flowcharts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (chart) => {
      queryClient.invalidateQueries({ queryKey: ["flowcharts"] });
      openChart(chart);
      setNewName("");
    },
  });

  const saveChart = useMutation({
    mutationFn: () => apiFetch(`/flowcharts/${activeChart.id}`, { method: "PATCH", body: JSON.stringify({ nodes, edges }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flowcharts"] }),
  });

  const removeChart = useMutation({
    mutationFn: (id: number) => apiFetch(`/flowcharts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flowcharts"] });
      if (activeChart) { setActiveChart(null); setShowList(true); }
    },
  });

  const openChart = (chart: any) => {
    setActiveChart(chart);
    setNodes(chart.nodes || []);
    setEdges(chart.edges || []);
    setShowList(false);
    setSelectedNode(null);
  };

  const addNode = (type: string) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id, type, label: type === "start" ? "Start" : type === "end" ? "End" : type === "decision" ? "Condition?" : "Process",
      x: 300 + Math.random() * 200, y: 100 + nodes.length * 100,
      width: type === "decision" ? 120 : 160, height: type === "decision" ? 60 : 50,
      color: nodeColors[type] || "#6366f1",
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(id);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (tool === "connect") {
      setConnectingFrom(nodeId);
      return;
    }
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX / zoom - node.x, y: e.clientY / zoom - node.y });
    }
    e.stopPropagation();
  }, [nodes, tool, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: (e.clientX - rect.left) / zoom - dragOffset.x, y: (e.clientY - rect.top) / zoom - dragOffset.y } : n));
  }, [draggingNode, dragOffset, zoom]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (connectingFrom) {
      const target = (e.target as HTMLElement).closest("[data-node-id]");
      const targetId = target?.getAttribute("data-node-id");
      if (targetId && targetId !== connectingFrom && !edges.some(ed => ed.from === connectingFrom && ed.to === targetId)) {
        setEdges(prev => [...prev, { id: `edge_${Date.now()}`, from: connectingFrom, to: targetId }]);
      }
      setConnectingFrom(null);
    }
    setDraggingNode(null);
  }, [connectingFrom, edges]);

  const deleteSelected = () => {
    if (!selectedNode) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNode));
    setEdges(prev => prev.filter(e => e.from !== selectedNode && e.to !== selectedNode));
    setSelectedNode(null);
  };

  const aiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await apiFetch("/flowcharts/ai-generate", { method: "POST", body: JSON.stringify({ prompt: aiPrompt }) });
      if (result.nodes) setNodes(result.nodes);
      if (result.edges) setEdges(result.edges);
      if (result.name && activeChart) setActiveChart({ ...activeChart, name: result.name });
      setShowAi(false);
      setAiPrompt("");
    } catch { }
    setAiLoading(false);
  };

  if (showList) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Flowcharts</h1>
              <p className="text-muted-foreground mt-1">Create flowcharts, process diagrams, and decision trees</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAi(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80">
                <Sparkles className="w-4 h-4 text-violet-400" /> AI Generate
              </button>
            </div>
          </div>

          {showAi && (
            <div className="bg-card border border-violet-500/30 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-400" /> Generate with AI</h3>
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe the process... e.g., 'User onboarding flow for a SaaS app'" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" onKeyDown={e => e.key === "Enter" && aiGenerate()} />
              <div className="flex gap-2">
                <button onClick={aiGenerate} disabled={!aiPrompt.trim() || aiLoading} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {aiLoading ? "Generating..." : "Generate Flowchart"}
                </button>
                <button onClick={() => setShowAi(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New flowchart name..." className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            <button onClick={() => newName && createChart.mutate({ name: newName })} disabled={!newName} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>

          {charts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No flowcharts yet</p>
              <p className="text-sm">Create your first flowchart or generate one with AI.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {charts.map((chart: any) => (
                <div key={chart.id} onClick={() => openChart(chart)} className="bg-card border border-border rounded-2xl p-5 hover:border-emerald-500/30 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold group-hover:text-emerald-400 transition-colors">{chart.name}</h3>
                    <button onClick={e => { e.stopPropagation(); removeChart.mutate(chart.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{(chart.nodes as any[])?.length || 0} nodes</span>
                    <span>{(chart.edges as any[])?.length || 0} connections</span>
                    <span className="capitalize">{chart.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(chart.updatedAt || chart.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowList(true); setActiveChart(null); }} className="text-sm text-muted-foreground hover:text-foreground">All Charts</button>
          <ChevronDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
          <span className="font-semibold text-sm">{activeChart?.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 mr-3 bg-secondary rounded-lg p-0.5">
            <button onClick={() => setTool("select")} className={`p-1.5 rounded-md ${tool === "select" ? "bg-background shadow" : ""}`} title="Select">
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTool("connect")} className={`p-1.5 rounded-md ${tool === "connect" ? "bg-background shadow" : ""}`} title="Connect">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => addNode("start")} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400" title="Start"><Circle className="w-3.5 h-3.5" /></button>
          <button onClick={() => addNode("process")} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400" title="Process"><Square className="w-3.5 h-3.5" /></button>
          <button onClick={() => addNode("decision")} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400" title="Decision"><Diamond className="w-3.5 h-3.5" /></button>
          <button onClick={() => addNode("end")} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400" title="End"><Circle className="w-3.5 h-3.5 fill-current" /></button>
          <div className="w-px h-5 bg-border mx-2" />
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-1.5 rounded-lg hover:bg-secondary"><ZoomIn className="w-3.5 h-3.5" /></button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))} className="p-1.5 rounded-lg hover:bg-secondary"><ZoomOut className="w-3.5 h-3.5" /></button>
          <div className="w-px h-5 bg-border mx-2" />
          {selectedNode && <button onClick={deleteSelected} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>}
          <button onClick={() => setShowAi(true)} className="p-1.5 rounded-lg hover:bg-violet-500/10 text-muted-foreground hover:text-violet-400" title="AI Generate"><Sparkles className="w-3.5 h-3.5" /></button>
          <button onClick={() => saveChart.mutate()} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium ml-2"><Save className="w-3 h-3" /> Save</button>
        </div>
      </div>

      {showAi && (
        <div className="px-4 py-3 bg-violet-500/5 border-b border-violet-500/20 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe the process to generate..." className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" onKeyDown={e => e.key === "Enter" && aiGenerate()} autoFocus />
          <button onClick={aiGenerate} disabled={!aiPrompt.trim() || aiLoading} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs disabled:opacity-50">{aiLoading ? "..." : "Generate"}</button>
          <button onClick={() => setShowAi(false)} className="text-xs text-muted-foreground">Cancel</button>
        </div>
      )}

      <div ref={canvasRef} className="flex-1 overflow-hidden relative bg-[#0a0a0f]" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={() => setSelectedNode(null)}
        style={{ backgroundImage: "radial-gradient(circle, #1a1a2e 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px` }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const x1 = fromNode.x + fromNode.width / 2;
            const y1 = fromNode.y + fromNode.height;
            const x2 = toNode.x + toNode.width / 2;
            const y2 = toNode.y;
            return (
              <g key={edge.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4b5563" strokeWidth={2} markerEnd="url(#arrowhead)" />
                {edge.label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} textAnchor="middle" fill="#9ca3af" fontSize={11}>{edge.label}</text>
                )}
              </g>
            );
          })}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
            </marker>
          </defs>
        </svg>

        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {nodes.map(node => (
            <div key={node.id} data-node-id={node.id} onMouseDown={e => handleMouseDown(e, node.id)}
              className={`absolute cursor-move select-none flex items-center justify-center text-white text-xs font-medium shadow-lg transition-shadow ${selectedNode === node.id ? "ring-2 ring-white/50" : ""} ${tool === "connect" ? "cursor-crosshair" : ""}`}
              style={{
                left: node.x, top: node.y, width: node.width, height: node.height,
                backgroundColor: node.color + "cc",
                borderRadius: node.type === "start" || node.type === "end" ? "9999px" : node.type === "decision" ? "4px" : "8px",
                transform: node.type === "decision" ? "rotate(45deg)" : undefined,
                border: `2px solid ${node.color}`,
              }}>
              <span style={{ transform: node.type === "decision" ? "rotate(-45deg)" : undefined }} className="px-2 text-center leading-tight">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-4">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={nodes.find(n => n.id === selectedNode)?.label || ""} onChange={e => setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, label: e.target.value } : n))} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
          <select value={nodes.find(n => n.id === selectedNode)?.type || "process"} onChange={e => {
            const type = e.target.value;
            setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, type, color: nodeColors[type] || n.color } : n));
          }} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm">
            <option value="start">Start</option>
            <option value="process">Process</option>
            <option value="decision">Decision</option>
            <option value="end">End</option>
            <option value="io">I/O</option>
            <option value="subprocess">Sub-process</option>
          </select>
          <input type="color" value={nodes.find(n => n.id === selectedNode)?.color || "#6366f1"} onChange={e => setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, color: e.target.value } : n))} className="w-8 h-8 rounded cursor-pointer" />
        </div>
      )}
    </div>
  );
}
