import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Search, Plus, Edit, DollarSign, Mail, Phone, Calendar, History, Building, Users } from "lucide-react";
import type { Tenant, Unit, Property, RentPayment, Task } from "../../shared/schema";
import { insertTaskSchema, insertRentPaymentSchema } from "../../shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type InsertTask = z.infer<typeof insertTaskSchema>;
type InsertRentPayment = z.infer<typeof insertRentPaymentSchema>;

const paymentSchema = insertRentPaymentSchema.omit({ id: true, createdAt: true, updatedAt: true });

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddTenantDialogOpen, setIsAddTenantDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: tenantHistory } = useQuery({
    queryKey: ["/api/tenant-history"],
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "cash",
      status: "completed",
      notes: "",
    },
  });

  const taskForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      dueDate: new Date(),
      assignedTo: "",
      category: "maintenance",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: z.infer<typeof paymentSchema>) => apiRequest("POST", "/api/rent-payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({ title: "Success", description: "Payment recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onPaymentSubmit = (data: z.infer<typeof paymentSchema>) => {
    if (!selectedTenant) return;
    
    const taskData: InsertTask = {
      ...data,
      tenantId: selectedTenant.id,
      amount: parseFloat(data.amount),
    };
    createPaymentMutation.mutate(taskData);
  };

  const onTaskSubmit = (data: InsertTask) => {
    if (!selectedTenant) return;

    const taskData: InsertTask = {
      ...data,
      propertyId: selectedTenant.unitId,
      tenantId: selectedTenant.id,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleRecordPayment = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsPaymentDialogOpen(true);
  };

  const handleCreateTask = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    taskForm.setValue("title", `Task for ${tenant.firstName} ${tenant.lastName}`);
    setIsTaskDialogOpen(true);
  };

  const handleViewTenantHistory = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsHistoryDialogOpen(true);
  };

  const handleEditTenantStatus = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUnitNumber = (unitId: string) => {
    if (!units) return "N/A";
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit ? unit.unitNumber : "N/A";
  };

  const getPropertyName = (unitId: string) => {
    if (!units || !properties) return "N/A";
    const unit = units.find((u: Unit) => u.id === unitId);
    if (!unit) return "N/A";
    const property = properties.find((p: Property) => p.id === unit.propertyId);
    return property ? property.name : "N/A";
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
    return rentPayments.filter((p: RentPayment) => 
      p.tenantId === tenantId && p.status === "overdue"
    );
  };

  const filteredTenants = tenants?.filter((tenant: Tenant) =>
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (tenantsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tenants...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your property tenants and their information</p>
        </div>
        <Button onClick={() => setIsAddTenantDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{tenants?.length || 0}</p>
                <p className="text-xs text-gray-600">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{units?.filter((u: Unit) => u.status === "occupied").length || 0}</p>
                <p className="text-xs text-gray-600">Occupied Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">
                  {tenants ? formatCurrency(tenants.reduce((sum: number, t: Tenant) => sum + (t.monthlyRent || 0), 0)) : "$0"}
                </p>
                <p className="text-xs text-gray-600">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {rentPayments?.filter((p: RentPayment) => p.status === "overdue").length || 0}
                </p>
                <p className="text-xs text-gray-600">Overdue Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tenants Table */}
      {filteredTenants && filteredTenants.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Active Tenants ({filteredTenants.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-6">
              {/* Modern Card-Based Layout */}
              <div className="grid gap-6 p-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-2xl font-bold mb-2">Tenant Overview</h3>
                  <p className="text-blue-100">Detailed information for all active tenants</p>
                </div>
              </div>

              {/* Table with New Layout */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                      <TableHead className="py-4 px-6 text-left font-bold" style={{ fontSize: '1.1rem', color: '#374151' }}>
                        TENANT & CONTACT
                      </TableHead>
                      <TableHead className="py-4 px-6 text-center font-bold" style={{ fontSize: '1.1rem', color: '#374151' }}>
                        UNIT & PROPERTY
                      </TableHead>
                      <TableHead className="py-4 px-6 text-center font-bold" style={{ fontSize: '1.1rem', color: '#374151' }}>
                        RENT & FINANCES
                      </TableHead>
                      <TableHead className="py-4 px-6 text-center font-bold" style={{ fontSize: '1.1rem', color: '#374151' }}>
                        STATUS & ACTIONS
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
                          className={`transition-all duration-200 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700 ${
                            index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/50'
                          }`}
                        >
                          {/* TENANT & CONTACT COLUMN */}
                          <TableCell className="py-6 px-6">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-14 h-14 border-2 border-blue-200 shadow-md">
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg">
                                  {tenant.firstName[0]}{tenant.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1f2937' }} className="mb-2">
                                  {tenant.firstName} {tenant.lastName}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Mail className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                                    <span className="truncate" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                      {tenant.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                      {tenant.phone}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* UNIT & PROPERTY COLUMN */}
                          <TableCell className="py-6 px-6 text-center">
                            <div className="space-y-3">
                              <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg border-2 border-blue-200"
                                   style={{ width: '3rem', height: '3rem', fontSize: '1.2rem', fontWeight: '800', color: '#1e40af' }}>
                                {getUnitNumber(tenant.unitId)}
                              </div>
                              <div>
                                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }} className="mb-1">
                                  {getPropertyName(tenant.unitId)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {tenant.leaseStart && tenant.leaseEnd ? (
                                    <div>
                                      <div>{format(new Date(tenant.leaseStart), 'MMM dd, yyyy')}</div>
                                      <div>to {format(new Date(tenant.leaseEnd), 'MMM dd, yyyy')}</div>
                                    </div>
                                  ) : (
                                    "No lease dates"
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* RENT & FINANCES COLUMN */}
                          <TableCell className="py-6 px-6 text-center">
                            <div className="space-y-3">
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 border border-green-200">
                                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>
                                  {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "N/A"}
                                </div>
                                <div className="text-xs text-green-600 font-semibold">Monthly Rent</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-sm">
                                  <span className="text-gray-500 text-xs">Balance: </span>
                                  <span className={currentBalance > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                    {formatCurrency(Math.abs(currentBalance))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* STATUS & ACTIONS COLUMN */}
                          <TableCell className="py-6 px-6 text-center">
                            <div className="space-y-3">
                              <Badge variant={overduePayments.length > 0 ? "destructive" : "default"} className="mb-2">
                                {overduePayments.length > 0 ? "Overdue" : "Current"}
                              </Badge>
                              <div className="flex flex-col space-y-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRecordPayment(tenant)}
                                  className="text-xs h-7 w-full"
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Payment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCreateTask(tenant)}
                                  className="text-xs h-7 w-full"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Task
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditTenantStatus(tenant)}
                                  className="text-xs h-7 w-full"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first tenant</p>
            <Button onClick={() => setIsAddTenantDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </CardContent>
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
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </FormControl>
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
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Payment notes..." />
                    </FormControl>
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
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title..." />
                    </FormControl>
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
                      <Input {...field} placeholder="Task description..." />
                    </FormControl>
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
    </div>
  );
}