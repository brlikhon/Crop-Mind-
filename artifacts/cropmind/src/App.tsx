import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import DiagnosePage from "@/pages/DiagnosePage";
import ArchitecturePage from "@/pages/ArchitecturePage";
import OfficerDashboardPage from "@/pages/OfficerDashboardPage";
import ImpactDashboardPage from "@/pages/ImpactDashboardPage";
import DemoRoomPage from "@/pages/DemoRoomPage";
import NotFound from "@/pages/not-found";

// Use a configured query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DiagnosePage} />
        <Route path="/officer" component={OfficerDashboardPage} />
        <Route path="/impact" component={ImpactDashboardPage} />
        <Route path="/demo" component={DemoRoomPage} />
        <Route path="/architecture" component={ArchitecturePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Setup base path for GitHub Pages or Replit deployments safely
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
