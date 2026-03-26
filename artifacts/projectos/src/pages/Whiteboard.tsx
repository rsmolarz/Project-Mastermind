import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Square, Circle, Type, StickyNote, Pencil, Hand, Trash2, Palette,
  ZoomIn, ZoomOut, Download, MousePointer, Minus, ArrowRight, Undo2, Redo2, Wifi
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type CursorUser = { id: number; name: string; color: string; initials: string; x: number; y: number };

type Tool = "select" | "rect" | "circle" | "text" | "sticky" | "draw" | "line" | "arrow" | "pan";
type WBShape = {
  id: string;
  type: "rect" | "circle" | "text" | "sticky" | "draw" | "line" | "arrow";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color: string;
  fill: string;
  points?: number[][];
  strokeWidth: number;
  selected?: boolean;
};

const COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];
const FILLS = ["transparent", "#6366f120", "#ef444420", "#22c55e20", "#f59e0b20", "#3b82f620"];

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [shapes, setShapes] = useState<WBShape[]>([]);
  const [undoStack, setUndoStack] = useState<WBShape[][]>([]);
  const [redoStack, setRedoStack] = useState<WBShape[][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<WBShape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState("#6366f1");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const drawPointsRef = useRef<number[][]>([]);
  const startRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [cursors, setCursors] = useState<CursorUser[]>([]);

  useEffect(() => {
    const NAMES = [
      { id: 2, name: "Sarah Chen", color: "#ef4444", initials: "SC" },
      { id: 3, name: "Marcus Lee", color: "#22c55e", initials: "ML" },
      { id: 4, name: "Priya Patel", color: "#f59e0b", initials: "PP" },
    ];
    const animate = () => {
      setCursors(NAMES.filter(() => Math.random() > 0.3).map(u => ({
        ...u,
        x: 100 + Math.random() * 800,
        y: 100 + Math.random() * 400,
      })));
    };
    animate();
    const interval = setInterval(animate, 4000);
    return () => clearInterval(interval);
  }, []);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), shapes]);
    setRedoStack([]);
  }, [shapes]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, shapes]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setShapes(prev);
  }, [undoStack, shapes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, shapes]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setShapes(next);
  }, [redoStack, shapes]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
  }, [pan, zoom]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }, [screenToWorld]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const gridSize = 30 * zoom;
    ctx.strokeStyle = "#1e2030";
    ctx.lineWidth = 1;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    for (let x = offsetX; x < rect.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
    }
    for (let y = offsetY; y < rect.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const allShapes = currentShape ? [...shapes, currentShape] : shapes;
    allShapes.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.strokeWidth;
      ctx.fillStyle = s.fill || "transparent";

      if (s.type === "rect") {
        if (s.fill !== "transparent") ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w) / 2, Math.abs(s.h) / 2, 0, 0, Math.PI * 2);
        if (s.fill !== "transparent") ctx.fill();
        ctx.stroke();
      } else if (s.type === "sticky") {
        ctx.fillStyle = s.color + "30";
        ctx.fillRect(s.x, s.y, s.w || 150, s.h || 150);
        ctx.strokeRect(s.x, s.y, s.w || 150, s.h || 150);
        if (s.text) {
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "14px sans-serif";
          const lines = s.text.split("\n");
          lines.forEach((line, i) => ctx.fillText(line, s.x + 10, s.y + 25 + i * 18));
        }
      } else if (s.type === "text") {
        ctx.fillStyle = s.color;
        ctx.font = "18px sans-serif";
        ctx.fillText(s.text || "Text", s.x, s.y + 20);
      } else if (s.type === "draw" && s.points && s.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.points[0][0], s.points[0][1]);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i][0], s.points[i][1]);
        }
        ctx.stroke();
      } else if (s.type === "line" || s.type === "arrow") {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.stroke();
        if (s.type === "arrow") {
          const angle = Math.atan2(s.h, s.w);
          const headLen = 12;
          ctx.beginPath();
          ctx.moveTo(s.x + s.w, s.y + s.h);
          ctx.lineTo(s.x + s.w - headLen * Math.cos(angle - 0.4), s.y + s.h - headLen * Math.sin(angle - 0.4));
          ctx.moveTo(s.x + s.w, s.y + s.h);
          ctx.lineTo(s.x + s.w - headLen * Math.cos(angle + 0.4), s.y + s.h - headLen * Math.sin(angle + 0.4));
          ctx.stroke();
        }
      }

      if (s.id === selectedId) {
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(s.x - 4, s.y - 4, (s.w || 100) + 8, (s.h || 30) + 8);
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }, [shapes, currentShape, selectedId, zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);

    if (tool === "pan") {
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setDrawing(true);
      return;
    }

    if (tool === "select") {
      const clicked = [...shapes].reverse().find(s => {
        const sw = s.w || 100; const sh = s.h || 30;
        return pos.x >= s.x && pos.x <= s.x + sw && pos.y >= s.y && pos.y <= s.y + sh;
      });
      setSelectedId(clicked?.id || null);
      if (clicked) {
        startRef.current = { x: pos.x - clicked.x, y: pos.y - clicked.y };
        setDrawing(true);
      }
      return;
    }

    pushUndo();
    setDrawing(true);
    startRef.current = pos;

    if (tool === "draw") {
      drawPointsRef.current = [[pos.x, pos.y]];
      setCurrentShape({ id: crypto.randomUUID(), type: "draw", x: pos.x, y: pos.y, w: 0, h: 0, color, fill: "transparent", points: [[pos.x, pos.y]], strokeWidth: 2 });
    } else if (tool === "text") {
      const id = crypto.randomUUID();
      const newShape: WBShape = { id, type: "text", x: pos.x, y: pos.y, w: 100, h: 30, text: "Text", color, fill: "transparent", strokeWidth: 2 };
      setShapes(prev => [...prev, newShape]);
      setEditingText(id);
      setDrawing(false);
    } else if (tool === "sticky") {
      const id = crypto.randomUUID();
      const newShape: WBShape = { id, type: "sticky", x: pos.x, y: pos.y, w: 150, h: 150, text: "", color, fill: color + "30", strokeWidth: 2 };
      setShapes(prev => [...prev, newShape]);
      setEditingText(id);
      setDrawing(false);
    } else {
      const shapeType = tool === "circle" ? "circle" : tool === "line" ? "line" : tool === "arrow" ? "arrow" : "rect";
      setCurrentShape({ id: crypto.randomUUID(), type: shapeType, x: pos.x, y: pos.y, w: 0, h: 0, color, fill: "transparent", strokeWidth: 2 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);

    if (tool === "pan") {
      setPan({ x: panStartRef.current.panX + (e.clientX - panStartRef.current.x), y: panStartRef.current.panY + (e.clientY - panStartRef.current.y) });
      return;
    }

    if (tool === "select" && selectedId) {
      setShapes(prev => prev.map(s => s.id === selectedId ? { ...s, x: pos.x - startRef.current.x, y: pos.y - startRef.current.y } : s));
      return;
    }

    if (tool === "draw") {
      drawPointsRef.current.push([pos.x, pos.y]);
      setCurrentShape(prev => prev ? { ...prev, points: [...drawPointsRef.current] } : prev);
      return;
    }

    if (currentShape) {
      setCurrentShape({ ...currentShape, w: pos.x - startRef.current.x, h: pos.y - startRef.current.y });
    }
  };

  const handleMouseUp = () => {
    if (tool === "select" && selectedId) {
      pushUndo();
    }
    if (currentShape && drawing) {
      if (currentShape.type === "draw" && drawPointsRef.current.length > 1) {
        setShapes(prev => [...prev, { ...currentShape, points: [...drawPointsRef.current] }]);
      } else if (currentShape.type !== "draw" && (Math.abs(currentShape.w) > 5 || Math.abs(currentShape.h) > 5)) {
        setShapes(prev => [...prev, currentShape]);
      }
      setCurrentShape(null);
    }
    setDrawing(false);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushUndo();
    setShapes(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingText) return;
        deleteSelected();
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) undo();
      if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) redo();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingText, selectedId, undo, redo]);

  const tools: { key: Tool; icon: any; label: string }[] = [
    { key: "select", icon: MousePointer, label: "Select" },
    { key: "pan", icon: Hand, label: "Pan" },
    { key: "rect", icon: Square, label: "Rectangle" },
    { key: "circle", icon: Circle, label: "Circle" },
    { key: "line", icon: Minus, label: "Line" },
    { key: "arrow", icon: ArrowRight, label: "Arrow" },
    { key: "draw", icon: Pencil, label: "Draw" },
    { key: "text", icon: Type, label: "Text" },
    { key: "sticky", icon: StickyNote, label: "Sticky Note" },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1">
          {tools.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTool(t.key)} title={t.label}
                className={`p-2 rounded-lg transition-all ${tool === t.key ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm">
            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-xl p-2 shadow-xl z-50 flex gap-1 flex-wrap w-[140px]">
              {COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        <button onClick={undo} disabled={undoStack.length === 0} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={redoStack.length === 0} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>

        {selectedId && (
          <button onClick={deleteSelected} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-2" />
          <button onClick={exportPNG} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="Export PNG">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={e => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom(z => Math.max(0.25, Math.min(3, z - e.deltaY * 0.001)));
            } else {
              setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
          }}
        />

        {editingText && (() => {
          const shape = shapes.find(s => s.id === editingText);
          if (!shape) return null;
          const sx = shape.x * zoom + pan.x;
          const sy = shape.y * zoom + pan.y;
          return (
            <textarea
              autoFocus
              defaultValue={shape.text || ""}
              className="absolute bg-transparent border border-primary/50 text-white outline-none resize-none p-2 text-sm"
              style={{ left: sx, top: sy, width: (shape.w || 150) * zoom, height: (shape.h || 150) * zoom, fontSize: 14 * zoom }}
              onBlur={e => {
                setShapes(prev => prev.map(s => s.id === editingText ? { ...s, text: e.target.value } : s));
                setEditingText(null);
              }}
              onKeyDown={e => { if (e.key === "Escape") setEditingText(null); }}
            />
          );
        })()}

        {cursors.map(c => (
          <motion.div key={c.id}
            animate={{ left: c.x, top: c.y }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="absolute pointer-events-none z-30"
            style={{ left: c.x, top: c.y }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M0 0L16 12H6L3 20L0 0Z" fill={c.color} stroke="white" strokeWidth="1" />
            </svg>
            <div className="ml-4 -mt-1 px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: c.color }}>
              {c.name}
            </div>
          </motion.div>
        ))}

        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <span className="text-xs text-muted-foreground/50">{shapes.length} objects | Scroll to pan | Ctrl+Scroll to zoom</span>
          {cursors.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/70">
              <Wifi className="w-3 h-3 animate-pulse" />
              {cursors.length} collaborator{cursors.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
