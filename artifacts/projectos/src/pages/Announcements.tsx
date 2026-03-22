import { useState } from "react";
import { useAnnouncements, useCreateAnnouncementMutation, useReactToAnnouncementMutation, useCommentOnAnnouncementMutation } from "@/hooks/use-announcements";
import { useMembers } from "@/hooks/use-members";
import { Card, Button, Avatar, Badge, Modal, Input, Textarea } from "@/components/ui/shared";
import { Megaphone, Pin, MessageSquare, Plus, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Announcements() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { data: members = [] } = useMembers();
  
  const createAnn = useCreateAnnouncementMutation();
  const reactAnn = useReactToAnnouncementMutation();
  const commentAnn = useCommentOnAnnouncementMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const handlePost = () => {
    if (!newTitle || !newContent) return;
    createAnn.mutate({
      data: {
        title: newTitle,
        content: newContent,
        authorId: 1, // Current user
        pinned: false,
      }
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewTitle("");
        setNewContent("");
      }
    });
  };

  const handleComment = (id: number) => {
    const text = commentInputs[id];
    if (!text?.trim()) return;
    commentAnn.mutate({ id, data: { text, authorId: 1 } }, {
      onSuccess: () => setCommentInputs({ ...commentInputs, [id]: "" })
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" /> Announcements
          </h1>
          <p className="text-muted-foreground mt-1">Company-wide updates and important news.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Post Update</Button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading announcements...</div>
        ) : announcements.map(ann => {
          const author = members.find(m => m.id === ann.authorId);
          return (
            <Card key={ann.id} className={`p-6 ${ann.pinned ? 'border-t-4 border-t-primary' : ''}`}>
              {ann.pinned && (
                <div className="flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-wider mb-4">
                  <Pin className="w-3.5 h-3.5" /> Pinned
                </div>
              )}
              
              <div className="flex items-start gap-4 mb-4">
                <Avatar name={author?.name || "Admin"} color={author?.color} />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground leading-tight mb-1">{ann.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <span className="text-foreground">{author?.name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert text-sm max-w-none mb-6">
                <p>{ann.content}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(ann.reactions || {}).map(([emoji, count]) => (
                  <button 
                    key={emoji}
                    onClick={() => reactAnn.mutate({ id: ann.id, data: { emoji } })}
                    className="flex items-center gap-1.5 bg-secondary hover:bg-white/10 px-3 py-1.5 rounded-full text-sm transition-colors border border-border"
                  >
                    <span>{emoji}</span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">{count as number}</span>
                  </button>
                ))}
                <button 
                  onClick={() => reactAnn.mutate({ id: ann.id, data: { emoji: "👍" } })}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-white/10 border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> {ann.comments?.length || 0} Comments
                </h4>
                
                {ann.comments?.map((c, i) => {
                  const cAuthor = members.find(m => m.id === c.authorId);
                  return (
                    <div key={i} className="flex gap-3 text-sm">
                      <Avatar name={cAuthor?.name || "User"} color={cAuthor?.color} />
                      <div>
                        <div className="font-bold text-foreground mb-0.5">{cAuthor?.name} <span className="font-normal text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.timestamp))} ago</span></div>
                        <div className="text-muted-foreground">{c.text}</div>
                      </div>
                    </div>
                  )
                })}

                <div className="flex gap-3 pt-2">
                  <Input 
                    value={commentInputs[ann.id] || ""}
                    onChange={e => setCommentInputs({...commentInputs, [ann.id]: e.target.value})}
                    onKeyDown={e => e.key === "Enter" && handleComment(ann.id)}
                    placeholder="Write a comment..." 
                    className="bg-background text-sm"
                  />
                  <Button variant="secondary" onClick={() => handleComment(ann.id)}>Post</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Announcement">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Headline</label>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Exciting news..." className="text-lg" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Message</label>
            <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Share the details..." className="min-h-[150px]" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePost} isLoading={createAnn.isPending}>Post Announcement</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
