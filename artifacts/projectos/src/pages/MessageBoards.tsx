import { useState } from "react";
import { useMembers } from "@/hooks/use-members";
import { useProjects } from "@/hooks/use-projects";
import { Card, Avatar, Badge, Input, Button, Textarea } from "@/components/ui/shared";
import { MessageSquareText, Plus, Pin, Heart, MessageCircle, X, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type BoardPost = {
  id: number;
  title: string;
  content: string;
  authorId: number;
  projectId: number | null;
  pinned: boolean;
  category: string;
  replies: { authorId: number; content: string; timestamp: string; likes: number }[];
  likes: number;
  createdAt: string;
};

const CATEGORIES = ["General", "Announcement", "Question", "Idea", "FYI", "Discussion"];

export default function MessageBoardsPage() {
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const [posts, setPosts] = useState<BoardPost[]>(() => {
    try { return JSON.parse(localStorage.getItem("projectos-message-boards") || "[]"); } catch { return []; }
  });
  const [activePost, setActivePost] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newProjectId, setNewProjectId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const save = (updated: BoardPost[]) => {
    setPosts(updated);
    localStorage.setItem("projectos-message-boards", JSON.stringify(updated));
  };

  const createPost = () => {
    if (!newTitle.trim()) return;
    const post: BoardPost = {
      id: Date.now(), title: newTitle.trim(), content: newContent.trim(),
      authorId: 1, projectId: newProjectId, pinned: false,
      category: newCategory, replies: [], likes: 0, createdAt: new Date().toISOString()
    };
    save([post, ...posts]);
    setNewTitle(""); setNewContent(""); setShowCreate(false);
  };

  const addReply = (postId: number) => {
    if (!replyText.trim()) return;
    const updated = posts.map(p => {
      if (p.id !== postId) return p;
      return { ...p, replies: [...p.replies, { authorId: 1, content: replyText.trim(), timestamp: new Date().toISOString(), likes: 0 }] };
    });
    save(updated);
    setReplyText("");
  };

  const togglePin = (id: number) => save(posts.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  const likePost = (id: number) => save(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  const deletePost = (id: number) => { save(posts.filter(p => p.id !== id)); if (activePost === id) setActivePost(null); };

  const active = posts.find(p => p.id === activePost);
  const filtered = filterCategory ? posts.filter(p => p.category === filterCategory) : posts;
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const catColors: Record<string, string> = {
    General: "bg-slate-500/15 text-slate-400", Announcement: "bg-rose-500/15 text-rose-400", Question: "bg-blue-500/15 text-blue-400",
    Idea: "bg-amber-500/15 text-amber-400", FYI: "bg-violet-500/15 text-violet-400", Discussion: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <MessageSquareText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Message Board</h1>
            <p className="text-sm text-muted-foreground">Threaded project discussions</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Post</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!filterCategory ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterCategory === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>

      {showCreate && (
        <Card className="p-5 border-primary/20">
          <h3 className="font-bold mb-3">New Discussion Post</h3>
          <div className="space-y-3">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Post title..." />
            <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Write your message..." />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setNewCategory(c)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${newCategory === c ? catColors[c] : "text-muted-foreground bg-secondary/50"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Project</label>
                <select value={newProjectId || ""} onChange={e => setNewProjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs outline-none">
                  <option value="">None</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createPost} disabled={!newTitle.trim()}>Post</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquareText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No discussions yet</p>
            </div>
          ) : sorted.map(post => {
            const author = members.find((m: any) => m.id === post.authorId);
            const project = projects.find((p: any) => p.id === post.projectId);
            return (
              <Card key={post.id} onClick={() => setActivePost(post.id)}
                className={`p-3 cursor-pointer transition-all ${activePost === post.id ? "border-primary/30 bg-primary/5" : "hover:border-border/60"}`}>
                <div className="flex items-start gap-2">
                  {post.pinned && <Pin className="w-3 h-3 text-primary shrink-0 mt-1" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${catColors[post.category]}`}>{post.category}</span>
                      <span className="text-[10px] text-muted-foreground">{author?.name || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.replies.length}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
                      {project && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="col-span-3">
          {active ? (
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{active.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catColors[active.category]}`}>{active.category}</span>
                    <span className="text-xs text-muted-foreground">{members.find((m: any) => m.id === active.authorId)?.name}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(active.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePin(active.id)} className={`p-1.5 rounded-lg transition-colors ${active.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}><Pin className="w-3.5 h-3.5" /></button>
                  <button onClick={() => likePost(active.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors"><Heart className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deletePost(active.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none mb-6 whitespace-pre-wrap text-foreground/80">{active.content}</div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-bold text-muted-foreground">{active.replies.length} Replies</h4>
                {active.replies.map((r, i) => {
                  const author = members.find((m: any) => m.id === r.authorId);
                  return (
                    <div key={i} className="flex gap-3 bg-secondary/20 rounded-xl p-3">
                      <Avatar name={author?.name || "You"} color={author?.color || "#6366f1"} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{author?.name || "You"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <Input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply(active.id)} placeholder="Write a reply..." className="flex-1" />
                  <Button onClick={() => addReply(active.id)} disabled={!replyText.trim()}>Reply</Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquareText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Select a discussion to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
