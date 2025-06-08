import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, Upload, FileText, DollarSign, Calendar, Clock, AlertTriangle, CheckSquare, Shield, MessageSquare, History, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, InsertTenant, Unit, RentPayment, InsertRentPayment, Task, InsertTask, TenantHistory } from "@shared/schema";

const tenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  status: z.enum(["active", "inactive", "pending"]),
  unitId: z.string().optional(),
  leaseStart: z.date().optional(),
  leaseEnd: z.date().optional(),
  monthlyRent: z.string().optional(),
  deposit: z.string().optional(),
  dateOfBirth: z.date().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const tenantStatusSchema = z.object({
  status: z.enum(["active", "pending", "moved"]),
  moveOutDate: z.string().optional(),
  moveOutReason: z.string().optional(),
});

const rentPaymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  unitId: z.string().min(1, "Unit is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.date(),
  paidDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  lateFeeAmount: z.string().optional(),
  notes: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date(),
  assignedTo: z.string().optional(),
  tenantId: z.string().optional(),
  unitId: z.string().optional(),
  propertyId: z.string().optional(),
  vendorId: z.string().optional(),
  estimatedCost: z.string().optional(),
  actualCost: z.string().optional(),
});

export default function Tenants() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isBackgroundCheckDialogOpen, setIsBackgroundCheckDialogOpen] = useState(false);
  const [isTenantHistoryDialogOpen, setIsTenantHistoryDialogOpen] = useState(false);
  const [isTenantStatusDialogOpen, setIsTenantStatusDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedUnitForHistory, setSelectedUnitForHistory] = useState<Unit | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: rentPayments } = useQuery({
    queryKey: ["/api/rent-payments"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: tenantHistory = [] } = useQuery<TenantHistory[]>({
    queryKey: ["/api/tenant-history", selectedUnitForHistory?.id],
    enabled: !!selectedUnitForHistory?.id,
  });

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      status: "pending",
      unitId: "",
      leaseStart: undefined,
      leaseEnd: undefined,
      monthlyRent: "",
      deposit: "",
    },
  });

  const paymentForm = useForm<z.infer<typeof rentPaymentSchema>>({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: "",
      paymentMethod: "",
      lateFeeAmount: "",
      notes: "",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      category: "",
      priority: "medium",
      assignedTo: "",
      estimatedCost: "",
      actualCost: "",
    },
  });

  const tenantStatusForm = useForm<z.infer<typeof tenantStatusSchema>>({
    resolver: zodResolver(tenantStatusSchema),
    defaultValues: {
      status: "active",
      moveOutDate: "",
      moveOutReason: "",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Tenant created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tenant", variant: "destructive" });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Tenant updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tenant", variant: "destructive" });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "Tenant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenant", variant: "destructive" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/rent-payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({ title: "Success", description: "Payment recorded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      taskForm.reset();
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: z.infer<typeof tenantStatusSchema> }) =>
      apiRequest("PATCH", `/api/tenants/${tenantId}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsTenantStatusDialogOpen(false);
      tenantStatusForm.reset();
      toast({ title: "Success", description: "Tenant status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof tenantSchema>) => {
    const submitData = {
      ...data,
      leaseStart: data.leaseStart?.toISOString(),
      leaseEnd: data.leaseEnd?.toISOString(),
    };
    createTenantMutation.mutate(submitData);
  };

  const onEditSubmit = (data: z.infer<typeof tenantSchema>) => {
    if (!selectedTenant) return;
    const submitData = {
      ...data,
      leaseStart: data.leaseStart?.toISOString(),
      leaseEnd: data.leaseEnd?.toISOString(),
      monthlyRent: data.monthlyRent === "" ? null : data.monthlyRent,
      deposit: data.deposit === "" ? null : data.deposit,
    };
    updateTenantMutation.mutate({ id: selectedTenant.id, data: submitData });
  };

  const onPaymentSubmit = (data: z.infer<typeof rentPaymentSchema>) => {
    const submitData = {
      ...data,
      dueDate: data.dueDate.toISOString(),
      paidDate: data.paidDate?.toISOString(),
      amount: parseFloat(data.amount),
      lateFeeAmount: data.lateFeeAmount ? parseFloat(data.lateFeeAmount) : 0,
    };
    createPaymentMutation.mutate(submitData);
  };

  const onTaskSubmit = (data: z.infer<typeof taskSchema>) => {
    const taskData: InsertTask = {
      ...data,
      dueDate: data.dueDate,
      estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
      actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleCreateTask = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    taskForm.setValue("tenantId", tenant.id);
    taskForm.setValue("unitId", tenant.unitId || "");
    setIsTaskDialogOpen(true);
  };

  const handleViewTenantHistory = (unit: Unit) => {
    setSelectedUnitForHistory(unit);
    setIsTenantHistoryDialogOpen(true);
  };

  const onTenantStatusSubmit = (data: z.infer<typeof tenantStatusSchema>) => {
    if (editingTenant) {
      updateTenantStatusMutation.mutate({
        tenantId: editingTenant.id,
        data,
      });
    }
  };

  const handleEditTenantStatus = (tenant: Tenant) => {
    setEditingTenant(tenant);
    tenantStatusForm.reset({
      status: tenant.status,
      moveOutDate: "",
      moveOutReason: "",
    });
    setIsTenantStatusDialogOpen(true);
  };

  const filteredTenants = tenants?.filter((tenant: Tenant) =>
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getUnitNumber = (unitId?: string) => {
    if (!unitId || !units) return "N/A";
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit?.unitNumber || "N/A";
  };

  const getPropertyName = (propertyId: string) => {
    if (!propertyId || !properties) return "Unknown Property";
    const property = properties.find((p: any) => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getCurrentMonthBalance = (tenantId: string) => {
    if (!rentPayments) return 0;
    const tenantPayments = rentPayments.filter((p: RentPayment) => p.tenantId === tenantId);
    return tenantPayments.reduce((total: number, payment: RentPayment) => {
      return total + (payment.amount || 0);
    }, 0);
  };

  const getOverduePayments = (tenantId: string) => {
    if (!rentPayments) return [];
    const now = new Date();
    return rentPayments.filter((p: RentPayment) => 
      p.tenantId === tenantId && 
      new Date(p.dueDate) < now && 
      !p.paidDate
    );
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tenants</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <div className="flex flex-col items-end space-y-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units?.map((unit: Unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  Unit {unit.unitNumber} - {getPropertyName(unit.propertyId)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leaseStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leaseEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthlyRent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent</FormLabel>
                          <FormControl>
                            <Input placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit</FormLabel>
                          <FormControl>
                            <Input placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTenantMutation.isPending}>
                      {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
            >
              <Grid className="h-4 w-4 mr-1" />
              List View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="h-4 w-4 mr-1" />
              Table View
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const overduePayments = getOverduePayments(tenant.id);
            const currentBalance = getCurrentMonthBalance(tenant.id);
            
            return (
              <Card 
                key={tenant.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setIsViewDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with name and status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {tenant.firstName} {tenant.lastName}
                        </h3>
                        <div className="mt-1">
                          <Badge className={getStatusColor(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Unit {getUnitNumber(tenant.unitId)}
                        </p>
                        {tenant.monthlyRent && (
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(tenant.monthlyRent)}/mo
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.phone}</p>
                    </div>

                    {/* Lease Information */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {tenant.leaseStart && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Lease Start:</span>
                          <p className="text-gray-900 dark:text-white">{formatDate(tenant.leaseStart)}</p>
                        </div>
                      )}
                      {tenant.leaseEnd && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Lease End:</span>
                          <p className="text-gray-900 dark:text-white">{formatDate(tenant.leaseEnd)}</p>
                        </div>
                      )}
                      {tenant.deposit && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Security Deposit:</span>
                          <p className="text-gray-900 dark:text-white">{formatCurrency(tenant.deposit)}</p>
                        </div>
                      )}
                    </div>

                    {/* Payment Status Alerts */}
                    {(overduePayments.length > 0 || currentBalance > 0) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {overduePayments.length > 0 && (
                          <div className="flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                            <span className="text-sm font-medium text-red-800 dark:text-red-300">
                              {overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {currentBalance > 0 && (
                          <div className="flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                              Balance: {formatCurrency(currentBalance.toString())}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-4 border-blue-300 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-gray-900" 
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div className="bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-700 dark:to-indigo-700 px-10 py-8 border-b-8 border-blue-400 dark:border-blue-600"
               style={{ backgroundColor: '#93c5fd', borderBottom: '8px solid #3b82f6' }}>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight" 
                style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1f2937' }}>
              📋 TENANT DIRECTORY
            </h2>
            <p className="text-xl text-blue-900 dark:text-blue-100 mt-3 font-black"
               style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e3a8a' }}>
              {filteredTenants.length} ACTIVE TENANTS
            </p>
          </div>
          <Table className="tenant-table-enhanced">
            <TableHeader>
              <TableRow style={{ backgroundColor: '#dbeafe', borderBottom: '4px solid #3b82f6' }}>
                <TableHead className="w-[180px] py-8 px-10" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  👤 NAME
                </TableHead>
                <TableHead className="w-[200px] py-8 px-10" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📧 CONTACT
                </TableHead>
                <TableHead className="w-[100px] py-8 px-10 text-center" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🏠 UNIT
                </TableHead>
                <TableHead className="w-[120px] py-8 px-10 text-right" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💰 RENT
                </TableHead>
                <TableHead className="w-[150px] py-8 px-10" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📅 LEASE
                </TableHead>
                <TableHead className="w-[100px] py-8 px-10" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✅ STATUS
                </TableHead>
                <TableHead className="w-[120px] py-8 px-10 text-right" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💳 BALANCE
                </TableHead>
                <TableHead className="w-[150px] py-8 px-10 text-center" 
                          style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚙️ ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant, index) => {
                const currentBalance = getCurrentMonthBalance(tenant.id);
                const overduePayments = getOverduePayments(tenant.id);
                
                return (
                  <TableRow 
                    key={tenant.id} 
                    className={`tenant-row-enhanced transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:shadow-xl group ${
                      index % 2 === 0 ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800' : 'bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700'
                    }`}
                  >
                    <TableCell className="tenant-row-enhanced">
                      <div className="flex items-center space-x-6">
                        <Avatar className="tenant-avatar-large border-4 border-white dark:border-gray-800 shadow-2xl ring-4 ring-blue-200 dark:ring-blue-800">
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white font-black">
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors tracking-tight"
                               style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1f2937', lineHeight: '1.2' }}>
                            {tenant.firstName} {tenant.lastName}
                          </div>
                          <div className="text-lg text-gray-600 dark:text-gray-400 mt-2 font-bold font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                            ID: {tenant.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tenant-row-enhanced">
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
                            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="truncate max-w-[160px]" 
                                style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151' }}>
                            {tenant.email}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
                            <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151' }}>
                            {tenant.phone}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 inline-flex items-center justify-center"
                             style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.25rem', fontWeight: '900' }}>
                          {getUnitNumber(tenant.unitId)}
                        </div>
                        {tenant.unitId && units && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              const unit = units.find((u: Unit) => u.id === tenant.unitId);
                              if (unit) handleViewTenantHistory(unit);
                            }}
                            title="View Tenant History"
                          >
                            <History className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-6 text-right">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 inline-block border border-green-200 dark:border-green-800">
                        <div className="text-green-800 dark:text-green-300"
                             style={{ fontSize: '1.5rem', fontWeight: '900', color: '#166534' }}>
                          {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "N/A"}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400 font-bold">per month</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm">
                        {tenant.leaseStart && tenant.leaseEnd ? (
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                              {formatDate(tenant.leaseStart)}
                            </div>
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                              {formatDate(tenant.leaseEnd)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No lease dates</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`font-medium shadow-sm border-0 ${getStatusColor(tenant.status)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          tenant.status === "active" ? "bg-emerald-500" : 
                          tenant.status === "inactive" ? "bg-red-500" : "bg-amber-500"
                        }`}></span>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end space-x-2">
                        {currentBalance > 0 && (
                          <div className="text-right">
                            <div className="font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(currentBalance.toString())}
                            </div>
                            <div className="text-xs text-gray-500">balance due</div>
                          </div>
                        )}
                        {overduePayments.length > 0 && (
                          <div className="flex items-center space-x-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Overdue</span>
                          </div>
                        )}
                        {currentBalance === 0 && overduePayments.length === 0 && (
                          <div className="text-xs text-gray-500 italic">Up to date</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            paymentForm.setValue("tenantId", tenant.id);
                            paymentForm.setValue("unitId", tenant.unitId || "");
                            paymentForm.setValue("amount", tenant.monthlyRent || "");
                            setIsPaymentDialogOpen(true);
                          }}
                          title="Record Payment"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsViewDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            form.reset({
                              firstName: tenant.firstName,
                              lastName: tenant.lastName,
                              email: tenant.email,
                              phone: tenant.phone,
                              status: tenant.status,
                              unitId: tenant.unitId,
                              leaseStart: tenant.leaseStart ? new Date(tenant.leaseStart) : undefined,
                              leaseEnd: tenant.leaseEnd ? new Date(tenant.leaseEnd) : undefined,
                              monthlyRent: tenant.monthlyRent || "",
                              deposit: tenant.deposit || "",
                            });
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit Tenant"
                        >
                          <Edit className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => deleteTenantMutation.mutate(tenant.id)}
                          title="Delete Tenant"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="1000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Input placeholder="Check, Cash, ACH, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Task description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="administrative">Administrative</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
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
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Tenant Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {selectedTenant?.firstName} {selectedTenant?.lastName} - Tenant Details
              </DialogTitle>
              <div className="flex items-center gap-2 mr-8">

                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTenant) {
                      form.reset({
                        firstName: selectedTenant.firstName,
                        lastName: selectedTenant.lastName,
                        email: selectedTenant.email,
                        phone: selectedTenant.phone,
                        status: selectedTenant.status,
                        unitId: selectedTenant.unitId,
                        leaseStart: selectedTenant.leaseStart ? new Date(selectedTenant.leaseStart) : undefined,
                        leaseEnd: selectedTenant.leaseEnd ? new Date(selectedTenant.leaseEnd) : undefined,
                        monthlyRent: selectedTenant.monthlyRent || "",
                        deposit: selectedTenant.deposit || "",
                      });
                      setIsEditDialogOpen(true);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTenant) {
                      deleteTenantMutation.mutate(selectedTenant.id);
                      setIsViewDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedTenant && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Basic</TabsTrigger>
                <TabsTrigger value="lease">Lease & Screening</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="tasks">Tasks & Communication</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4 ml-[15px] mr-[15px] text-center">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Name:</span>
                        <p className="text-sm">{selectedTenant.firstName} {selectedTenant.lastName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Email:</span>
                        <p className="text-sm">{selectedTenant.email}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground font-bold">Phone:</span>
                        <p className="text-sm">{selectedTenant.phone}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Date of Birth:</span>
                        <p className="text-sm">
                          {selectedTenant.dateOfBirth 
                            ? new Date(selectedTenant.dateOfBirth).toLocaleDateString() 
                            : "Not provided"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <Badge 
                          className={`cursor-pointer ${getStatusColor(selectedTenant.status)}`}
                          onClick={() => handleEditTenantStatus(selectedTenant)}
                        >
                          {selectedTenant.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-center ml-[15px] mr-[15px]">
                    <h3 className="text-lg font-semibold">Unit Assignment</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Unit:</span>
                        <p className="text-sm">{getUnitNumber(selectedTenant.unitId)}</p>
                      </div>
                      {selectedTenant.monthlyRent && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Monthly Rent:</span>
                          <p className="text-sm">{formatCurrency(selectedTenant.monthlyRent)}</p>
                        </div>
                      )}
                      {selectedTenant.deposit && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Security Deposit:</span>
                          <p className="text-sm">{formatCurrency(selectedTenant.deposit)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lease" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Lease Details</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Lease Status:</span>
                          <p className="text-sm">
                            {selectedTenant.leaseStart ? 'Active' : 'No Active Lease'}
                          </p>
                        </div>
                        {selectedTenant.leaseStart && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Start Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.leaseStart)}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedTenant.leaseEnd && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">End Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.leaseEnd)}</p>
                          </div>
                        )}
                        {selectedTenant.monthlyRent && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Monthly Rent:</span>
                            <p className="text-sm">{formatCurrency(selectedTenant.monthlyRent)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Lease Agreement
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBackgroundCheckDialogOpen(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Background Check
                      </Button>
                    </div>
                  </div>
                  
                  {/* Screening Information */}
                  <div className="pt-6 border-t space-y-4">
                    <h3 className="text-lg font-semibold">Screening & Background</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Application Status</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Application Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Credit Score:</span>
                            <p className="text-sm">
                              {selectedTenant.creditScore || "Not available"}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Income Verification:</span>
                            <Badge variant={selectedTenant.incomeVerified ? "default" : "secondary"}>
                              {selectedTenant.incomeVerified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Background Check</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Criminal Background:</span>
                            <Badge variant={selectedTenant.backgroundCheckStatus === "clear" ? "default" : "destructive"}>
                              {selectedTenant.backgroundCheckStatus || "Pending"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">References:</span>
                            <p className="text-sm">
                              {selectedTenant.referencesVerified ? "Verified" : "Pending verification"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {getCurrentMonthBalance(selectedTenant.id) > 0 && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Current Balance</p>
                            <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                              {formatCurrency(getCurrentMonthBalance(selectedTenant.id).toString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {getOverduePayments(selectedTenant.id).length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Overdue Payments</p>
                            <p className="text-lg font-bold text-red-800 dark:text-red-200">
                              {getOverduePayments(selectedTenant.id).length} payment(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="screening" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Background Screening</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Credit Check</h4>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        Pending
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Criminal Background</h4>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        Pending
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setIsBackgroundCheckDialogOpen(true)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Screening
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="communication" className="space-y-4">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No messages yet</p>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                {/* Tasks Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Tasks</h3>
                    <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Task
                    </Button>
                  </div>
                  
                  {(() => {
                    const tenantTasks = tasks?.filter(task => task.tenantId === selectedTenant.id) || [];
                    return tenantTasks.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No tasks assigned to this tenant yet</p>
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(true)}>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {tenantTasks.map((task) => (
                          <Card key={task.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{task.title}</h4>
                                  <Badge className={
                                    task.priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" :
                                    task.priority === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400" :
                                    task.priority === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  }>
                                    {task.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="capitalize">{task.category}</span>
                                  {task.dueDate && (
                                    <span>Due: {formatDate(task.dueDate)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  task.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" :
                                  task.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" :
                                  task.status === "cancelled" ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" :
                                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                }>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Communication Section */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Communication</h3>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Send Message
                    </Button>
                  </div>
                  
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No messages yet</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Tenant
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.unitNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leaseStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leaseEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent</FormLabel>
                      <FormControl>
                        <Input placeholder="1200.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit</FormLabel>
                      <FormControl>
                        <Input placeholder="1200.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending ? "Updating..." : "Update Tenant"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Background Check Dialog */}
      <Dialog open={isBackgroundCheckDialogOpen} onOpenChange={setIsBackgroundCheckDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Background Check - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Background Check Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Credit Check</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
                    <span className="text-sm font-medium">--</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Criminal Background</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Clear:</span>
                    <span className="text-sm font-medium">--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Verification */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Employment Verification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employer</label>
                  <Input placeholder="Company name" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                  <Input placeholder="Job title" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Income</label>
                  <Input placeholder="$0.00" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employment Length</label>
                  <Input placeholder="2 years" className="mt-1" />
                </div>
              </div>
            </div>

            {/* References */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">References</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Landlord</label>
                    <Input placeholder="Name" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <Input placeholder="(555) 123-4567" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="unable_to_reach">Unable to Reach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Screening Notes</h4>
              <Textarea 
                placeholder="Add notes about the background check process, findings, or any special considerations..."
                className="min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Request Credit Report
                </Button>
                <Button variant="outline" size="sm">
                  Run Background Check
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBackgroundCheckDialogOpen(false)}
                >
                  Close
                </Button>
                <Button>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Tenant History Dialog */}
      <Dialog open={isTenantHistoryDialogOpen} onOpenChange={setIsTenantHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tenant History - Unit {selectedUnitForHistory?.unitNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {tenantHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Tenant History
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No historical tenant data is available for this unit.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Previous Tenants ({tenantHistory.length})
                </h4>
                <div className="grid gap-4">
                  {tenantHistory.map((history) => (
                    <Card key={history.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {history.tenantName}
                          </h5>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Move In: {formatDate(history.moveInDate)}
                              </span>
                              {history.moveOutDate && (
                                <span>
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  Move Out: {formatDate(history.moveOutDate)}
                                </span>
                              )}
                            </div>
                            {history.monthlyRent && (
                              <div>
                                <DollarSign className="h-4 w-4 inline mr-1" />
                                Monthly Rent: {formatCurrency(history.monthlyRent.toString())}
                              </div>
                            )}
                            {history.securityDeposit && (
                              <div>
                                Security Deposit: {formatCurrency(history.securityDeposit.toString())}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={
                              history.moveOutReason === 'lease_expired' ? 'bg-green-100 text-green-800' :
                              history.moveOutReason === 'eviction' ? 'bg-red-100 text-red-800' :
                              history.moveOutReason === 'early_termination' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {history.moveOutReason ? history.moveOutReason.replace('_', ' ') : 'Current'}
                          </Badge>
                        </div>
                      </div>
                      {history.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Notes:</strong> {history.notes}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Tenant Status Edit Dialog */}
      <Dialog open={isTenantStatusDialogOpen} onOpenChange={setIsTenantStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tenant Status</DialogTitle>
          </DialogHeader>
          <Form {...tenantStatusForm}>
            <form onSubmit={tenantStatusForm.handleSubmit(onTenantStatusSubmit)} className="space-y-4">
              <FormField
                control={tenantStatusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="moved">Moved Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tenantStatusForm.watch("status") === "moved" && (
                <>
                  <FormField
                    control={tenantStatusForm.control}
                    name="moveOutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Move Out Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={tenantStatusForm.control}
                    name="moveOutReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Move Out Reason</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lease_expired">Lease Expired</SelectItem>
                            <SelectItem value="early_termination">Early Termination</SelectItem>
                            <SelectItem value="eviction">Eviction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTenantStatusDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantStatusMutation.isPending}>
                  {updateTenantStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}