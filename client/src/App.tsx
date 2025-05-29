import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import Units from "@/pages/Units";
import Tenants from "@/pages/Tenants";
import Maintenance from "@/pages/Maintenance";
import Vendors from "@/pages/Vendors";
import Financials from "@/pages/Financials";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Mortgages from "@/pages/Mortgages";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use requestAnimationFrame for smoother navigation
      requestAnimationFrame(() => setLocation("/login"));
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Show loading state only briefly to improve perceived performance
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={() => <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/properties" component={() => <ProtectedRoute><Layout><Properties /></Layout></ProtectedRoute>} />
      <Route path="/units" component={() => <ProtectedRoute><Layout><Units /></Layout></ProtectedRoute>} />
      <Route path="/tenants" component={() => <ProtectedRoute><Layout><Tenants /></Layout></ProtectedRoute>} />
      <Route path="/maintenance" component={() => <ProtectedRoute><Layout><Maintenance /></Layout></ProtectedRoute>} />
      <Route path="/vendors" component={() => <ProtectedRoute><Layout><Vendors /></Layout></ProtectedRoute>} />
      <Route path="/financials" component={() => <ProtectedRoute><Layout><Financials /></Layout></ProtectedRoute>} />
      <Route path="/reports" component={() => <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/users" component={() => <ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
      <Route path="/mortgages" component={() => <ProtectedRoute><Layout><Mortgages /></Layout></ProtectedRoute>} />
      <Route component={NotFound} />
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;