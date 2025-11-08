import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Status from "./pages/Status";
import StatusList from "./pages/StatusList";
import StatusSchedule from "./pages/StatusSchedule";
import StatusConfig from "./pages/StatusConfig";
import ViewOnce from "./pages/ViewOnce";
import DeletedMessages from "./pages/DeletedMessages";
import Autoresponder from "./pages/Autoresponder";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Upgrade from "./pages/Upgrade";
import Help from "./pages/Help";
import DashboardLayout from "./components/layout/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="status" element={<Status />} />
            <Route path="status/list" element={<StatusList />} />
            <Route path="status/schedule" element={<StatusSchedule />} />
            <Route path="status/config" element={<StatusConfig />} />
            <Route path="view-once" element={<ViewOnce />} />
            <Route path="deleted-messages" element={<DeletedMessages />} />
            <Route path="autoresponder" element={<Autoresponder />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="help" element={<Help />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
