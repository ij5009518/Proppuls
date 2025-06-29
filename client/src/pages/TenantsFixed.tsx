import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, Upload, FileText, DollarSign, Calendar, Clock, AlertTriangle, CheckSquare } from "lucide-react";
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
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
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
      priority: "medium",
      status: "pending",
      category: "general",
      dueDate: new Date(),
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
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
          >
            <List className="h-4 w-4" />
          </Button>
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
                className="relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 group"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setIsViewDialogOpen(true);
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {tenant.firstName} {tenant.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                      <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                      {(overduePayments.length > 0 || currentBalance > 0) && (
                        <div className="flex gap-1">
                          {overduePayments.length > 0 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          {currentBalance > 0 && (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unit:</span>
                      <span className="text-sm font-medium">{getUnitNumber(tenant.unitId)}</span>
                    </div>
                    
                    {tenant.monthlyRent && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                        <span className="text-sm font-medium">{formatCurrency(tenant.monthlyRent)}</span>
                      </div>
                    )}

                    {currentBalance > 0 && (
                      <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">Balance:</span>
                        <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                          {formatCurrency(currentBalance.toString())}
                        </span>
                      </div>
                    )}

                    {overduePayments.length > 0 && (
                      <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="text-sm text-red-700 dark:text-red-300">Overdue:</span>
                        <span className="text-sm font-bold text-red-700 dark:text-red-300">
                          {overduePayments.length} payment(s)
                        </span>
                      </div>
                    )}

                    {/* Quick Action Icons */}
                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateTask(tenant);
                          }}
                          title="Create Task"
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        >
                          <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTenant(tenant);
                            paymentForm.setValue("tenantId", tenant.id);
                            paymentForm.setValue("unitId", tenant.unitId || "");
                            paymentForm.setValue("amount", tenant.monthlyRent || "");
                            setIsPaymentDialogOpen(true);
                          }}
                          title="Record Payment"
                          className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/20"
                        >
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTenant(tenant);
                            setIsViewDialogOpen(true);
                          }}
                          title="View Details"
                          className="h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                        >
                          <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
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
                          className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/20"
                        >
                          <Edit className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTenantMutation.mutate(tenant.id);
                        }}
                        title="Delete Tenant"
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
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
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={taskForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
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
                            <SelectValue />
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter assignee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attach Document</label>
                <div className="flex items-center">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

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
    </div>
  );
}