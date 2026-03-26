import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Time from "@/pages/Time";
import Goals from "@/pages/Goals";
import Announcements from "@/pages/Announcements";
import Portfolio from "@/pages/Portfolio";
import Documents from "@/pages/Documents";
import Standups from "@/pages/Standups";
import Sprints from "@/pages/Sprints";
import Admin from "@/pages/Admin";
import Messaging from "@/pages/Messaging";
import EmailHub from "@/pages/EmailHub";
import Guide from "@/pages/Guide";
import CalendarPage from "@/pages/Calendar";
import Workload from "@/pages/Workload";
import Automations from "@/pages/Automations";
import Forms from "@/pages/Forms";
import Milestones from "@/pages/Milestones";
import Approvals from "@/pages/Approvals";
import ProjectUpdates from "@/pages/ProjectUpdates";
import Reports from "@/pages/Reports";
import Tags from "@/pages/Tags";
import ProjectTemplates from "@/pages/ProjectTemplates";
import MyDay from "@/pages/MyDay";
import ActivityFeed from "@/pages/ActivityFeed";
import Trash from "@/pages/Trash";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/time" component={Time} />
        <Route path="/goals" component={Goals} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/documents" component={Documents} />
        <Route path="/standups" component={Standups} />
        <Route path="/sprints" component={Sprints} />
        <Route path="/admin" component={Admin} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/email" component={EmailHub} />
        <Route path="/guide" component={Guide} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/workload" component={Workload} />
        <Route path="/automations" component={Automations} />
        <Route path="/forms" component={Forms} />
        <Route path="/milestones" component={Milestones} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/project-updates" component={ProjectUpdates} />
        <Route path="/reports" component={Reports} />
        <Route path="/tags" component={Tags} />
        <Route path="/templates" component={ProjectTemplates} />
        <Route path="/my-day" component={MyDay} />
        <Route path="/activity" component={ActivityFeed} />
        <Route path="/trash" component={Trash} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
