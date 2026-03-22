import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { AiDrawer } from "./AiDrawer";
import { NotificationCenter } from "./NotificationCenter";
import { Menu } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card/80 backdrop-blur-xl z-40 flex items-center px-4 justify-between">
        <div className="font-display font-bold text-lg">ProjectOS</div>
        <div className="flex gap-2">
          <button onClick={() => setAiOpen(true)} className="p-2 text-primary bg-primary/10 rounded-lg">
            AI
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-foreground">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      <Sidebar onOpenCmd={() => setCmdOpen(true)} onOpenAi={() => setAiOpen(true)} />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-0 mt-16 md:mt-0 overflow-y-auto">
        <div className="absolute top-4 right-6 z-20 hidden md:flex items-center gap-2">
          <NotificationCenter />
        </div>
        {children}
      </main>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      <AiDrawer isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
