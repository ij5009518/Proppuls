import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Properties from '@/pages/Properties';
import Units from '@/pages/Units';
import Tenants from "./pages/Tenants";
import Tasks from "./pages/Tasks";
import RentPayments from "./pages/RentPayments";
import Maintenance from '@/pages/Maintenance';
import Vendors from '@/pages/Vendors';
import Financials from '@/pages/Financials';
import Reports from '@/pages/Reports';
import Mortgages from '@/pages/Mortgages';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import NotFound from '@/pages/not-found';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route>
          {() => {
            setLocation("/login");
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  // Render authenticated routes
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/properties" component={Properties} />
        <Route path="/units" component={Units} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/rent-payments" component={RentPayments} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/financials" component={Financials} />
        <Route path="/reports" component={Reports} />
        <Route path="/mortgages" component={Mortgages} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;