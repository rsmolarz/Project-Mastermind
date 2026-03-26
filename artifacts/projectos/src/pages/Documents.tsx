import { useState, useEffect, useRef, useMemo } from "react";
import { useDocuments, useCreateDocumentMutation, useUpdateDocumentMutation } from "@/hooks/use-documents";
import { useAiChatMutation } from "@/hooks/use-ai";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Badge, Input, Textarea } from "@/components/ui/shared";
import { FileText, Plus, Edit2, Save, Sparkles, Pin, RefreshCw, Users, Wifi, LayoutTemplate, X, ChevronRight, ChevronDown, CornerDownRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

type PresenceUser = { id: number; name: string; color: string; initials: string; cursorLine?: number; lastActive: number };

type DocHierarchy = { parentId: number | null; children: number[] };

export default function Documents() {
  const { data: docs = [], isLoading } = useDocuments();
  const createDoc = useCreateDocumentMutation();
  const updateDoc = useUpdateDocumentMutation();
  const aiChat = useAiChatMutation();
  const { data: members = [] } = useMembers();

  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [docHierarchy, setDocHierarchy] = useState<Record<number, DocHierarchy>>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-doc-hierarchy") || "{}"); } catch { return {}; }
  });
  const [expandedDocs, setExpandedDocs] = useState<Record<number, boolean>>({});

  const DOC_TEMPLATES = [
    { name: "Blank Document", icon: "📄", content: "# New Document\n\nStart typing here...", tags: ["draft"] },
    { name: "Meeting Notes", icon: "📝", content: "# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:**\n\n## Discussion\n\n- \n\n## Action Items\n\n- [ ] \n\n## Next Steps\n\n", tags: ["meetings"] },
    { name: "Project Brief", icon: "📋", content: "# Project Brief\n\n## Overview\n\n\n## Goals & Objectives\n\n1. \n\n## Scope\n\n### In Scope\n- \n\n### Out of Scope\n- \n\n## Timeline\n\n| Phase | Start | End |\n|-------|-------|-----|\n| | | |\n\n## Team\n\n| Role | Name |\n|------|------|\n| | |\n\n## Success Metrics\n\n- \n", tags: ["project"] },
    { name: "Technical Spec", icon: "⚙️", content: "# Technical Specification\n\n## Summary\n\n\n## Background\n\n\n## Requirements\n\n### Functional\n- \n\n### Non-Functional\n- \n\n## Architecture\n\n\n## API Design\n\n```\nGET /api/...\n```\n\n## Data Model\n\n\n## Testing Plan\n\n- \n\n## Rollout Plan\n\n1. \n", tags: ["engineering"] },
    { name: "Sprint Retro", icon: "🔄", content: "# Sprint Retrospective\n\n**Sprint:** \n**Date:** \n\n## What Went Well 🎉\n\n- \n\n## What Could Improve 🔧\n\n- \n\n## Action Items 📋\n\n- [ ] \n\n## Team Shoutouts ⭐\n\n- \n", tags: ["sprints"] },
    { name: "RFC / Proposal", icon: "💡", content: "# RFC: [Title]\n\n**Author:** \n**Status:** Draft\n**Created:** \n\n## Problem Statement\n\n\n## Proposed Solution\n\n\n## Alternatives Considered\n\n1. \n\n## Implementation Plan\n\n### Phase 1\n- \n\n### Phase 2\n- \n\n## Open Questions\n\n- \n", tags: ["rfc"] },
    { name: "Onboarding Guide", icon: "🚀", content: "# Onboarding Guide\n\n## Welcome!\n\n\n## Getting Started\n\n### Day 1\n- [ ] Set up accounts\n- [ ] Meet the team\n\n### Week 1\n- [ ] Complete training\n- [ ] Shadow a teammate\n\n## Key Resources\n\n- \n\n## FAQs\n\n**Q:** \n**A:** \n", tags: ["onboarding"] },
    { name: "Weekly Status", icon: "📊", content: "# Weekly Status Update\n\n**Week of:** \n**Author:** \n\n## Summary\n\n\n## Completed This Week\n\n- \n\n## In Progress\n\n- \n\n## Blocked\n\n- \n\n## Next Week\n\n- \n\n## Risks & Concerns\n\n- \n", tags: ["status"] },
  ];
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

  const rootDocs = useMemo(() => {
    const childIds = new Set<number>();
    Object.values(docHierarchy).forEach(h => h.children?.forEach(cid => childIds.add(cid)));
    return docs.filter(d => !childIds.has(d.id));
  }, [docs, docHierarchy]);

  const getChildren = (parentId: number) => {
    const h = docHierarchy[parentId];
    if (!h?.children?.length) return [];
    return h.children.map(cid => docs.find(d => d.id === cid)).filter(Boolean);
  };

  const handleCreate = (template?: typeof DOC_TEMPLATES[0], parentId?: number) => {
    const tmpl = template || DOC_TEMPLATES[0];
    createDoc.mutate({
      data: {
        title: tmpl.name === "Blank Document" ? "Untitled Document" : tmpl.name,
        icon: tmpl.icon,
        content: tmpl.content,
        authorId: 1,
        tags: tmpl.tags
      }
    }, {
      onSuccess: (newDoc) => {
        if (parentId) {
          const h = docHierarchy[parentId] || { parentId: null, children: [] };
          const updated = { ...docHierarchy, [parentId]: { ...h, children: [...(h.children || []), newDoc.id] }, [newDoc.id]: { parentId, children: [] } };
          setDocHierarchy(updated);
          localStorage.setItem("projectos-doc-hierarchy", JSON.stringify(updated));
          setExpandedDocs(prev => ({ ...prev, [parentId]: true }));
        }
        setActiveDocId(newDoc.id);
        setEditContent(newDoc.content);
        setIsEditing(true);
        setShowTemplates(false);
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

  const renderDocItem = (doc: any, depth: number = 0) => {
    const children = getChildren(doc.id);
    const isExpanded = expandedDocs[doc.id];
    const hasChildren = children.length > 0;

    return (
      <div key={doc.id}>
        <div
          onClick={() => handleSelectDoc(doc)}
          className={`p-3 rounded-xl cursor-pointer transition-all border ${
            activeDocId === doc.id
              ? 'bg-primary/10 border-primary/20 shadow-inner'
              : 'bg-transparent border-transparent hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <div className="flex items-start gap-2">
            {hasChildren ? (
              <button onClick={e => { e.stopPropagation(); setExpandedDocs(prev => ({ ...prev, [doc.id]: !prev[doc.id] })); }}
                className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : depth > 0 ? (
              <CornerDownRight className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
            ) : <div className="w-3" />}
            <span className="text-lg leading-none shrink-0">{doc.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate text-sm mb-1 ${activeDocId === doc.id ? 'text-primary' : 'text-foreground'}`}>
                {doc.title}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                {format(new Date(doc.updatedAt), "MMM d")}
                {doc.pinned && <Pin className="w-3 h-3 text-primary" />}
                {children.length > 0 && <span className="text-primary">{children.length} sub-page{children.length > 1 ? "s" : ""}</span>}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); handleCreate(undefined, doc.id); }}
              className="opacity-0 group-hover:opacity-100 hover:!opacity-100 text-muted-foreground hover:text-primary transition-opacity p-0.5 rounded"
              title="Add sub-page">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child: any) => renderDocItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const parentDoc = activeDocId ? docs.find(d => docHierarchy[activeDocId]?.parentId === d.id) : null;
  const childDocs = activeDocId ? getChildren(activeDocId) : [];

  return (
    <div className="flex h-full overflow-hidden w-full">
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-background/50">
          <h2 className="font-display font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Wiki
          </h2>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setShowTemplates(true)} title="New from template">
              <LayoutTemplate className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleCreate()} isLoading={createDoc.isPending} title="New blank document">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
        {showTemplates && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowTemplates(false)}>
            <div className="bg-card border border-border rounded-2xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary" /> Document Templates</h3>
                  <p className="text-xs text-muted-foreground mt-1">Choose a template to get started quickly</p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-2 gap-3">
                {DOC_TEMPLATES.map((tmpl, i) => (
                  <button key={i} onClick={() => handleCreate(tmpl)}
                    className="text-left p-4 bg-background border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{tmpl.icon}</span>
                      <span className="font-bold text-sm group-hover:text-primary transition-colors">{tmpl.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {tmpl.content.split("\n").filter(l => l.startsWith("##")).slice(0, 3).map(l => l.replace(/^#+\s*/, "")).join(" · ") || "Start from scratch"}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {tmpl.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{t}</span>)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {isLoading ? (
            <div className="text-center text-muted-foreground p-4 text-sm">Loading...</div>
          ) : rootDocs.map(doc => (
            <div key={doc.id} className="group">
              {renderDocItem(doc)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background relative">
        {activeDoc ? (
          <>
            <div className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0 absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center gap-3">
                {parentDoc && (
                  <button onClick={() => handleSelectDoc(parentDoc)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mr-1">
                    <span>{parentDoc.icon}</span> {parentDoc.title} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
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
                <Button variant="secondary" size="sm" onClick={() => handleCreate(undefined, activeDoc.id)}>
                  <Plus className="w-4 h-4" /> Sub-page
                </Button>
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

                {childDocs.length > 0 && !isEditing && (
                  <div className="mt-12 pt-6 border-t border-border">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CornerDownRight className="w-4 h-4" /> Sub-pages ({childDocs.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {childDocs.map((child: any) => (
                        <button key={child.id} onClick={() => handleSelectDoc(child)}
                          className="text-left p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{child.icon}</span>
                            <span className="font-bold text-sm group-hover:text-primary transition-colors">{child.title}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{child.content?.slice(0, 80)}</p>
                        </button>
                      ))}
                    </div>
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
