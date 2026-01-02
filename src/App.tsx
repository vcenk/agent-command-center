import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/RouteGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NoAccess from "./pages/NoAccess";
import NotFound from "./pages/NotFound";
import Overview from "./pages/dashboard/Overview";
import AgentsList from "./pages/dashboard/agents/AgentsList";
import AgentForm from "./pages/dashboard/agents/AgentForm";
import AgentDetail from "./pages/dashboard/agents/AgentDetail";
import AgentInstall from "./pages/dashboard/agents/AgentInstall";
import AgentReview from "./pages/dashboard/agents/AgentReview";
import PersonasList from "./pages/dashboard/personas/PersonasList";
import PersonaForm from "./pages/dashboard/personas/PersonaForm";
import PersonaDetail from "./pages/dashboard/personas/PersonaDetail";
import KnowledgeList from "./pages/dashboard/knowledge/KnowledgeList";
import KnowledgeForm from "./pages/dashboard/knowledge/KnowledgeForm";
import KnowledgeDetail from "./pages/dashboard/knowledge/KnowledgeDetail";
import CallsList from "./pages/dashboard/calls/CallsList";
import CallDetail from "./pages/dashboard/calls/CallDetail";
import ChannelsPage from "./pages/dashboard/channels/ChannelsPage";
import { TemplatesPage } from "./pages/dashboard/templates/TemplatesPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import AuditLogsPage from "./pages/dashboard/AuditLogsPage";
import TestChatPage from "./pages/dashboard/TestChatPage";
import SessionsList from "./pages/dashboard/sessions/SessionsList";
import SessionDetail from "./pages/dashboard/sessions/SessionDetail";
import LeadsPage from "./pages/dashboard/leads/LeadsPage";

const queryClient = new QueryClient();

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
    <p className="text-muted-foreground">This module is coming soon. Use Settings → Seed Demo Data to populate sample data.</p>
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
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/no-access" element={<NoAccess />} />
            <Route path="/dashboard" element={<RouteGuard requireAuth requireWorkspace><DashboardLayout /></RouteGuard>}>
              <Route index element={<Overview />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="agents" element={<AgentsList />} />
              <Route path="agents/new" element={<AgentForm />} />
              <Route path="agents/:id" element={<AgentDetail />} />
              <Route path="agents/:id/edit" element={<AgentForm />} />
              <Route path="agents/:id/install" element={<AgentInstall />} />
              <Route path="agents/:id/review" element={<AgentReview />} />
              <Route path="personas" element={<PersonasList />} />
              <Route path="personas/new" element={<PersonaForm />} />
              <Route path="personas/:id" element={<PersonaDetail />} />
              <Route path="personas/:id/edit" element={<PersonaForm />} />
              <Route path="knowledge" element={<KnowledgeList />} />
              <Route path="knowledge/new" element={<KnowledgeForm />} />
              <Route path="knowledge/:id" element={<KnowledgeDetail />} />
              <Route path="channels" element={<ChannelsPage />} />
              <Route path="test-chat" element={<TestChatPage />} />
              <Route path="sessions" element={<SessionsList />} />
              <Route path="sessions/:id" element={<SessionDetail />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="calls" element={<CallsList />} />
              <Route path="calls/:id" element={<CallDetail />} />
              <Route path="integrations" element={<ComingSoon title="Integrations" />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="billing" element={<ComingSoon title="Billing" />} />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
