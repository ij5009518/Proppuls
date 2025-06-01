
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
  assignedTo: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  vendorId: z.string().optional(),
  dueDate: z.date(),
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

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Tenant>) => 
      apiRequest(`/api/tenants/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "Tenant updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tenant", variant: "destructive" });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tenants/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "Tenant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenant", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task created successfully" });
      setIsTaskDialogOpen(false);
      taskForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      status: "active",
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
      dueDate: new Date(),
      paymentMethod: "",
      notes: "",
      lateFeeAmount: "0",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "tenant_request",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      propertyId: "",
      unitId: "",
      tenantId: "",
      vendorId: "",
      dueDate: new Date(),
    },
  });

  const onSubmit = (values: any) => {
    // Convert undefined to null for backend compatibility
    const formattedData = {
      ...values,
      unitId: values.unitId || null,
      leaseStart: values.leaseStart || null,
      leaseEnd: values.leaseEnd || null,
      monthlyRent: values.monthlyRent || null,
      deposit: values.deposit || null,
    };
    createTenantMutation.mutate(formattedData);
  };

  const onEditSubmit = (values: any) => {
    if (!selectedTenant) return;
    
    const formattedData = {
      ...values,
      unitId: values.unitId || null,
      leaseStart: values.leaseStart || null,
      leaseEnd: values.leaseEnd || null,
      monthlyRent: values.monthlyRent || null,
      deposit: values.deposit || null,
    };
    
    updateTenantMutation.mutate({ id: selectedTenant.id, ...formattedData });
  };

  const onPaymentSubmit = (values: any) => {
    // Automatically determine status based on payment date and due date
    const now = new Date();
    const dueDate = new Date(values.dueDate);
    let status = "pending";
    
    if (values.paidDate) {
      status = "paid";
    } else if (now > dueDate) {
      status = "overdue";
    }
    
    const paymentData = {
      ...values,
      status,
      amount: parseFloat(values.amount),
      lateFeeAmount: parseFloat(values.lateFeeAmount) || 0,
    };
    
    createPaymentMutation.mutate(paymentData);
  };

  const onTaskSubmit = (values: any) => {
    const taskData: InsertTask = {
      title: values.title,
      description: values.description,
      category: values.category,
      priority: values.priority,
      status: values.status,
      assignedTo: values.assignedTo || undefined,
      propertyId: values.propertyId || undefined,
      unitId: values.unitId || undefined,
      tenantId: values.tenantId || undefined,
      vendorId: values.vendorId || undefined,
      dueDate: new Date(values.dueDate),
    };
    
    createTaskMutation.mutate(taskData);
  };

  const filteredTenants = (tenants as any[])?.filter((tenant: any) =>
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getUnitNumber = (unitId: string | null) => {
    if (!unitId) return "No unit assigned";
    const unit = (units as any[])?.find((u: any) => u.id === unitId);
    return unit ? `Unit ${unit.unitNumber}` : "Unknown unit";
  };

  const getPropertyId = (unitId: string | null) => {
    if (!unitId) return null;
    const unit = (units as any[])?.find((u: any) => u.id === unitId);
    return unit?.propertyId || null;
  };

  const getTenantPayments = (tenantId: string) => {
    return (rentPayments as any[])?.filter((payment: any) => payment.tenantId === tenantId) || [];
  };

  const handleCreateTask = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    taskForm.reset({
      title: "",
      description: "",
      category: "tenant_request",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      propertyId: getPropertyId(tenant.unitId) || "",
      unitId: tenant.unitId || "",
      tenantId: tenant.id,
      vendorId: "",
      dueDate: new Date(),
      estimatedCost: "",
      actualCost: "",
    });
    setIsTaskDialogOpen(true);
  };

  const getOverduePayments = (tenantId: number) => {
    const payments = getTenantPayments(tenantId);
    const now = new Date();
    return payments.filter(payment => 
      payment.status === "pending" && 
      new Date(payment.dueDate) < now
    );
  };

  const getCurrentMonthBalance = (tenantId: number) => {
    const payments = getTenantPayments(tenantId);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.dueDate);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    const totalDue = currentMonthPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount), 0
    );
    
    const totalPaid = currentMonthPayments
      .filter(payment => payment.status === "paid")
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    return totalDue - totalPaid;
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
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="lease">Lease Details</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
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
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
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
                                  <SelectItem value="moved_out">Moved Out</SelectItem>
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
                          name="emergencyContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyContactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 987-6543" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="lease" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="unitId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units?.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id.toString()}>
                                    Unit {unit.unitNumber} - {formatCurrency(unit.rentAmount)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                          name="securityDeposit"
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

                      <FormField
                        control={form.control}
                        name="moveInDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Move-in Date</FormLabel>
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
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label htmlFor="photo-id" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload Photo ID
                              </span>
                            </label>
                            <input id="photo-id" name="photo-id" type="file" className="sr-only" accept="image/*" />
                          </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <FileText className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label htmlFor="lease-document" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload Lease Document
                              </span>
                            </label>
                            <input id="lease-document" name="lease-document" type="file" className="sr-only" accept=".pdf,.doc,.docx" />
                          </div>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any additional notes about the tenant..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

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
              <Card key={tenant.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tenant.firstName} {tenant.lastName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                      <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                    </div>
                    <Badge className={getStatusColor(tenant.status)}>
                      {tenant.status}
                    </Badge>
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
                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-sm text-yellow-700">Current Balance:</span>
                        <span className="text-sm font-bold text-yellow-700">{formatCurrency(currentBalance.toString())}</span>
                      </div>
                    )}

                    {overduePayments.length > 0 && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{overduePayments.length} overdue payment(s)</span>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
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
                          paymentForm.setValue("unitId", tenant.unitId || 0);
                          paymentForm.setValue("propertyId", getPropertyId(tenant.unitId) || 0);
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
                        {overduePayments.length > 0 && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">{overduePayments.length} overdue</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{tenant.email}</div>
                        <div className="text-muted-foreground">{tenant.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getUnitNumber(tenant.unitId)}</TableCell>
                    <TableCell>{tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {currentBalance > 0 ? (
                        <span className="font-medium text-yellow-600">
                          {formatCurrency(currentBalance.toString())}
                        </span>
                      ) : (
                        <span className="text-green-600">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
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
                            paymentForm.setValue("unitId", tenant.unitId || 0);
                            paymentForm.setValue("propertyId", getPropertyId(tenant.unitId) || 0);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Tenant: {selectedTenant?.firstName} {selectedTenant?.lastName}
              </div>

              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="1200.00" {...field} />
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
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="lease">Lease Details</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
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
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
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
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="lease" className="space-y-4">
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
                            {(units as any[])?.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                Unit {unit.unitNumber} - {unit.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <Input type="number" placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="securityDeposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="moveInDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Move-in Date</FormLabel>
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
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Upload Lease Documents</p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop files here, or click to browse
                        </p>
                      </div>
                      <Input type="file" className="hidden" multiple />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any additional notes about the tenant..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

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

      {/* View Tenant Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="lease">Lease Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTenant.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTenant.lastName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTenant.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTenant.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.dateOfBirth ? formatDate(selectedTenant.dateOfBirth) : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <Badge className={`${getStatusColor(selectedTenant.status)} mt-1`}>
                      {selectedTenant.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Name</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.emergencyContactName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Phone</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.emergencyContactPhone || "Not provided"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lease" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
                    <p className="text-sm text-muted-foreground mt-1">{getUnitNumber(selectedTenant.unitId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.monthlyRent ? formatCurrency(selectedTenant.monthlyRent) : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lease Start</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.leaseStart ? formatDate(selectedTenant.leaseStart) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lease End</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.leaseEnd ? formatDate(selectedTenant.leaseEnd) : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Deposit</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.securityDeposit ? formatCurrency(selectedTenant.securityDeposit) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Move-in Date</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTenant.moveInDate ? formatDate(selectedTenant.moveInDate) : "Not set"}
                    </p>
                  </div>
                </div>

                {selectedTenant.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      {selectedTenant.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    <FileText className="mx-auto h-12 w-12 mb-2" />
                    <p>Document management coming soon</p>
                    <p className="text-sm">Lease agreements, ID copies, and other tenant documents will be stored here</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Task for {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="tenant_request">Tenant Request</SelectItem>
                          <SelectItem value="admin">Administrative</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
                        <Input
                          type="date"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
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
                      <FormLabel>Assigned To (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Person assigned to task" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={taskForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Recurring Task</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {taskForm.watch("isRecurring") && (
                  <FormField
                    control={taskForm.control}
                    name="recurrencePeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence Period</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
