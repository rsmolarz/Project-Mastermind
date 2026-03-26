import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain, Plus, Trash2, Palette, ZoomIn, ZoomOut,
  Circle, Maximize2
} from "lucide-react";

type MindNode = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  collapsed: boolean;
};

const COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
const genId = () => Math.random().toString(36).slice(2, 9);

const STORAGE_KEY = "projectos-mindmaps";

type MindMapData = { id: string; name: string; nodes: MindNode[]; updatedAt: string };

function loadMaps(): MindMapData[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveMaps(maps: MindMapData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
}

export default function MindMaps() {
  const [maps, setMaps] = useState<MindMapData[]>(loadMaps);
  const [activeId, setActiveId] = useState<string | null>(maps[0]?.id || null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState("#6366f1");
  const [showColors, setShowColors] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, nx: 0, ny: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const activeMap = maps.find(m => m.id === activeId);
  const nodes = activeMap?.nodes || [];

  const updateNodes = useCallback((newNodes: MindNode[]) => {
    setMaps(prev => {
      const updated = prev.map(m => m.id === activeId ? { ...m, nodes: newNodes, updatedAt: new Date().toISOString() } : m);
      saveMaps(updated);
      return updated;
    });
  }, [activeId]);

  const createMap = () => {
    const rootId = genId();
    const newMap: MindMapData = {
      id: genId(),
      name: "Untitled Mind Map",
      nodes: [{ id: rootId, text: "Central Idea", x: 400, y: 300, color: "#6366f1", parentId: null, collapsed: false }],
      updatedAt: new Date().toISOString(),
    };
    const updated = [...maps, newMap];
    saveMaps(updated);
    setMaps(updated);
    setActiveId(newMap.id);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const deleteMap = (id: string) => {
    const updated = maps.filter(m => m.id !== id);
    saveMaps(updated);
    setMaps(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
  };

  const addChild = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const siblings = nodes.filter(n => n.parentId === parentId);
    const angle = siblings.length * 45 + (parent.parentId ? 30 : 0);
    const dist = 160;
    const rad = (angle * Math.PI) / 180;
    const newNode: MindNode = {
      id: genId(),
      text: "New idea",
      x: parent.x + Math.cos(rad) * dist,
      y: parent.y + Math.sin(rad) * dist,
      color,
      parentId,
      collapsed: false,
    };
    updateNodes([...nodes, newNode]);
    setEditing(newNode.id);
  };

  const deleteNode = (id: string) => {
    const toDelete = new Set<string>();
    const collect = (nid: string) => {
      toDelete.add(nid);
      nodes.filter(n => n.parentId === nid).forEach(c => collect(c.id));
    };
    collect(id);
    updateNodes(nodes.filter(n => !toDelete.has(n.id)));
    if (selectedId === id) setSelectedId(null);
  };

  const updateText = (id: string, text: string) => {
    updateNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const updateColor = (id: string, c: string) => {
    updateNodes(nodes.map(n => n.id === id ? { ...n, color: c } : n));
  };

  const toggleCollapse = (id: string) => {
    updateNodes(nodes.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n));
  };

  const getVisibleNodes = useCallback(() => {
    const hidden = new Set<string>();
    const hideChildren = (pid: string) => {
      nodes.filter(n => n.parentId === pid).forEach(c => {
        hidden.add(c.id);
        hideChildren(c.id);
      });
    };
    nodes.filter(n => n.collapsed).forEach(n => hideChildren(n.id));
    return nodes.filter(n => !hidden.has(n.id));
  }, [nodes]);

  const visibleNodes = getVisibleNodes();

  const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
    if (nodeId) {
      setDragging(nodeId);
      setSelectedId(nodeId);
      const node = nodes.find(n => n.id === nodeId)!;
      dragStart.current = { x: e.clientX, y: e.clientY, nx: node.x, ny: node.y };
      e.stopPropagation();
    } else {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      updateNodes(nodes.map(n => n.id === dragging ? { ...n, x: dragStart.current.nx + dx, y: dragStart.current.ny + dy } : n));
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      });
    }
  }, [dragging, zoom, nodes, updateNodes]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    isPanning.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const centerView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const getDepth = (nodeId: string): number => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node?.parentId) return 0;
    return 1 + getDepth(node.parentId);
  };

  if (!activeMap) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full animate-in fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" /> Mind Maps
            </h1>
            <p className="text-muted-foreground mt-1">Visualize ideas and brainstorm with connected nodes.</p>
          </div>
          <button onClick={createMap} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Mind Map
          </button>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No mind maps yet</p>
          <p className="text-sm mt-1">Create your first mind map to start brainstorming.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border shrink-0">
        <Brain className="w-5 h-5 text-primary" />
        <select
          value={activeId || ""}
          onChange={e => { setActiveId(e.target.value); setPan({ x: 0, y: 0 }); setZoom(1); }}
          className="bg-background text-sm rounded-lg px-2 py-1.5 border border-border text-foreground font-bold"
        >
          {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button onClick={createMap} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="New Map">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => deleteMap(activeId!)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10" title="Delete Map">
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {selectedId && (
          <>
            <button onClick={() => addChild(selectedId)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10" title="Add Child">
              <Plus className="w-4 h-4" />
            </button>
            {nodes.find(n => n.id === selectedId)?.parentId && (
              <button onClick={() => deleteNode(selectedId)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10" title="Delete Node">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => toggleCollapse(selectedId)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="Collapse/Expand">
              <Circle className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setShowColors(!showColors)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="Color">
                <Palette className="w-4 h-4" />
              </button>
              {showColors && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-card border border-border rounded-xl shadow-xl z-50 flex gap-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => { updateColor(selectedId, c); setColor(c); setShowColors(false); }}
                      className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white transition-colors"
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.15))} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.15))} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={centerView} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="Reset View">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-[#0a0a14] cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleMouseDown(e)}
        onWheel={e => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(z => Math.max(0.25, Math.min(3, z - e.deltaY * 0.001)));
          } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {visibleNodes.filter(n => n.parentId).map(node => {
            const parent = nodes.find(p => p.id === node.parentId);
            if (!parent) return null;
            const x1 = parent.x * zoom + pan.x;
            const y1 = parent.y * zoom + pan.y;
            const x2 = node.x * zoom + pan.x;
            const y2 = node.y * zoom + pan.y;
            const mx = (x1 + x2) / 2;
            return (
              <path key={`line-${node.id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke={node.color}
                strokeWidth={2}
                fill="none"
                opacity={0.4}
              />
            );
          })}
        </svg>

        {visibleNodes.map(node => {
          const depth = getDepth(node.id);
          const isRoot = !node.parentId;
          const isSelected = selectedId === node.id;
          const childCount = nodes.filter(n => n.parentId === node.id).length;
          const sx = node.x * zoom + pan.x;
          const sy = node.y * zoom + pan.y;

          return (
            <motion.div
              key={node.id}
              className={`absolute select-none cursor-pointer ${isSelected ? "ring-2 ring-white/50" : ""}`}
              style={{
                left: sx,
                top: sy,
                transform: "translate(-50%, -50%)",
                zIndex: isSelected ? 20 : depth === 0 ? 10 : 5,
              }}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onDoubleClick={() => setEditing(node.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div
                className={`rounded-2xl border-2 shadow-lg transition-all ${isRoot ? "px-6 py-4 text-base font-bold" : depth === 1 ? "px-4 py-2.5 text-sm font-semibold" : "px-3 py-2 text-xs font-medium"}`}
                style={{
                  backgroundColor: `${node.color}15`,
                  borderColor: `${node.color}60`,
                  color: node.color,
                  minWidth: isRoot ? 140 : 80,
                  textAlign: "center",
                  fontSize: `${Math.max(10, 14 - depth * 1.5) * zoom}px`,
                }}
              >
                {editing === node.id ? (
                  <input
                    autoFocus
                    defaultValue={node.text}
                    className="bg-transparent outline-none text-center w-full"
                    style={{ color: node.color }}
                    onBlur={e => { updateText(node.id, e.target.value); setEditing(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { updateText(node.id, (e.target as HTMLInputElement).value); setEditing(null); } }}
                  />
                ) : (
                  node.text
                )}
                {node.collapsed && childCount > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">+{childCount}</span>
                )}
              </div>
            </motion.div>
          );
        })}

        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50">
          {nodes.length} nodes · Double-click to edit · Scroll to pan
        </div>
      </div>
    </div>
  );
}
