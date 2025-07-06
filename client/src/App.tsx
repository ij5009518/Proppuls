import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';

// Pages
import Landing from "@/pages/Landing";
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Properties from '@/pages/Properties';
import Units from '@/pages/Units';
import Tenants from "./pages/Tenants";
import Tasks from "./pages/Tasks";
import RentPayments from "./pages/RentPayments";
import Maintenance from '@/pages/Maintenance';

import Financials from '@/pages/Financials';
import Reports from '@/pages/Reports';
import Mortgages from '@/pages/Mortgages';
import Expenses from "@/pages/Expenses";
import Calendar from "@/pages/Calendar";
import AIAssistant from "@/pages/AIAssistant";
import Settings from "@/pages/Settings";
import Organizations from "@/pages/Organizations";
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/not-found';
import EmailManager from '@/pages/EmailManager';
import AdvancedFeatures from '@/pages/AdvancedFeatures';
import LeaseManagement from '@/pages/LeaseManagement';
import DocumentManagement from '@/pages/DocumentManagement';
import CommunicationHub from '@/pages/CommunicationHub';
import TenantPortal from '@/pages/TenantPortal';
import MobileApp from '@/pages/MobileApp';
import Profile from "@/pages/Profile";

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
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/tenant" component={TenantPortal} />
        <Route path="/tenant-portal" component={TenantPortal} />
        <Route>
          {() => {
            React.useEffect(() => {
              setLocation("/login");
            }, [setLocation]);
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
        <Route path="/app" component={Dashboard} />
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/properties" component={Properties} />
        <Route path="/units" component={Units} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/rent-payments" component={RentPayments} />
        <Route path="/maintenance" component={Maintenance} />

        <Route path="/financials" component={Financials} />
        <Route path="/reports" component={Reports} />
        <Route path="/mortgages" component={Mortgages} />
        <Route path="/expenses/:category?" component={Expenses} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/advanced-features" component={AdvancedFeatures} />
        <Route path="/lease-management" component={LeaseManagement} />
        <Route path="/document-management" component={DocumentManagement} />
        <Route path="/communication-hub" component={CommunicationHub} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/email-manager" component={EmailManager} />
        <Route path="/mobile-app" component={MobileApp} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;