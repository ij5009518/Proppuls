import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  CreditCard, 
  Wrench, 
  User, 
  LogOut,
  Plus,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface Tenant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  unitId: string;
  phoneNumber: string;
  emergencyContact: string;
  emergencyPhone: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
}

interface RentPayment {
  id: string;
  amount: string;
  dueDate: string;
  status: string;
  paidDate?: string;
  month: string;
  year: string;
}

interface MaintenanceRequest {
  id: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  category: string;
}

export default function MobileApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({
    description: '',
    category: 'plumbing',
    priority: 'medium'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: payments = [] } = useQuery<RentPayment[]>({
    queryKey: ['/api/tenant/rent-payments'],
    enabled: isLoggedIn,
  });

  const { data: maintenanceRequests = [] } = useQuery<MaintenanceRequest[]>({
    queryKey: ['/api/tenant/maintenance-requests'],
    enabled: isLoggedIn,
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/tenant/login', credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setTenant(data.tenant);
      setIsLoggedIn(true);
      toast({ title: 'Login successful', description: 'Welcome back!' });
    },
    onError: () => {
      toast({ 
        title: 'Login failed', 
        description: 'Invalid email or password',
        variant: 'destructive'
      });
    }
  });

  const maintenanceMutation = useMutation({
    mutationFn: async (requestData: typeof maintenanceForm) => {
      await apiRequest('POST', '/api/tenant/maintenance-requests', requestData);
    },
    onSuccess: () => {
      setMaintenanceForm({ description: '', category: 'plumbing', priority: 'medium' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/maintenance-requests'] });
      toast({ title: 'Request submitted', description: 'Your maintenance request has been submitted' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to submit maintenance request',
        variant: 'destructive'
      });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTenant(null);
    setActiveTab('dashboard');
    queryClient.clear();
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceForm.description.trim()) {
      toast({ title: 'Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }
    maintenanceMutation.mutate(maintenanceForm);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Mobile app container styling
  const mobileContainerClass = "max-w-sm mx-auto bg-white min-h-screen border-x shadow-xl";
  const headerClass = "bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center";
  const tabBarClass = "border-t bg-white p-2 flex justify-around sticky bottom-0";

  if (!isLoggedIn) {
    return (
      <div className={mobileContainerClass}>
        <div className={headerClass}>
          <h1 className="text-xl font-bold">Property Manager</h1>
          <p className="text-sm opacity-90">Tenant Portal</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Home className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome</h2>
            <p className="text-gray-600">Sign in to access your tenant portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500">
            <p>Test credentials:</p>
            <p>mjoseph4341@gmail.com / password123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={mobileContainerClass}>
      <div className={headerClass}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Welcome, {tenant?.firstName}</h1>
            <p className="text-sm opacity-90">Unit {tenant?.unitId}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        {activeTab === 'dashboard' && (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-600">{payment.month} {payment.year}</p>
                    </div>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No payments found</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Maintenance Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {maintenanceRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-sm">{request.description}</p>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{request.category} • {formatDate(request.createdAt)}</p>
                  </div>
                ))}
                {maintenanceRequests.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No maintenance requests</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Rent Payments</h2>
            </div>
            
            {payments.filter(p => p.status === 'pending' || p.status === 'overdue').length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Pending Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {payments.filter(p => p.status === 'pending' || p.status === 'overdue').map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <div>
                        <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-600">Due: {formatDate(payment.dueDate)}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status.toUpperCase()}
                        </Badge>
                        <Button size="sm" className="block">Pay Now</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.filter(p => p.status === 'paid').map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-600">{payment.month} {payment.year}</p>
                      {payment.paidDate && (
                        <p className="text-xs text-green-600">Paid: {formatDate(payment.paidDate)}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Maintenance</h2>
              <Button size="sm" onClick={() => setActiveTab('new-request')}>
                <Plus className="w-4 h-4 mr-1" />
                New Request
              </Button>
            </div>

            <div className="space-y-3">
              {maintenanceRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{request.description}</p>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="capitalize">{request.category}</span>
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {maintenanceRequests.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No maintenance requests</p>
                  <p className="text-sm text-gray-400">Tap "New Request" to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'new-request' && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('maintenance')}
              >
                ← Back
              </Button>
              <h2 className="text-xl font-bold">New Request</h2>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <Textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Describe the maintenance issue..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select value={maintenanceForm.category} onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="heating">Heating/AC</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <Select value={maintenanceForm.priority} onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={maintenanceMutation.isPending}
              >
                {maintenanceMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">Profile</h2>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">{tenant?.firstName} {tenant?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{tenant?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{tenant?.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit</p>
                    <p className="font-medium">{tenant?.unitId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Lease Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Monthly Rent</p>
                    <p className="font-medium">{formatCurrency(tenant?.monthlyRent || '0')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lease Start</p>
                    <p className="font-medium">{tenant?.leaseStart ? formatDate(tenant.leaseStart) : 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Lease End</p>
                    <p className="font-medium">{tenant?.leaseEnd ? formatDate(tenant.leaseEnd) : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-600">Contact Person</p>
                  <p className="font-medium">{tenant?.emergencyContact}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">Phone Number</p>
                  <p className="font-medium">{tenant?.emergencyPhone}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className={tabBarClass}>
        <Button 
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('dashboard')}
          className="flex flex-col items-center gap-1"
        >
          <Home className="w-4 h-4" />
          <span className="text-xs">Home</span>
        </Button>
        <Button 
          variant={activeTab === 'payments' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('payments')}
          className="flex flex-col items-center gap-1"
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-xs">Payments</span>
        </Button>
        <Button 
          variant={activeTab === 'maintenance' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('maintenance')}
          className="flex flex-col items-center gap-1"
        >
          <Wrench className="w-4 h-4" />
          <span className="text-xs">Maintenance</span>
        </Button>
        <Button 
          variant={activeTab === 'profile' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('profile')}
          className="flex flex-col items-center gap-1"
        >
          <User className="w-4 h-4" />
          <span className="text-xs">Profile</span>
        </Button>
      </div>
    </div>
  );
}