
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Properties from './pages/Properties';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import RentPayments from './pages/RentPayments';
import Maintenance from './pages/Maintenance';
import Vendors from './pages/Vendors';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import Mortgages from './pages/Mortgages';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/not-found';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/" nest>
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/users" component={Users} />
                <Route path="/properties" component={Properties} />
                <Route path="/units" component={Units} />
                <Route path="/tenants" component={Tenants} />
                <Route path="/rent-payments" component={RentPayments} />
                <Route path="/maintenance" component={Maintenance} />
                <Route path="/vendors" component={Vendors} />
                <Route path="/financials" component={Financials} />
                <Route path="/reports" component={Reports} />
                <Route path="/mortgages" component={Mortgages} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </Route>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
