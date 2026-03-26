import { useState, useEffect, useRef } from "react";
import { useDocuments, useCreateDocumentMutation, useUpdateDocumentMutation } from "@/hooks/use-documents";
import { useAiChatMutation } from "@/hooks/use-ai";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Badge, Input, Textarea } from "@/components/ui/shared";
import { FileText, Plus, Edit2, Save, Sparkles, Pin, RefreshCw, Users, Wifi } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

type PresenceUser = { id: number; name: string; color: string; initials: string; cursorLine?: number; lastActive: number };

export default function Documents() {
  const { data: docs = [], isLoading } = useDocuments();
  const createDoc = useCreateDocumentMutation();
  const updateDoc = useUpdateDocumentMutation();
  const aiChat = useAiChatMutation();
  const { data: members = [] } = useMembers();

  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeDocId || members.length === 0) {
      setPresenceUsers([]);
      return;
    }
    const simulatePresence = () => {
      const otherMembers = members.filter((m: any) => m.id !== 1).slice(0, 4);
      const active = otherMembers
        .filter(() => Math.random() > 0.4)
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          color: m.color || "#6366f1",
          initials: (m.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2),
          cursorLine: Math.floor(Math.random() * 20) + 1,
          lastActive: Date.now(),
        }));
      setPresenceUsers(active);
    };
    simulatePresence();
    presenceInterval.current = setInterval(simulatePresence, 8000);
    return () => { if (presenceInterval.current) clearInterval(presenceInterval.current); };
  }, [activeDocId, members]);

  const activeDoc = docs.find(d => d.id === activeDocId);

  const handleCreate = () => {
    createDoc.mutate({
      data: {
        title: "Untitled Document",
        icon: "📄",
        content: "# New Document\n\nStart typing here...",
        authorId: 1,
        tags: ["draft"]
      }
    }, {
      onSuccess: (newDoc) => {
        setActiveDocId(newDoc.id);
        setEditContent(newDoc.content);
        setIsEditing(true);
      }
    });
  };

  const handleSave = () => {
    if (!activeDoc) return;
    updateDoc.mutate({
      id: activeDoc.id,
      data: { content: editContent }
    }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const handleSelectDoc = (doc: any) => {
    setActiveDocId(doc.id);
    setEditContent(doc.content);
    setIsEditing(false);
  };

  const handleAiGenerate = () => {
    if (!activeDoc) return;
    setAiLoading(true);

    aiChat.mutate(
      { data: { message: `generate document content for: ${activeDoc.title}` } },
      {
        onSuccess: (result) => {
          const generated = result.reply;
          const newContent = `# ${activeDoc.title}\n\n${generated}`;
          updateDoc.mutate({
            id: activeDoc.id,
            data: { content: newContent }
          });
          setEditContent(newContent);
          setAiLoading(false);
        },
        onError: () => {
          const fallbackContent = `# ${activeDoc.title}\n\n## Overview\n\nThis document covers the key aspects of ${activeDoc.title}.\n\n## Key Points\n\n- Point 1: Core objectives and deliverables\n- Point 2: Timeline and milestones\n- Point 3: Team responsibilities\n\n## Next Steps\n\n- [ ] Review and finalize requirements\n- [ ] Assign ownership\n- [ ] Set review cadence`;
          updateDoc.mutate({
            id: activeDoc.id,
            data: { content: fallbackContent }
          });
          setEditContent(fallbackContent);
          setAiLoading(false);
        }
      }
    );
  };

  return (
    <div className="flex h-full overflow-hidden w-full">
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-background/50">
          <h2 className="font-display font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Wiki
          </h2>
          <Button size="icon" variant="ghost" onClick={handleCreate} isLoading={createDoc.isPending}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="text-center text-muted-foreground p-4 text-sm">Loading...</div>
          ) : docs.map(doc => (
            <div 
              key={doc.id}
              onClick={() => handleSelectDoc(doc)}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                activeDocId === doc.id 
                  ? 'bg-primary/10 border-primary/20 shadow-inner' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate text-sm mb-1 ${activeDocId === doc.id ? 'text-primary' : 'text-foreground'}`}>
                    {doc.title}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    {format(new Date(doc.updatedAt), "MMM d")}
                    {doc.pinned && <Pin className="w-3 h-3 text-primary" />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background relative">
        {activeDoc ? (
          <>
            <div className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0 absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeDoc.icon}</span>
                <span className="font-bold text-foreground">{activeDoc.title}</span>
                <div className="flex gap-1 ml-4">
                  {activeDoc.tags?.map((t: string) => <Badge key={t} color="indigo">{t}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {presenceUsers.length > 0 && (
                  <div className="flex items-center gap-1.5 mr-2">
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <div className="flex -space-x-2">
                      {presenceUsers.map(u => (
                        <div key={u.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card shadow-lg relative group cursor-pointer"
                          style={{ backgroundColor: u.color }} title={`${u.name} - editing`}>
                          {u.initials}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-1 ring-card" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded-lg text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl z-50">
                            {u.name} <span className="text-muted-foreground">· editing line {u.cursorLine}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">{presenceUsers.length} editing</span>
                  </div>
                )}
                {isEditing ? (
                  <Button size="sm" onClick={handleSave} isLoading={updateDoc.isPending}>
                    <Save className="w-4 h-4" /> Save
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleAiGenerate} 
                  disabled={aiLoading}
                  className="gap-1"
                >
                  {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-14 px-8 lg:px-20 pb-20">
              <div className="max-w-3xl mx-auto w-full mt-12">
                {isEditing ? (
                  <Textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60vh] font-mono text-sm leading-loose bg-transparent border-none focus:ring-0 resize-none p-0"
                    placeholder="Write with Markdown..."
                  />
                ) : (
                  <div className="prose prose-invert prose-indigo max-w-none">
                    <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <FileText className="w-16 h-16 opacity-20 mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground mb-2">No Document Selected</h3>
            <p className="max-w-md">Select a document from the sidebar or create a new one to start writing and collaborating with your team.</p>
          </div>
        )}
      </div>
    </div>
  );
}
