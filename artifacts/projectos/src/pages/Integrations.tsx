import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ExternalLink, Check, Zap, MessageSquare, Mail, Calendar, Database,
  GitBranch, BarChart3, Cloud, CreditCard, Users, FileText, Globe, Webhook,
  Smartphone, Shield, Palette, Box, Code, Layers, Activity, Star, Filter
} from "lucide-react";

type Integration = {
  id: string;
  name: string;
  icon: any;
  color: string;
  category: string;
  description: string;
  features: string[];
  installed: boolean;
  popular?: boolean;
};

const INTEGRATIONS: Integration[] = [
  { id: "slack", name: "Slack", icon: MessageSquare, color: "#4A154B", category: "Communication", description: "Send task updates, notifications, and create tasks from Slack messages", features: ["Real-time notifications", "Task creation from messages", "Channel sync"], installed: true, popular: true },
  { id: "github", name: "GitHub", icon: GitBranch, color: "#24292f", category: "Development", description: "Link PRs to tasks, auto-update status on merge, sync issues", features: ["PR linking", "Auto-status updates", "Issue sync", "Commit tracking"], installed: true, popular: true },
  { id: "google-calendar", name: "Google Calendar", icon: Calendar, color: "#4285F4", category: "Productivity", description: "Sync tasks with calendar events, create events from due dates", features: ["Two-way sync", "Event creation", "Deadline reminders"], installed: true, popular: true },
  { id: "gmail", name: "Gmail", icon: Mail, color: "#EA4335", category: "Communication", description: "Create tasks from emails, send updates via email", features: ["Email-to-task", "Thread tracking", "Auto-replies"], installed: false, popular: true },
  { id: "stripe", name: "Stripe", icon: CreditCard, color: "#635BFF", category: "Finance", description: "Track payments, invoices, and revenue alongside projects", features: ["Payment tracking", "Invoice sync", "Revenue reports"], installed: false },
  { id: "jira", name: "Jira", icon: Layers, color: "#0052CC", category: "Project Management", description: "Import issues, sync statuses, and migrate from Jira", features: ["Issue import", "Status sync", "Migration wizard"], installed: false },
  { id: "figma", name: "Figma", icon: Palette, color: "#F24E1E", category: "Design", description: "Embed designs in tasks, get notified on design changes", features: ["Design embeds", "Comment sync", "Version tracking"], installed: false, popular: true },
  { id: "gitlab", name: "GitLab", icon: GitBranch, color: "#FC6D26", category: "Development", description: "Link merge requests, track CI/CD pipelines, sync issues", features: ["MR linking", "Pipeline status", "Issue sync"], installed: false },
  { id: "notion", name: "Notion", icon: FileText, color: "#000000", category: "Productivity", description: "Sync pages and databases, link docs to tasks", features: ["Page sync", "Database linking", "Content import"], installed: false },
  { id: "teams", name: "Microsoft Teams", icon: Users, color: "#6264A7", category: "Communication", description: "Post updates to channels, create tasks from messages", features: ["Channel notifications", "Task creation", "Meeting links"], installed: false },
  { id: "salesforce", name: "Salesforce", icon: Cloud, color: "#00A1E0", category: "CRM", description: "Link deals to projects, sync contacts and accounts", features: ["Deal tracking", "Contact sync", "Pipeline visibility"], installed: false },
  { id: "hubspot", name: "HubSpot", icon: Activity, color: "#FF7A59", category: "CRM", description: "Sync contacts, track deals, automate marketing tasks", features: ["Contact sync", "Deal pipeline", "Marketing automation"], installed: false },
  { id: "zapier", name: "Zapier", icon: Zap, color: "#FF4A00", category: "Automation", description: "Connect with 5000+ apps through automated workflows", features: ["5000+ apps", "Custom triggers", "Multi-step zaps"], installed: false, popular: true },
  { id: "webhooks", name: "Webhooks", icon: Webhook, color: "#6366f1", category: "Development", description: "Send and receive data via custom webhook endpoints", features: ["Custom payloads", "Event filtering", "Retry logic"], installed: true },
  { id: "aws-s3", name: "AWS S3", icon: Database, color: "#FF9900", category: "Storage", description: "Store file attachments in S3 buckets", features: ["File storage", "Auto-backup", "CDN integration"], installed: false },
  { id: "twilio", name: "Twilio", icon: Smartphone, color: "#F22F46", category: "Communication", description: "Send SMS notifications, voice calls for critical alerts", features: ["SMS alerts", "Voice calls", "WhatsApp"], installed: true },
  { id: "google-drive", name: "Google Drive", icon: Cloud, color: "#0F9D58", category: "Storage", description: "Attach files from Drive, sync shared documents", features: ["File picker", "Auto-sync", "Sharing controls"], installed: false },
  { id: "datadog", name: "Datadog", icon: BarChart3, color: "#632CA6", category: "Monitoring", description: "Create tasks from alerts, track incidents", features: ["Alert-to-task", "Incident tracking", "Dashboard links"], installed: false },
  { id: "sentry", name: "Sentry", icon: Shield, color: "#362D59", category: "Development", description: "Auto-create bug tasks from error reports", features: ["Error-to-task", "Stack traces", "Release tracking"], installed: false },
  { id: "rest-api", name: "REST API", icon: Code, color: "#10b981", category: "Development", description: "Full REST API access for custom integrations", features: ["CRUD operations", "Webhooks", "API keys"], installed: true },
  { id: "google-sheets", name: "Google Sheets", icon: Globe, color: "#0F9D58", category: "Productivity", description: "Sync task data with spreadsheets for custom reporting", features: ["Auto-sync", "Custom views", "Data export"], installed: false },
  { id: "dropbox", name: "Dropbox", icon: Box, color: "#0061FF", category: "Storage", description: "Attach and sync files from Dropbox", features: ["File picker", "Version sync", "Sharing"], installed: false },
  { id: "linear", name: "Linear", icon: Layers, color: "#5E6AD2", category: "Project Management", description: "Two-way sync with Linear issues and projects", features: ["Issue sync", "Project mapping", "Label sync"], installed: false },
  { id: "pagerduty", name: "PagerDuty", icon: Shield, color: "#06AC38", category: "Monitoring", description: "Create tasks from incidents, escalation tracking", features: ["Incident linking", "On-call schedules", "Escalation"], installed: false },
];

const CATEGORIES = ["All", "Communication", "Development", "Productivity", "Design", "CRM", "Finance", "Automation", "Storage", "Monitoring", "Project Management"];

export default function Integrations() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [filter, setFilter] = useState<"all" | "installed" | "available">("all");

  const filtered = INTEGRATIONS.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && i.category !== category) return false;
    if (filter === "installed" && !i.installed) return false;
    if (filter === "available" && i.installed) return false;
    return true;
  });

  const installedCount = INTEGRATIONS.filter(i => i.installed).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground">{INTEGRATIONS.length} integrations available · {installedCount} installed</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search integrations..."
              className="w-full pl-10 pr-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1">
            {(["all", "installed", "available"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === c ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground bg-secondary/20 border border-transparent hover:border-border"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((integration, i) => {
              const Icon = integration.icon;
              return (
                <motion.div key={integration.id}
                  layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: integration.color + "20" }}>
                      <Icon className="w-5 h-5" style={{ color: integration.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{integration.name}</h3>
                        {integration.popular && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{integration.category}</span>
                    </div>
                    {integration.installed ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg text-[10px] font-bold">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100">
                        Install
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{integration.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {integration.features.map(f => (
                      <span key={f} className="px-1.5 py-0.5 bg-secondary/40 rounded text-[10px] text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No integrations match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
