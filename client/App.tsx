import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEngagements from "./pages/AdminEngagements";
import AdminEngagementDetail from "./pages/AdminEngagementDetail";
import ProjectJourney from "./pages/ProjectJourney";
import ProjectLifecycle from "./pages/ProjectLifecycle";
import ProjectFormFill from "./pages/ProjectFormFill";
import ClientNotifications from "./pages/ClientNotifications";

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
          <Route path="/admin/engagements" element={<AdminEngagements />} />
          <Route
            path="/admin/engagements/:engagementId"
            element={<AdminEngagementDetail />}
          />
          <Route path="/project/journey" element={<ProjectJourney />} />
          <Route
            path="/project/form/:engagementId"
            element={<ProjectFormFill />}
          />
          <Route
            path="/project/lifecycle/:engagementId"
            element={<ProjectLifecycle />}
          />
          <Route
            path="/project/notifications"
            element={<ClientNotifications />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
