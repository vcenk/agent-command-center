import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/RouteGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Eager load critical auth pages
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NoAccess from "./pages/NoAccess";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/landing/LandingPage";

// Lazy load dashboard pages for code splitting
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const AgentsList = lazy(() => import("./pages/dashboard/agents/AgentsList"));
const AgentForm = lazy(() => import("./pages/dashboard/agents/AgentForm"));
const AgentDetail = lazy(() => import("./pages/dashboard/agents/AgentDetail"));
const AgentInstall = lazy(() => import("./pages/dashboard/agents/AgentInstall"));
const AgentReview = lazy(() => import("./pages/dashboard/agents/AgentReview"));
const AgentTools = lazy(() => import("./pages/dashboard/agents/AgentTools"));
const PersonasList = lazy(() => import("./pages/dashboard/personas/PersonasList"));
const PersonaForm = lazy(() => import("./pages/dashboard/personas/PersonaForm"));
const PersonaDetail = lazy(() => import("./pages/dashboard/personas/PersonaDetail"));
const KnowledgeList = lazy(() => import("./pages/dashboard/knowledge/KnowledgeList"));
const KnowledgeForm = lazy(() => import("./pages/dashboard/knowledge/KnowledgeForm"));
const KnowledgeDetail = lazy(() => import("./pages/dashboard/knowledge/KnowledgeDetail"));
const CallsList = lazy(() => import("./pages/dashboard/calls/CallsList"));
const CallDetail = lazy(() => import("./pages/dashboard/calls/CallDetail"));
const ChannelsPage = lazy(() => import("./pages/dashboard/channels/ChannelsPage"));
const TemplatesPage = lazy(() => import("./pages/dashboard/templates/TemplatesPage").then(m => ({ default: m.TemplatesPage })));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const AuditLogsPage = lazy(() => import("./pages/dashboard/AuditLogsPage"));
const TestChatPage = lazy(() => import("./pages/dashboard/TestChatPage"));
const SessionsList = lazy(() => import("./pages/dashboard/sessions/SessionsList"));
const SessionDetail = lazy(() => import("./pages/dashboard/sessions/SessionDetail"));
const LeadsPage = lazy(() => import("./pages/dashboard/leads/LeadsPage"));
const BillingPage = lazy(() => import("./pages/dashboard/BillingPage"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/AnalyticsPage"));
const IntegrationsPage = lazy(() => import("./pages/dashboard/integrations/IntegrationsPage"));
const SlackSetup = lazy(() => import("./pages/dashboard/integrations/SlackSetup"));
const GoogleCalendarSetup = lazy(() => import("./pages/dashboard/integrations/GoogleCalendarSetup"));

// Global error handler for auth errors
const handleQueryError = (error: unknown) => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 401) {
      console.warn('[QueryClient] Auth error detected, may need to re-login');
      // Don't auto-redirect here as it can cause loops - let the UI handle it
    }
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry on auth errors (401/403) or server config errors (500)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status === 401 || status === 403 || status === 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60, // 1 minute
    },
    mutations: {
      onError: handleQueryError,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<RouteGuard requireAuth>{<Onboarding />}</RouteGuard>} />
            <Route path="/no-access" element={<NoAccess />} />
            <Route path="/dashboard" element={<RouteGuard requireAuth requireWorkspace><DashboardLayout /></RouteGuard>}>
              <Route index element={<Suspense fallback={<PageLoader />}><Overview /></Suspense>} />
              <Route path="templates" element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
              <Route path="agents" element={<Suspense fallback={<PageLoader />}><AgentsList /></Suspense>} />
              <Route path="agents/new" element={<Suspense fallback={<PageLoader />}><AgentForm /></Suspense>} />
              <Route path="agents/:id" element={<Suspense fallback={<PageLoader />}><AgentDetail /></Suspense>} />
              <Route path="agents/:id/edit" element={<Suspense fallback={<PageLoader />}><AgentForm /></Suspense>} />
              <Route path="agents/:id/install" element={<Suspense fallback={<PageLoader />}><AgentInstall /></Suspense>} />
              <Route path="agents/:id/review" element={<Suspense fallback={<PageLoader />}><AgentReview /></Suspense>} />
              <Route path="agents/:id/tools" element={<Suspense fallback={<PageLoader />}><AgentTools /></Suspense>} />
              <Route path="personas" element={<Suspense fallback={<PageLoader />}><PersonasList /></Suspense>} />
              <Route path="personas/new" element={<Suspense fallback={<PageLoader />}><PersonaForm /></Suspense>} />
              <Route path="personas/:id" element={<Suspense fallback={<PageLoader />}><PersonaDetail /></Suspense>} />
              <Route path="personas/:id/edit" element={<Suspense fallback={<PageLoader />}><PersonaForm /></Suspense>} />
              <Route path="knowledge" element={<Suspense fallback={<PageLoader />}><KnowledgeList /></Suspense>} />
              <Route path="knowledge/new" element={<Suspense fallback={<PageLoader />}><KnowledgeForm /></Suspense>} />
              <Route path="knowledge/:id" element={<Suspense fallback={<PageLoader />}><KnowledgeDetail /></Suspense>} />
              <Route path="channels" element={<Suspense fallback={<PageLoader />}><ChannelsPage /></Suspense>} />
              <Route path="test-chat" element={<Suspense fallback={<PageLoader />}><TestChatPage /></Suspense>} />
              <Route path="sessions" element={<Suspense fallback={<PageLoader />}><SessionsList /></Suspense>} />
              <Route path="sessions/:id" element={<Suspense fallback={<PageLoader />}><SessionDetail /></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<PageLoader />}><LeadsPage /></Suspense>} />
              <Route path="calls" element={<Suspense fallback={<PageLoader />}><CallsList /></Suspense>} />
              <Route path="calls/:id" element={<Suspense fallback={<PageLoader />}><CallDetail /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
              <Route path="integrations" element={<Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>} />
              <Route path="integrations/slack" element={<Suspense fallback={<PageLoader />}><SlackSetup /></Suspense>} />
              <Route path="integrations/calendar" element={<Suspense fallback={<PageLoader />}><GoogleCalendarSetup /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
              <Route path="billing" element={<Suspense fallback={<PageLoader />}><BillingPage /></Suspense>} />
            </Route>
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
