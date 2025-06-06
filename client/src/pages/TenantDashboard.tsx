import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Home, 
  Wrench, 
  CreditCard, 
  User, 
  LogOut, 
  Plus, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TenantPayment from "./TenantPayment";

interface TenantDashboardProps {
  tenant: any;
  token: string;
  onLogout: () => void;
}

const maintenanceRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "emergency"]),
  category: z.string().min(1, "Category is required"),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

export default function TenantDashboard({ tenant, token, onLogout }: TenantDashboardProps) {
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up API headers with authentication
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Fetch tenant profile
  const { data: profile } = useQuery({
    queryKey: ["/api/tenant/profile"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/profile", {
        headers: apiHeaders,
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  // Fetch maintenance requests
  const { data: maintenanceRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/tenant/maintenance-requests"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/maintenance-requests", {
        headers: apiHeaders,
      });
      if (!response.ok) throw new Error("Failed to fetch maintenance requests");
      return response.json();
    },
  });

  // Fetch rent payments
  const { data: rentPayments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/tenant/rent-payments"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/rent-payments", {
        headers: apiHeaders,
      });
      if (!response.ok) throw new Error("Failed to fetch rent payments");
      return response.json();
    },
  });

  // Create maintenance request mutation
  const createMaintenanceRequest = useMutation({
    mutationFn: async (data: MaintenanceRequestFormData) => {
      const response = await fetch("/api/tenant/maintenance-requests", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create maintenance request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/maintenance-requests"] });
      setIsMaintenanceDialogOpen(false);
      toast({
        title: "Success",
        description: "Maintenance request submitted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit maintenance request",
        variant: "destructive",
      });
    },
  });

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category: "",
    },
  });

  const onSubmitMaintenanceRequest = (data: MaintenanceRequestFormData) => {
    createMaintenanceRequest.mutate(data);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/tenant/logout", {
        method: "POST",
        headers: apiHeaders,
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("tenantToken");
      onLogout();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-600" />;
      case "open": return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Tenant Portal</h1>
                <p className="text-sm text-gray-500">
                  Welcome, {tenant.firstName} {tenant.lastName}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unit Information</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Unit {profile?.unitId || "N/A"}</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly Rent: ${profile?.monthlyRent || "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {maintenanceRequests?.filter((r: any) => r.status !== "completed").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maintenance requests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rentPayments?.filter((p: any) => p.status === "paid").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payments made this year
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Maintenance Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRequests ? (
                    <p>Loading...</p>
                  ) : maintenanceRequests?.length > 0 ? (
                    <div className="space-y-3">
                      {maintenanceRequests.slice(0, 3).map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(request.status)}
                            <div>
                              <p className="font-medium">{request.title}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(request.submittedDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No maintenance requests found.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPayments ? (
                    <p>Loading...</p>
                  ) : rentPayments?.length > 0 ? (
                    <div className="space-y-3">
                      {rentPayments.slice(0, 3).map((payment: any) => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium">${payment.amount}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(payment.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No payment history found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Maintenance Requests</h2>
              <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Maintenance Request</DialogTitle>
                    <DialogDescription>
                      Describe the issue you're experiencing and we'll get it resolved.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitMaintenanceRequest)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of the issue" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="hvac">HVAC</SelectItem>
                                <SelectItem value="appliances">Appliances</SelectItem>
                                <SelectItem value="general">General Maintenance</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide detailed information about the issue..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsMaintenanceDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMaintenanceRequest.isPending}>
                          {createMaintenanceRequest.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {isLoadingRequests ? (
                <p>Loading maintenance requests...</p>
              ) : maintenanceRequests?.length > 0 ? (
                maintenanceRequests.map((request: any) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <CardDescription>
                            Submitted on {new Date(request.submittedDate).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{request.description}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        Category: {request.category} • ID: {request.id.slice(0, 8)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">
                      No maintenance requests found. Submit your first request using the button above.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Payment History</h2>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Make Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Make a Payment</DialogTitle>
                    <DialogDescription>
                      Pay your rent securely using our online payment system.
                    </DialogDescription>
                  </DialogHeader>
                  <TenantPayment
                    onSuccess={() => {
                      setIsPaymentDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/tenant/rent-payments'] });
                      toast({
                        title: "Payment Successful",
                        description: "Your payment has been processed successfully!",
                      });
                    }}
                    onCancel={() => setIsPaymentDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid gap-4">
              {isLoadingPayments ? (
                <p>Loading payment history...</p>
              ) : rentPayments?.length > 0 ? (
                rentPayments.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="bg-green-100 p-2 rounded-full">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-lg">${payment.amount}</p>
                            <p className="text-sm text-gray-500">
                              Due: {new Date(payment.dueDate).toLocaleDateString()}
                            </p>
                            {payment.paidDate && (
                              <p className="text-sm text-gray-500">
                                Paid: {new Date(payment.paidDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status.toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {payment.paymentMethod || "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">
                      No payment history found.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold">Profile Information</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>
                  Your account information and lease details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Name</label>
                    <p className="mt-1">{profile?.firstName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Name</label>
                    <p className="mt-1">{profile?.lastName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1">{profile?.email || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1">{profile?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit</label>
                    <p className="mt-1">{profile?.unitId || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
                    <p className="mt-1">${profile?.monthlyRent || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lease Start</label>
                    <p className="mt-1">
                      {profile?.leaseStart ? new Date(profile.leaseStart).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lease End</label>
                    <p className="mt-1">
                      {profile?.leaseEnd ? new Date(profile.leaseEnd).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}