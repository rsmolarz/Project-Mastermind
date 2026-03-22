import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useAiChatMutation } from "@/hooks/use-ai";
import { Button, Input } from "./ui/shared";

export function AiDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "system" | "user" | "ai"; text: string }[]>([
    { role: "system", text: "✦ Hi! I'm your ProjectOS AI. Ask me about tasks, projects, time, goals, or anything." }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const aiChat = useAiChatMutation();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiChat.isPending]);

  const suggestions = [
    "What's overdue?",
    "Summarize this week",
    "Which goals are at risk?",
    "Draft a standup update"
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    
    aiChat.mutate(
      { data: { message: text, context: "ProjectOS dashboard context" } },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        },
        onError: () => {
          setMessages(prev => [...prev, { role: "ai", text: "I'm having trouble connecting right now. Try again later." }]);
        }
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-br from-primary/10 to-transparent">
              <div className="p-2 bg-primary/20 text-primary rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">ProjectOS AI</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online & Ready
                </p>
              </div>
              <button onClick={onClose} className="ml-auto p-2 text-muted-foreground hover:bg-white/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : m.role === "system"
                        ? "bg-secondary text-secondary-foreground text-center mx-auto text-xs w-full"
                        : "bg-secondary text-foreground rounded-tl-sm border border-border"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {aiChat.isPending && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              
              {messages.length <= 2 && !aiChat.isPending && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {suggestions.map(s => (
                    <button 
                      key={s} 
                      onClick={() => handleSend(s)}
                      className="px-3 py-1.5 text-xs bg-secondary hover:bg-white/10 border border-border rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
              <div className="relative flex items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                  placeholder="Ask anything..."
                  className="pr-12 bg-secondary/50 border-transparent focus:border-primary/50"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 text-primary hover:text-primary-foreground hover:bg-primary"
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || aiChat.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
