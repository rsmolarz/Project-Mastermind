import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Home, CheckSquare, Clock, Target, FileText, PieChart, Megaphone } from "lucide-react";
import { Input } from "./ui/shared";

const pages = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: CheckSquare, label: "Tasks", path: "/tasks" },
  { icon: Clock, label: "Time Tracking", path: "/time" },
  { icon: Target, label: "Goals & OKRs", path: "/goals" },
  { icon: PieChart, label: "Portfolio", path: "/portfolio" },
  { icon: Megaphone, label: "Announcements", path: "/announcements" },
  { icon: FileText, label: "Documents", path: "/documents" },
];

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();

  const filtered = pages.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        setLocation(filtered[selectedIndex].path);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, setLocation, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-[15vh] -translate-x-1/2 w-full max-w-2xl z-[100] p-4"
          >
            <div className="bg-card border border-border shadow-2xl shadow-black/50 rounded-2xl overflow-hidden flex flex-col">
              <div className="flex items-center px-4 py-3 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground mr-3" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, tasks, docs..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-lg font-sans"
                />
                <div className="text-[10px] font-mono bg-secondary px-2 py-1 rounded text-muted-foreground border border-border">ESC</div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No results found.</div>
                ) : (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Navigation</div>
                    {filtered.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.path}
                          onMouseEnter={() => setSelectedIndex(i)}
                          onClick={() => {
                            setLocation(item.path);
                            onClose();
                          }}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                            i === selectedIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${i === selectedIndex ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
