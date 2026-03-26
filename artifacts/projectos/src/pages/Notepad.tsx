import { useState, useEffect, useRef } from "react";
import { 
  StickyNote, Plus, Trash2, Search, Pin, Clock, Edit3, ChevronDown, Bold, Italic, 
  List, CheckSquare, Hash, Minus
} from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const COLORS = [
  { id: "default", bg: "bg-card", border: "border-border", label: "Default" },
  { id: "yellow", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Yellow" },
  { id: "green", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Green" },
  { id: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Blue" },
  { id: "purple", bg: "bg-violet-500/10", border: "border-violet-500/30", label: "Purple" },
  { id: "pink", bg: "bg-pink-500/10", border: "border-pink-500/30", label: "Pink" },
];

const STORAGE_KEY = "projectos-notepad";
const genId = () => Math.random().toString(36).slice(2, 9);

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function getColorClasses(colorId: string) {
  return COLORS.find(c => c.id === colorId) || COLORS[0];
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Notepad() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id || null);
  const [search, setSearch] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeNote = notes.find(n => n.id === activeId);

  const updateNote = (id: string, updates: Partial<Note>) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNotes(updated), 300);
  };

  const createNote = () => {
    const note: Note = {
      id: genId(),
      title: "Untitled Note",
      content: "",
      color: "default",
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setActiveId(note.id);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
  };

  const togglePin = (id: string) => {
    updateNote(id, { pinned: !notes.find(n => n.id === id)?.pinned });
  };

  const insertFormatting = (prefix: string, suffix?: string) => {
    if (!textareaRef.current || !activeNote) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = activeNote.content;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + (suffix || prefix) + text.substring(end);
    updateNote(activeNote.id, { content: newText });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filtered = search
    ? sorted.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const wordCount = activeNote ? activeNote.content.split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeNote ? activeNote.content.length : 0;

  return (
    <div className="flex h-full animate-in fade-in">
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-primary" /> Notepad
            </h2>
            <button onClick={createNote} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="New Note">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary/50" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? "No matching notes" : "No notes yet"}
            </div>
          )}
          {filtered.map(note => {
            const cc = getColorClasses(note.color);
            return (
              <button key={note.id} onClick={() => setActiveId(note.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${activeId === note.id ? `${cc.bg} ${cc.border} ring-1 ring-primary/20` : `bg-transparent border-transparent hover:bg-white/5`}`}>
                <div className="flex items-center gap-2 mb-1">
                  {note.pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                  <span className="text-sm font-bold truncate flex-1">{note.title}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{note.content || "Empty note"}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/60">
                  <Clock className="w-2.5 h-2.5" /> {timeAgo(note.updatedAt)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-border shrink-0">
          <span className="text-[10px] text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeNote ? (
          <>
            <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
              <input
                value={activeNote.title}
                onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Note title..."
              />
              <button onClick={() => togglePin(activeNote.id)}
                className={`p-2 rounded-lg transition-colors ${activeNote.pinned ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="Pin">
                <Pin className="w-4 h-4" />
              </button>
              <div className="relative">
                <button onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5" title="Color">
                  <div className="w-4 h-4 rounded-full border-2 border-current" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full right-0 mt-2 p-2 bg-card border border-border rounded-xl shadow-xl z-50 flex gap-1.5">
                    {COLORS.map(c => (
                      <button key={c.id} onClick={() => { updateNote(activeNote.id, { color: c.id }); setShowColorPicker(false); }}
                        className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} ${activeNote.color === c.id ? "ring-2 ring-primary" : ""} hover:scale-110 transition-transform`}
                        title={c.label} />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => deleteNote(activeNote.id)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 shrink-0">
              <button onClick={() => insertFormatting("**")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="Bold">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormatting("_")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="Italic">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormatting("- ", "")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="List">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormatting("- [ ] ", "")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="Checklist">
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormatting("# ", "")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="Heading">
                <Hash className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormatting("---\n", "")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5" title="Divider">
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`flex-1 ${getColorClasses(activeNote.color).bg}`}>
              <textarea
                ref={textareaRef}
                value={activeNote.content}
                onChange={e => updateNote(activeNote.id, { content: e.target.value })}
                className="w-full h-full bg-transparent text-foreground text-sm leading-relaxed p-6 outline-none resize-none font-mono"
                placeholder="Start writing..."
              />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground shrink-0">
              <span>{wordCount} words · {charCount} characters</span>
              <span>Last edited {timeAgo(activeNote.updatedAt)}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Select or create a note</p>
              <button onClick={createNote} className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">
                <Plus className="w-4 h-4 inline mr-1" /> New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
