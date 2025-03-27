import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminSDRManagement from "@/pages/admin/sdr-management";
import AdminChannels from "@/pages/admin/channels";
import SDRDashboard from "@/pages/sdr/dashboard";
import SDRProspectSearch from "@/pages/sdr/prospect-search";
import SDRProspects from "@/pages/sdr/prospects";
import SavedProspects from "@/pages/sdr/saved-prospects";
import ProspectDetails from "@/pages/sdr/prospect-details";

import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute role="admin" path="/admin" component={AdminDashboard} />
      </Route>
      <Route path="/admin/sdrs">
        <ProtectedRoute role="admin" path="/admin/sdrs" component={AdminSDRManagement} />
      </Route>
      <Route path="/admin/channels">
        <ProtectedRoute role="admin" path="/admin/channels" component={AdminChannels} />
      </Route>
      
      {/* SDR routes */}
      <Route path="/sdr">
        <ProtectedRoute role="sdr" path="/sdr" component={SDRDashboard} />
      </Route>
      <Route path="/sdr/search">
        <ProtectedRoute role="sdr" path="/sdr/search" component={SDRProspectSearch} />
      </Route>
      <Route path="/sdr/prospects">
        <ProtectedRoute role="sdr" path="/sdr/prospects" component={SDRProspects} />
      </Route>
      <Route path="/sdr/saved-prospects">
        <ProtectedRoute role="sdr" path="/sdr/saved-prospects" component={SavedProspects} />
      </Route>
      <Route path="/sdr/prospect-details/:id">
        <ProtectedRoute role="sdr" path="/sdr/prospect-details/:id" component={ProspectDetails} />
      </Route>
      
      {/* Redirect root to appropriate dashboard based on role */}
      <Route path="/">
        <ProtectedRoute path="/" component={AdminDashboard} />
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
