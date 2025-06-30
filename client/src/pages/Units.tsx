import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, CheckSquare, Home, Bed, Bath, Maximize, DollarSign, Users, FileText, Wrench, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Unit, InsertUnit, Property, Tenant, Task, InsertTask } from "@shared/schema";
import TaskDetails from "./TaskDetails";

const unitSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  bedrooms: z.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.string().min(1, "Bathrooms is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  status: z.string().min(1, "Status is required"),
  squareFootage: z.number().optional(),
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
});

const assignTenantSchema = z.object({
  tenantId: z.string().min(1, "Please select a tenant"),
});

const tenantStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  moveOutDate: z.string().optional(),
  moveOutReason: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type AssignTenantFormData = z.infer<typeof assignTenantSchema>;
type TenantStatusFormData = z.infer<typeof tenantStatusSchema>;

export default function Units() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTenantHistoryDialogOpen, setIsTenantHistoryDialogOpen] = useState(false);
  const [selectedUnitForHistory, setSelectedUnitForHistory] = useState<Unit | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignTenantDialogOpen, setIsAssignTenantDialogOpen] = useState(false);
  const [isTenantStatusDialogOpen, setIsTenantStatusDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: tenantHistory = [] } = useQuery({
    queryKey: ["/api/tenant-history"],
    enabled: isTenantHistoryDialogOpen,
  });

  const createForm = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      propertyId: "",
      unitNumber: "",
      bedrooms: 1,
      bathrooms: "1",
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
      bedrooms: 1,
      bathrooms: "1",
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
      priority: "medium",
      status: "pending",
      category: "general",
      dueDate: "",
      assignedTo: "",
    },
  });

  const assignTenantForm = useForm<AssignTenantFormData>({
    resolver: zodResolver(assignTenantSchema),
    defaultValues: {
      tenantId: "",
    },
  });

  const tenantStatusForm = useForm<TenantStatusFormData>({
    resolver: zodResolver(tenantStatusSchema),
    defaultValues: {
      status: "",
      moveOutDate: "",
      moveOutReason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Unit created successfully" });
    },
    onError: (error: any) => {
      console.error("Create unit error:", error);
      toast({ title: "Failed to create unit", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertUnit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsEditDialogOpen(false);
      setSelectedUnit(null);
      toast({ title: "Unit updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update unit", variant: "destructive" });
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: ({ tenantId, unitId }: { tenantId: string; unitId: string }) =>
      apiRequest("PATCH", `/api/tenants/${tenantId}`, { unitId }),
    onSuccess: () => {
      // Force refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.refetchQueries({ queryKey: ["/api/tenants"] });
      queryClient.refetchQueries({ queryKey: ["/api/units"] });
      setIsAssignTenantDialogOpen(false);
      setIsViewDialogOpen(false);
      assignTenantForm.reset();
      toast({ title: "Tenant assigned successfully" });
    },
    onError: (error: any) => {
      console.error("Assign tenant error:", error);
      toast({ title: "Failed to assign tenant", variant: "destructive" });
    },
  });

  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: TenantStatusFormData }) =>
      apiRequest("PATCH", `/api/tenants/${tenantId}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsTenantStatusDialogOpen(false);
      setEditingTenant(null);
      tenantStatusForm.reset();
      toast({ title: "Tenant status updated successfully" });
    },
    onError: (error: any) => {
      console.error("Update tenant status error:", error);
      toast({ title: "Failed to update tenant status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete unit", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      taskForm.reset();
      toast({ title: "Task created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
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



  const onCreateSubmit = (data: UnitFormData) => {
    console.log("Unit form data being submitted:", data);
    // Ensure proper data formatting for database
    const formattedData = {
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
      bedrooms: Number(data.bedrooms),
      bathrooms: data.bathrooms.toString(),
      rentAmount: data.rentAmount || null,
      status: data.status as "vacant" | "occupied" | "maintenance",
      squareFootage: data.squareFootage ? Number(data.squareFootage) : null,
    };
    console.log("Formatted unit data:", formattedData);
    createMutation.mutate(formattedData);
  };

  const onEditSubmit = (data: UnitFormData) => {
    if (selectedUnit) {
      updateMutation.mutate({ id: selectedUnit.id, data });
    }
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    editForm.reset({
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rentAmount: unit.rentAmount,
      status: unit.status,
      squareFootage: unit.squareFootage || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this unit?")) {
      deleteMutation.mutate(id);
    }
  };

  const onTaskSubmit = (data: TaskFormData) => {
    if (selectedUnit) {
      const taskData: InsertTask = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        category: data.category,
        propertyId: selectedUnit.propertyId,
        unitId: selectedUnit.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedTo: data.assignedTo || null,
        tenantId: null,
        vendorId: null,
        rentPaymentId: null,
      };
      createTaskMutation.mutate(taskData);
    }
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getTenantForUnit = (unitId: string) => {
    return tenants.find(tenant => tenant.unitId === unitId);
  };

  const getAvailableTenants = () => {
    // Get tenants that are not assigned to any unit or are inactive
    return tenants.filter(tenant => !tenant.unitId || tenant.status === "inactive");
  };

  const handleViewTenantHistory = (unit: Unit) => {
    setSelectedUnitForHistory(unit);
    setIsTenantHistoryDialogOpen(true);
  };

  const onAssignTenantSubmit = (data: AssignTenantFormData) => {
    if (selectedUnit) {
      assignTenantMutation.mutate({
        tenantId: data.tenantId,
        unitId: selectedUnit.id,
      });
    }
  };

  const onTenantStatusSubmit = (data: TenantStatusFormData) => {
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

  const filteredUnits = units?.filter((unit: Unit) => {
    const tenant = getTenantForUnit(unit.id);
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "";

    const matchesSearch = unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
             getPropertyName(unit.propertyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
             tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-96">Loading units...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Units</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
              <DialogDescription>
                Create a new unit for one of your properties. Fill in the details below to add this unit to your portfolio.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
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
                            {properties.map((property) => (
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Unit"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search units, properties, or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <Card 
              key={unit.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(unit)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>Unit {unit.unitNumber}</span>
                  <Badge className={getStatusColor(unit.status)}>
                    {unit.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Property:</span> {getPropertyName(unit.propertyId)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Bedrooms:</span> {unit.bedrooms}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Bathrooms:</span> {unit.bathrooms}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Rent:</span> {formatCurrency(unit.rentAmount)}
                  </p>
                  {unit.squareFootage && (
                    <p className="text-sm">
                      <span className="font-semibold">Size:</span> {unit.squareFootage} sq ft
                    </p>
                  )}
                  {(() => {
                    const tenant = getTenantForUnit(unit.id);
                    return tenant ? (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          Current Tenant
                        </p>
                        <p className="text-sm">
                          {tenant.firstName} {tenant.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{tenant.email}</p>
                      </div>
                    ) : (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <p className="text-sm text-muted-foreground">No tenant assigned</p>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUnits.map((unit) => (
            <Card 
              key={unit.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(unit)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">Unit {unit.unitNumber}</h3>
                        <p className="text-sm text-gray-600">{getPropertyName(unit.propertyId)}</p>
                      </div>
                      <Badge className={getStatusColor(unit.status)}>
                        {unit.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{unit.bedrooms} bed, {unit.bathrooms} bath</p>
                      <p className="text-sm text-gray-600">{formatCurrency(unit.rentAmount)}</p>
                      {(() => {
                        const tenant = getTenantForUnit(unit.id);
                        return tenant ? (
                          <p className="text-xs text-blue-600">
                            {tenant.firstName} {tenant.lastName}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No tenant</p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* View Unit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex justify-between items-center pl-[12px] pr-[12px]">
              <DialogTitle>Unit Details</DialogTitle>
              <DialogDescription className="sr-only">
                View comprehensive information about this unit including specifications, tenant details, maintenance history, and documents.
              </DialogDescription>
              {selectedUnit && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsViewDialogOpen(false);
                      handleEdit(selectedUnit);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsViewDialogOpen(false);
                      handleDelete(selectedUnit.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedUnit && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="tenant">Tenant</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {/* Status Badge and Key Info */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                        <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unit {selectedUnit.unitNumber}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{getPropertyName(selectedUnit.propertyId)}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(selectedUnit.status)} text-sm px-3 py-1`}>
                    {selectedUnit.status.charAt(0).toUpperCase() + selectedUnit.status.slice(1)}
                  </Badge>
                </div>

                {/* Unit Specifications */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                      Unit Specifications
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <Bed className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedUnit.bedrooms} Bedroom{selectedUnit.bedrooms !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sleeping spaces</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <Bath className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedUnit.bathrooms} Bathroom{selectedUnit.bathrooms !== '1' ? 's' : ''}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Full bathrooms</p>
                        </div>
                      </div>
                      {selectedUnit.squareFootage && (
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <Maximize className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedUnit.squareFootage} sq ft</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Living space</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                      Financial Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(selectedUnit.rentAmount)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Monthly rent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tenant" className="space-y-4">

              {/* Tenant Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                  Tenant Information
                </h4>
                {(() => {
                  const tenant = getTenantForUnit(selectedUnit.id);
                  return tenant ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {tenant.firstName} {tenant.lastName}
                            </h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTenantStatus(tenant)}
                              className={`${getStatusColor(tenant.status)} hover:opacity-80 transition-opacity`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              {tenant.status}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.email}</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{tenant.phone}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {tenant.leaseStart && tenant.leaseEnd && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lease Period</p>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
                                  </p>
                                </div>
                              )}
                              {tenant.monthlyRent && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Monthly Rent</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(tenant.monthlyRent)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No Tenant Assigned</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This unit is currently vacant</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setIsAssignTenantDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign Tenant
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Historical Tenant Information Button */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTenantHistory(selectedUnit)}
                    className="flex items-center space-x-2"
                  >
                    <History className="h-4 w-4" />
                    <span>Historical Tenant Info</span>
                  </Button>
                </div>
                </div>
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

              <TabsContent value="documents" className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Documents
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
                      <div className="grid gap-3">
                        {unitTasks.map((task) => (
                          <Card 
                            key={task.id} 
                            className="compact-task-card cursor-pointer"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskDetailOpen(true);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="grid grid-cols-3 gap-4">
                                {/* Main Task Info */}
                                <div className="col-span-2 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{task.title}</h4>
                                    <Badge className={`text-xs ${
                                      task.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
                                      task.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
                                      task.priority === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                      "bg-green-100 text-green-800 border-green-200"
                                    }`}>
                                      {task.priority}
                                    </Badge>
                                    <Badge className={`text-xs ${
                                      task.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                                      task.status === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                      task.status === "cancelled" ? "bg-gray-100 text-gray-800 border-gray-200" :
                                      "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    }`}>
                                      {task.status.replace('_', ' ')}
                                    </Badge>
                                  </div>

                                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="font-medium">Category:</span>
                                      <span className="ml-1 capitalize">{task.category}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Communication:</span>
                                      <span className="ml-1 capitalize">{task.communicationMethod || 'None'}</span>
                                    </div>
                                    {task.dueDate && (
                                      <div>
                                        <span className="font-medium">Due Date:</span>
                                        <span className="ml-1">{formatDate(task.dueDate)}</span>
                                      </div>
                                    )}
                                    {task.assignedTo && (
                                      <div>
                                        <span className="font-medium">Assigned:</span>
                                        <span className="ml-1">{task.assignedTo}</span>
                                      </div>
                                    )}
                                    {task.isRecurring && (
                                      <div>
                                        <span className="font-medium">Recurring:</span>
                                        <span className="ml-1 capitalize">{task.recurrencePeriod || 'Yes'}</span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Created:</span>
                                      <span className="ml-1">{formatDate(task.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col justify-between items-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTaskMutation.mutate(task.id);
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <div className="text-xs text-muted-foreground">
                                    Click to view details
                                  </div>
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
            <DialogDescription>
              Update the unit details including specifications, rent amount, and current status.
            </DialogDescription>
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
                          {properties.map((property) => (
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
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Unit"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Assign Tenant Dialog */}
      <Dialog open={isAssignTenantDialogOpen} onOpenChange={setIsAssignTenantDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tenant</DialogTitle>
            <DialogDescription>
              Select an available tenant to assign to this unit. This will update the unit's occupancy status.
            </DialogDescription>
          </DialogHeader>
          <Form {...assignTenantForm}>
            <form
              onSubmit={assignTenantForm.handleSubmit((data) => {
                if (selectedUnit) {
                  assignTenantMutation.mutate({
                    tenantId: data.tenantId,
                    unitId: selectedUnit.id,
                  });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={assignTenantForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Tenant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an available tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableTenants().map((tenant) => (
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
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignTenantDialogOpen(false)}
                >
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
      
      {/* Tenant History Dialog */}
      <Dialog open={isTenantHistoryDialogOpen} onOpenChange={setIsTenantHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant History - Unit {selectedUnit?.unitNumber}</DialogTitle>
            <DialogDescription>
              View the complete tenant history for this unit including move-in and move-out dates.
            </DialogDescription>
          </DialogHeader>
          
          {tenantHistory && tenantHistory.length > 0 ? (
            <div className="space-y-4">
              {tenantHistory.map((entry, index) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-semibold">
                        {entry.firstName} {entry.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">{entry.email}</p>
                      <p className="text-sm text-muted-foreground">{entry.phone}</p>
                      <div className="flex gap-4 text-sm">
                        <span>
                          <strong>Move-in:</strong> {entry.moveInDate ? formatDate(entry.moveInDate) : 'N/A'}
                        </span>
                        <span>
                          <strong>Move-out:</strong> {entry.moveOutDate ? formatDate(entry.moveOutDate) : 'Current'}
                        </span>
                      </div>
                      {entry.monthlyRent && (
                        <p className="text-sm">
                          <strong>Monthly Rent:</strong> {formatCurrency(entry.monthlyRent)}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-sm">
                          <strong>Notes:</strong> {entry.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant={entry.moveOutDate ? "secondary" : "default"}>
                      {entry.moveOutDate ? "Former" : "Current"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tenant history available for this unit.</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => setIsTenantHistoryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this unit. Tasks help track maintenance, inspections, and other unit-related activities.
            </DialogDescription>
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
                      <Input placeholder="Enter task title" {...field} />
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
                      <Textarea 
                        placeholder="Describe the task details"
                        className="min-h-[100px]"
                        {...field} 
                      />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="upgrade">Upgrade</SelectItem>
                          <SelectItem value="general">General</SelectItem>
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
                          {...field}
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
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter assignee name or email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Property, Unit, and Tenant Selection */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={taskForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property: Property) => (
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
                  control={taskForm.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit: Unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {properties?.find((p: Property) => p.id === unit.propertyId)?.name || 'Property'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant: Tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={taskForm.control}
                name="attachmentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file.name);
                          }
                        }}
                        className="cursor-pointer"
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
                  onClick={() => setIsTaskDialogOpen(false)}
                >
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

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <TaskDetails
              task={selectedTask}
              onBack={() => setIsTaskDetailOpen(false)}
              onTaskUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                setIsTaskDetailOpen(false);
              }}
              onTaskDeleted={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                setIsTaskDetailOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}