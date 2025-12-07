import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminLoginAsUser from "./pages/AdminLoginAsUser";
import AdminEngagements from "./pages/AdminEngagements";
import AdminEngagementDetail from "./pages/AdminEngagementDetail";
import AdminTier1Assessments from "./pages/AdminTier1Assessments";
import AdminTier1Detail from "./pages/AdminTier1Detail";
import ProjectJourney from "./pages/ProjectJourney";
import ProjectLifecycle from "./pages/ProjectLifecycle";
import ProjectFormTier1 from "./pages/ProjectFormTier1";
import ClientNotifications from "./pages/ClientNotifications";

// CRM Pages - Admin
import CRMLayout from "./pages/CRM/CRMLayout";
import CRMDashboard from "./pages/CRM/CRMDashboard";
import ContactsManagement from "./pages/CRM/ContactsManagement";
import ContactDetail from "./pages/CRM/ContactDetail";
import EngagementsManagement from "./pages/CRM/EngagementsManagement";
import EngagementDetail from "./pages/CRM/EngagementDetail";
import ActivityTimeline from "./pages/CRM/ActivityTimeline";

// CRM Pages - Client
import ClientLayout from "./pages/CRM/ClientLayout";
import InviteAccept from "./pages/CRM/InviteAccept";
import ClientDashboard from "./pages/CRM/ClientDashboard";
import ClientEngagementsList from "./pages/CRM/ClientEngagementsList";
import Tier1Form from "./pages/CRM/Tier1Form";
import Tier2Form from "./pages/CRM/Tier2Form";
import ClientEngagementView from "./pages/CRM/ClientEngagementView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
          <Route path="/admin/login-as-user" element={<AdminLoginAsUser />} />
          <Route path="/admin/engagements" element={<AdminEngagements />} />
          <Route
            path="/admin/engagements/:engagementId"
            element={<AdminEngagementDetail />}
          />
          <Route path="/admin/tier1" element={<AdminTier1Assessments />} />
          <Route
            path="/admin/tier1/:assessmentId"
            element={<AdminTier1Detail />}
          />
          <Route path="/project/journey" element={<ProjectJourney />} />
          <Route
            path="/project/:engagementId/tier1"
            element={<ProjectFormTier1 />}
          />
          <Route
            path="/project/lifecycle/:engagementId"
            element={<ProjectLifecycle />}
          />
          <Route
            path="/project/notifications"
            element={<ClientNotifications />}
          />

          {/* ========== NEW CRM ROUTES - ADMIN ========== */}
          <Route path="/admin/crm" element={<CRMLayout />}>
            <Route path="dashboard" element={<CRMDashboard />} />
            <Route path="contacts" element={<ContactsManagement />} />
            <Route path="contacts/:id" element={<ContactDetail />} />
            <Route path="engagements" element={<EngagementsManagement />} />
            <Route path="engagements/:id" element={<EngagementDetail />} />
            <Route path="activity" element={<ActivityTimeline />} />
          </Route>

          {/* ========== NEW CRM ROUTES - CLIENT ========== */}
          <Route path="/crm/invite/:token" element={<InviteAccept />} />
          <Route path="/crm" element={<ClientLayout />}>
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="engagements" element={<ClientEngagementsList />} />
            <Route path="tier1" element={<Tier1Form />} />
            <Route path="tier2" element={<Tier2Form />} />
          </Route>
          <Route path="/crm/client/:id" element={<ClientEngagementView />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
