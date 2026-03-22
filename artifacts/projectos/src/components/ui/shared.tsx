import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 border border-primary-foreground/10",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50",
      ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
      outline: "bg-transparent border-2 border-border text-foreground hover:border-primary hover:text-primary",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs font-medium rounded-lg",
      md: "px-4 py-2 text-sm font-semibold rounded-xl",
      lg: "px-6 py-3 text-base font-bold rounded-2xl",
      icon: "p-2 rounded-xl flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Card
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card/80 backdrop-blur-xl border border-border shadow-xl shadow-black/20 rounded-2xl overflow-hidden relative",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, className, color = "gray" }: { children: React.ReactNode; className?: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-muted text-muted-foreground border-border",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    indigo: "bg-primary/10 text-primary border-primary/20",
    purple: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <span className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border flex items-center gap-1.5 w-fit", colors[color] || colors.gray, className)}>
      {children}
    </span>
  );
}

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Textarea
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-4 py-3 bg-background/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-y min-h-[100px]",
          "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// Modal
export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; maxWidth?: string }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-50 p-4", maxWidth)}
          >
            <Card className="p-6 shadow-2xl shadow-black/50 border-white/10">
              <div className="flex items-center justify-between mb-6">
                {title && <h2 className="text-xl font-display font-bold">{title}</h2>}
                <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-colors ml-auto">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {children}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Avatar
export function Avatar({ name, src, color = "bg-primary" }: { name: string; src?: string; color?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-background shrink-0", color)}>
      {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
    </div>
  );
}

// AvatarStack
export function AvatarStack({ members, max = 3 }: { members: any[]; max?: number }) {
  if (!members || members.length === 0) return null;
  const visible = members.slice(0, max);
  const remaining = members.length - max;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m, i) => (
        <div key={i} className="relative z-10" style={{ zIndex: 10 - i }}>
          <Avatar name={m.name || "User"} color={m.color || "bg-indigo-500"} />
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-2 ring-background z-0 relative">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ProgressBar
export function ProgressBar({ progress, colorClass = "bg-primary", heightClass = "h-2" }: { progress: number; colorClass?: string; heightClass?: string }) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  return (
    <div className={cn("w-full bg-secondary rounded-full overflow-hidden", heightClass)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safeProgress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full", colorClass)}
      />
    </div>
  );
}

// RingChart
export function RingChart({ progress, size = 64, strokeWidth = 6, color = "#6366f1" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-secondary"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-mono font-bold">{progress}%</span>
      </div>
    </div>
  );
}
