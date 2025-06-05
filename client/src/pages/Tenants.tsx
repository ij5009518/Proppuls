import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, Upload, FileText, DollarSign, Calendar, Clock, AlertTriangle, CheckSquare, Shield, MessageSquare } from "lucide-react";
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
import type { Tenant, InsertTenant, Unit, RentPayment, InsertRentPayment, Task, InsertTask } from "@shared/schema";

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
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: rentPayments } = useQuery({
    queryKey: ["/api/rent-payments"],
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

  const filteredTenants = tenants?.filter((tenant: Tenant) =>
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getUnitNumber = (unitId?: string) => {
    if (!unitId || !units) return "N/A";
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit?.unitNumber || "N/A";
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
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header with name and status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(tenant.monthlyRent)}/month
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 w-16">Email:</span>
                        <span className="text-gray-900 dark:text-white">{tenant.email}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 w-16">Phone:</span>
                        <span className="text-gray-900 dark:text-white">{tenant.phone}</span>
                      </div>
                    </div>

                    {/* Lease Information */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => {
                const currentBalance = getCurrentMonthBalance(tenant.id);
                const overduePayments = getOverduePayments(tenant.id);
                
                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.firstName} {tenant.lastName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{tenant.email}</div>
                        <div className="text-muted-foreground">{tenant.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getUnitNumber(tenant.unitId)}</TableCell>
                    <TableCell>{tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {currentBalance > 0 && (
                          <span className="text-yellow-600">{formatCurrency(currentBalance.toString())}</span>
                        )}
                        {overduePayments.length > 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateTask(tenant)}
                          title="Create Task"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            paymentForm.setValue("tenantId", tenant.id);
                            paymentForm.setValue("unitId", tenant.unitId || "");
                            paymentForm.setValue("amount", tenant.monthlyRent || "");
                            setIsPaymentDialogOpen(true);
                          }}
                          title="Record Payment"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTenantMutation.mutate(tenant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    if (selectedTenant) handleCreateTask(selectedTenant);
                  }}
                  title="Create Task"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Create Task
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTenant) {
                      paymentForm.setValue("tenantId", selectedTenant.id);
                      paymentForm.setValue("unitId", selectedTenant.unitId || "");
                      paymentForm.setValue("amount", selectedTenant.monthlyRent || "");
                      setIsPaymentDialogOpen(true);
                    }
                  }}
                  title="Record Payment"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="lease">Lease</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="screening">Screening</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Contact Information</h3>
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
                        <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                        <p className="text-sm">{selectedTenant.phone}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(selectedTenant.status)}>
                          {selectedTenant.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
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
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Lease Agreement
                    </Button>
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
    </div>
  );
}