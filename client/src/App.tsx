import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/properties" component={() => <Layout><Properties /></Layout>} />
      <Route path="/units" component={() => <Layout><Units /></Layout>} />
      <Route path="/tenants" component={() => <Layout><Tenants /></Layout>} />
      <Route path="/maintenance" component={() => <Layout><Maintenance /></Layout>} />
      <Route path="/vendors" component={() => <Layout><Vendors /></Layout>} />
      <Route path="/financials" component={() => <Layout><Financials /></Layout>} />
      <Route path="/reports" component={() => <Layout><Reports /></Layout>} />
      <Route path="/users" component={() => <Layout><Users /></Layout>} />
      <Route path="/mortgages" component={() => <Layout><Mortgages /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;