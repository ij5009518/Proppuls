import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Home, Users, CheckSquare, Eye, Edit, Trash2, UserPlus, Building2, Calendar, Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Unit, Property, Tenant, Task, InsertUnit, InsertTask } from "@shared/schema";

// Validation schemas
const unitSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  bedrooms: z.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.string().min(1, "Bathrooms is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  status: z.enum(["vacant", "occupied", "maintenance"]),
  squareFootage: z.number().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["general", "maintenance", "inspection", "lease", "payment", "vendor", "legal", "administrative"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

const assignTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant selection is required"),
  moveInDate: z.string().min(1, "Move-in date is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  depositAmount: z.string().optional(),
  leaseEndDate: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type AssignTenantFormData = z.infer<typeof assignTenantSchema>;

function formatCurrency(amount: number | string) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString();
}

export default function Units() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignTenantDialogOpen, setIsAssignTenantDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Forms
  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      propertyId: "",
      unitNumber: "",
      bedrooms: 0,
      bathrooms: "",
      rentAmount: "",
      status: "vacant",
      squareFootage: undefined,
    },
  });

  const editForm = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      propertyId: "",
      unitNumber: "",
      bedrooms: 0,
      bathrooms: "",
      rentAmount: "",
      status: "vacant",
      squareFootage: undefined,
    },
  });

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      dueDate: "",
    },
  });

  const assignTenantForm = useForm<AssignTenantFormData>({
    resolver: zodResolver(assignTenantSchema),
    defaultValues: {
      tenantId: "",
      moveInDate: "",
      monthlyRent: "",
      depositAmount: "",
      leaseEndDate: "",
    },
  });

  // Mutations
  const createUnitMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Success", description: "Unit created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Unit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Success", description: "Unit updated successfully" });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Success", description: "Unit deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task created successfully" });
      setIsTaskDialogOpen(false);
      taskForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: async (data: { unitId: string; tenantData: any }) =>
      apiRequest("POST", `/api/units/${data.unitId}/assign-tenant`, data.tenantData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "Tenant assigned successfully" });
      setIsAssignTenantDialogOpen(false);
      assignTenantForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Event handlers
  const onCreateSubmit = (data: UnitFormData) => {
    const unitData: InsertUnit = {
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      rentAmount: data.rentAmount,
      status: data.status,
      squareFootage: data.squareFootage || null,
    };
    createUnitMutation.mutate(unitData);
  };

  const onEditSubmit = (data: UnitFormData) => {
    if (!selectedUnit) return;
    updateUnitMutation.mutate({
      id: selectedUnit.id,
      data: {
        propertyId: data.propertyId,
        unitNumber: data.unitNumber,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        rentAmount: data.rentAmount,
        status: data.status,
        squareFootage: data.squareFootage || null,
      },
    });
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    editForm.reset({
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rentAmount: unit.rentAmount || "",
      status: unit.status,
      squareFootage: unit.squareFootage || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsViewDialogOpen(true);
  };

  const onTaskSubmit = (data: TaskFormData) => {
    if (!selectedUnit) return;
    
    const taskData: InsertTask = {
      title: data.title,
      description: data.description || "",
      category: data.category,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assignedTo || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      unitId: selectedUnit.id,
      propertyId: selectedUnit.propertyId,
    };
    createTaskMutation.mutate(taskData);
  };

  const onAssignTenantSubmit = (data: AssignTenantFormData) => {
    if (!selectedUnit) return;
    
    assignTenantMutation.mutate({
      unitId: selectedUnit.id,
      tenantData: {
        tenantId: data.tenantId,
        moveInDate: new Date(data.moveInDate),
        monthlyRent: parseFloat(data.monthlyRent),
        depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : null,
        leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate) : null,
      },
    });
  };

  // Get available tenants (not currently assigned to any unit)
  const getAvailableTenants = () => {
    const assignedTenantIds = units
      .filter(unit => unit.status === "occupied")
      .map(unit => {
        const currentTenant = tenants.find(t => t.unitId === unit.id && !t.moveOutDate);
        return currentTenant?.id;
      })
      .filter(Boolean);

    return tenants.filter(tenant => !assignedTenantIds.includes(tenant.id));
  };

  const availableTenants = getAvailableTenants();

  if (unitsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage your rental units</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Unit</DialogTitle>
              <DialogDescription>Add a new rental unit to your property portfolio.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Property</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map((property: Property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
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
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input placeholder="1.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="$1,200" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="squareFootage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="850"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUnitMutation.isPending}>
                    {createUnitMutation.isPending ? "Creating..." : "Create Unit"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {units.map((unit: Unit) => {
          const property = properties.find((p: Property) => p.id === unit.propertyId);
          const currentTenant = tenants.find((t: Tenant) => t.unitId === unit.id && !t.moveOutDate);
          
          return (
            <Card key={unit.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Unit {unit.unitNumber}
                    </CardTitle>
                    <CardDescription>{property?.name}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      unit.status === "occupied" ? "default" :
                      unit.status === "vacant" ? "secondary" : "destructive"
                    }
                  >
                    {unit.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bedrooms/Bathrooms</span>
                    <span className="text-sm font-medium">{unit.bedrooms}BR / {unit.bathrooms}BA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Rent</span>
                    <span className="text-sm font-medium">
                      {unit.rentAmount ? formatCurrency(parseFloat(unit.rentAmount)) : 'N/A'}
                    </span>
                  </div>
                  {unit.squareFootage && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Square Feet</span>
                      <span className="text-sm font-medium">{unit.squareFootage} sq ft</span>
                    </div>
                  )}
                  {currentTenant && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Tenant</span>
                      <span className="text-sm font-medium">{currentTenant.firstName} {currentTenant.lastName}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleView(unit)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(unit)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteUnitMutation.mutate(unit.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Unit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Unit {selectedUnit?.unitNumber} Details
            </DialogTitle>
          </DialogHeader>
          {selectedUnit && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tenants">Tenant History</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Unit Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Property</p>
                      <p>{properties.find(p => p.id === selectedUnit.propertyId)?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unit Number</p>
                      <p>{selectedUnit.unitNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bedrooms</p>
                      <p>{selectedUnit.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bathrooms</p>
                      <p>{selectedUnit.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rent Amount</p>
                      <p>{selectedUnit.rentAmount ? formatCurrency(parseFloat(selectedUnit.rentAmount)) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={
                        selectedUnit.status === "occupied" ? "default" :
                        selectedUnit.status === "vacant" ? "secondary" : "destructive"
                      }>
                        {selectedUnit.status}
                      </Badge>
                    </div>
                    {selectedUnit.squareFootage && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Square Footage</p>
                        <p>{selectedUnit.squareFootage} sq ft</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tenants" className="space-y-4">
                {(() => {
                  const unitTenants = tenants.filter(tenant => tenant.unitId === selectedUnit.id);
                  const currentTenants = unitTenants.filter(tenant => !tenant.moveOutDate);
                  const pastTenants = unitTenants.filter(tenant => tenant.moveOutDate);

                  return (
                    <div className="space-y-6">
                      {/* Current Tenants */}
                      {currentTenants.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-lg">Current Tenant</h4>
                          </div>
                          <div className="grid gap-4">
                            {currentTenants.map(tenant => (
                              <Card key={tenant.id}>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Name</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.firstName} {tenant.lastName}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Email</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Phone</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Move In Date</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.moveInDate ? formatDate(tenant.moveInDate) : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Monthly Rent</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.monthlyRent ? formatCurrency(parseFloat(tenant.monthlyRent)) : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Lease End Date</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.leaseEndDate ? formatDate(tenant.leaseEndDate) : 'N/A'}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Past Tenants */}
                      {pastTenants.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-lg mb-4">Tenant History</h4>
                          <div className="grid gap-4">
                            {pastTenants.map(tenant => (
                              <Card key={tenant.id} className="opacity-75">
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Name</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.firstName} {tenant.lastName}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Email</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Move In Date</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.moveInDate ? formatDate(tenant.moveInDate) : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Move Out Date</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.moveOutDate ? formatDate(tenant.moveOutDate) : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Monthly Rent</p>
                                      <p className="text-gray-900 dark:text-gray-100">{tenant.monthlyRent ? formatCurrency(parseFloat(tenant.monthlyRent)) : 'N/A'}</p>
                                    </div>
                                    {tenant.reasonForLeaving && (
                                      <div>
                                        <p className="text-gray-500 dark:text-gray-400">Reason for Leaving</p>
                                        <p className="text-gray-900 dark:text-gray-100">{tenant.reasonForLeaving}</p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No tenants */}
                      {unitTenants.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">No tenant history available for this unit</p>
                          <Button 
                            variant="outline"
                            onClick={() => setIsAssignTenantDialogOpen(true)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Assign First Tenant
                          </Button>
                        </div>
                      )}

                      {/* Assign tenant button for vacant units */}
                      {currentTenants.length === 0 && unitTenants.length > 0 && (
                        <div className="text-center pt-4">
                          <Button 
                            variant="outline"
                            onClick={() => setIsAssignTenantDialogOpen(true)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign New Tenant
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-4">
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No maintenance requests yet</p>
                  <Button variant="outline">
                    <Wrench className="h-4 w-4 mr-2" />
                    Add Maintenance Request
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                {(() => {
                  const unitTasks = tasks?.filter(task => task.unitId === selectedUnit.id) || [];
                  return unitTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No tasks assigned to this unit yet</p>
                      <Button variant="outline" onClick={() => setIsTaskDialogOpen(true)}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Unit Tasks</h4>
                        <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Create Task
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        {unitTasks.map((task) => (
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
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property: Property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input placeholder="1.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="$1,200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="squareFootage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Footage (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="850"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
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
                <Button type="submit" disabled={updateUnitMutation.isPending}>
                  {updateUnitMutation.isPending ? "Updating..." : "Update Unit"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Task for Unit {selectedUnit?.unitNumber}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Fix leaky faucet" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="lease">Lease</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Person or vendor name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

      {/* Assign Tenant Dialog */}
      <Dialog open={isAssignTenantDialogOpen} onOpenChange={setIsAssignTenantDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Tenant to Unit {selectedUnit?.unitNumber}</DialogTitle>
          </DialogHeader>
          <Form {...assignTenantForm}>
            <form onSubmit={assignTenantForm.handleSubmit(onAssignTenantSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assignTenantForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Select Tenant</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose available tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTenants.map((tenant: Tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName} - {tenant.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTenantForm.control}
                  name="moveInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Move-in Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTenantForm.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent</FormLabel>
                      <FormControl>
                        <Input placeholder="1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTenantForm.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignTenantForm.control}
                  name="leaseEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAssignTenantDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignTenantMutation.isPending}>
                  {assignTenantMutation.isPending ? "Assigning..." : "Assign Tenant"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}