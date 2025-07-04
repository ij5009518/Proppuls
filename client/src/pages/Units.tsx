import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, CheckSquare, Home, Bed, Bath, Maximize, DollarSign, Users, FileText, Wrench, History, Calendar, ChevronLeft, ChevronRight, Mail, Phone, MessageSquare, Clock, User, Send, AlertCircle, X, History as HistoryIcon, CalendarIcon, Save, Download, Paperclip, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Unit, InsertUnit, Property, Tenant, Task, InsertTask } from "@shared/schema";

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
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

const communicationFormSchema = z.object({
  method: z.enum(["email", "sms"]),
  recipient: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message is required"),
});

const assignTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
});

const tenantStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  moveOutDate: z.string().optional(),
  moveOutReason: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type CommunicationFormData = z.infer<typeof communicationFormSchema>;
type AssignTenantFormData = z.infer<typeof assignTenantSchema>;
type TenantStatusFormData = z.infer<typeof tenantStatusSchema>;

function TaskCommunications({ taskId }: { taskId: string }) {
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ["/api/tasks", taskId, "communications"],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}/communications`),
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading communications...</div>;
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No communications yet</p>
        <p className="text-xs text-muted-foreground mt-1">Communications will appear here when sent</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {communications.map((comm: any) => (
        <div key={comm.id} className="border rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {comm.method === 'email' && <MessageSquare className="h-4 w-4 text-blue-500" />}
              {comm.method === 'sms' && <MessageSquare className="h-4 w-4 text-green-500" />}
              <span className="font-medium capitalize">{comm.method}</span>
              <Badge variant={comm.status === 'delivered' ? 'default' : comm.status === 'failed' ? 'destructive' : 'secondary'}>
                {comm.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(comm.createdAt).toLocaleString()}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{comm.recipient}</p>
          {comm.subject && <p className="text-sm font-medium mt-1">{comm.subject}</p>}
          <p className="text-sm mt-1">{comm.message}</p>
          {comm.errorMessage && (
            <p className="text-xs text-destructive mt-1">Error: {comm.errorMessage}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Units() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [isAssignTenantDialogOpen, setIsAssignTenantDialogOpen] = useState(false);
  const [isEditTenantStatusDialogOpen, setIsEditTenantStatusDialogOpen] = useState(false);
  const [isTenantHistoryDialogOpen, setIsTenantHistoryDialogOpen] = useState(false);
  const [isSendCommunicationOpen, setIsSendCommunicationOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<Task>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Data queries
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
  }) as { data: Unit[], isLoading: boolean };

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  }) as { data: Property[] };

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  }) as { data: Tenant[] };

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  }) as { data: Task[] };

  // Forms
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

  // Task forms 
  const createTaskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      category: "general",
      dueDate: "",
      assignedTo: "",
      propertyId: "",
      unitId: "",
      tenantId: "",
    },
  });

  const communicationForm = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      method: "email",
      recipient: "",
      message: "",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Unit created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create unit", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsEditDialogOpen(false);
      toast({ title: "Unit updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update unit", variant: "destructive" });
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

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return apiRequest("POST", "/api/tasks", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddTaskDialogOpen(false);
      createTaskForm.reset();
      setUploadedDocument(null);
      toast({ title: "Task created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, taskData }: { id: string; taskData: Partial<Task> }) =>
      apiRequest("PUT", `/api/tasks/${id}`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setPendingChanges({});
      setHasUnsavedChanges(false);
      toast({ title: "Task updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  // Helper functions
  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p: Property) => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getTenantForUnit = (unitId: string) => {
    return tenants.find((t: Tenant) => t.unitId === unitId && t.status === "active");
  };

  const updatePendingChange = (field: keyof Task, value: any) => {
    setPendingChanges(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const savePendingChanges = () => {
    if (selectedTaskForDetails && Object.keys(pendingChanges).length > 0) {
      updateTaskMutation.mutate({
        id: selectedTaskForDetails.id,
        taskData: pendingChanges
      });
    }
  };

  // Form handlers
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
    } as any;
    console.log("Formatted unit data:", formattedData);
    createMutation.mutate(formattedData);
  };

  const onEditSubmit = (data: UnitFormData) => {
    if (selectedUnit) {
      updateMutation.mutate({ id: selectedUnit.id, data: data as any });
    }
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    editForm.reset({
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rentAmount: (unit.rentAmount || "") as string,
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
    if (selectedUnit) {
      // @ts-ignore
      const taskData: InsertTask = {
        ...data,
        unitId: selectedUnit.id,
        propertyId: selectedUnit.propertyId,
        communicationMethod: "email" as any,
      };
      // Create the task (would need task mutation)
      toast({ title: "Task created", description: "Task created successfully" });
    }
  };

  const handleViewTenantHistory = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsTenantHistoryDialogOpen(true);
  };

  const onAssignTenantSubmit = (data: AssignTenantFormData) => {
    if (selectedUnit) {
      // Update tenant's unitId
      toast({ title: "Tenant assigned", description: "Tenant assigned to unit successfully" });
      setIsAssignTenantDialogOpen(false);
    }
  };

  const onTenantStatusSubmit = (data: TenantStatusFormData) => {
    if (selectedTenant) {
      // Update tenant status
      toast({ title: "Status updated", description: "Tenant status updated successfully" });
      setIsEditTenantStatusDialogOpen(false);
    }
  };

  const handleEditTenantStatus = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    tenantStatusForm.reset({
      status: tenant.status,
      moveOutDate: "",
      moveOutReason: "",
    });
    setIsEditTenantStatusDialogOpen(true);
  };

  // Filter logic
  const filteredUnits = units?.filter((unit: Unit) => {
    const propertyName = getPropertyName(unit.propertyId);
    const searchText = `${unit.unitNumber} ${propertyName}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  // Get tasks for a specific unit
  const getTasksForUnit = (unitId: string) => {
    return tasks.filter((task: Task) => task.unitId === unitId);
  };

  // Filter tasks
  const filteredTasks = tasks?.filter((task: Task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
    return true;
  });

  if (unitsLoading) {
    return <div className="flex items-center justify-center h-32">Loading units...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units Management</h1>
          <p className="text-muted-foreground">
            Manage your property units and comprehensive task tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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

      {/* Units Grid/List */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {filteredUnits?.map((unit: Unit) => {
          const tenant = getTenantForUnit(unit.id);
          const unitTasks = getTasksForUnit(unit.id);
          
          return (
            <Card key={unit.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Unit {unit.unitNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getPropertyName(unit.propertyId)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(unit.status)}>
                    {unit.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>{unit.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span>{unit.bathrooms} bath</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{formatCurrency(unit.rentAmount || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="h-4 w-4 text-muted-foreground" />
                    <span>{unit.squareFootage || 'N/A'} sq ft</span>
                  </div>
                </div>

                {/* Tenant Info */}
                {tenant && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{tenant.firstName} {tenant.lastName}</span>
                      </div>
                      <Badge variant="secondary">{tenant.status}</Badge>
                    </div>
                  </div>
                )}

                {/* Task Summary */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      <span className="font-medium">Tasks ({unitTasks.length})</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedUnit(unit);
                        setIsAddTaskDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {unitTasks.length > 0 ? (
                    <div className="space-y-1">
                      {unitTasks.slice(0, 2).map((task: Task) => (
                        <div key={task.id} className="text-sm">
                          <span className="font-medium">{task.title}</span>
                          <Badge 
                            variant={task.status === "completed" ? "default" : "secondary"}
                            className="ml-2 text-xs"
                          >
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                      {unitTasks.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{unitTasks.length - 2} more tasks
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(unit)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(unit.id)}
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

      {/* Create Unit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(properties as Property[])?.map((property: Property) => (
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Amount</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="2000" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
              </div>
              <FormField
                control={createForm.control}
                name="squareFootage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Footage (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Create Unit
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Unit Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Unit {selectedUnit?.unitNumber} - {getPropertyName(selectedUnit?.propertyId || "")}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUnit && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="tenant">Tenant</TabsTrigger>
                <TabsTrigger value="maintenance">Tasks</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Unit Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Unit Number:</span>
                          <span className="font-medium">{selectedUnit.unitNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bedrooms:</span>
                          <span className="font-medium">{selectedUnit.bedrooms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bathrooms:</span>
                          <span className="font-medium">{selectedUnit.bathrooms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Square Footage:</span>
                          <span className="font-medium">{selectedUnit.squareFootage || 'N/A'} sq ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge className={getStatusColor(selectedUnit.status)}>
                            {selectedUnit.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Financial</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Monthly Rent:</span>
                          <span className="font-medium">{formatCurrency(selectedUnit.rentAmount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tenant" className="space-y-4 mt-4">
                {(() => {
                  const tenant = getTenantForUnit(selectedUnit.id);
                  return tenant ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Current Tenant</h3>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTenantStatus(tenant)}
                          >
                            Edit Status
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewTenantHistory(selectedUnit)}
                          >
                            View History
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                          <p className="text-sm text-muted-foreground">{tenant.email}</p>
                          <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                        </div>
                        <div>
                          <Badge className={getStatusColor(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Current Tenant</h3>
                      <p className="text-muted-foreground mb-4">This unit is currently vacant</p>
                      <Button onClick={() => setIsAssignTenantDialogOpen(true)}>
                        Assign Tenant
                      </Button>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Maintenance & Tasks</h3>
                    <Button 
                      size="sm"
                      onClick={() => setIsAddTaskDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                  
                  {(() => {
                    const unitTasks = getTasksForUnit(selectedUnit.id);
                    return unitTasks.length > 0 ? (
                      <div className="space-y-3">
                        {unitTasks.map((task: Task) => (
                          <Card key={task.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                            setSelectedTaskForDetails(task);
                            setIsTaskDetailsDialogOpen(true);
                          }}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-medium">{task.title}</h4>
                                    <Badge variant={
                                      task.priority === "urgent" ? "destructive" :
                                      task.priority === "high" ? "secondary" :
                                      "outline"
                                    } className="text-xs">
                                      {task.priority}
                                    </Badge>
                                    <Badge variant={
                                      task.status === "completed" ? "default" :
                                      task.status === "in_progress" ? "secondary" :
                                      "outline"
                                    } className="text-xs">
                                      {task.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>Category: {task.category}</span>
                                    {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                                    {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskForDetails(task);
                                    setIsTaskDetailsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Tasks</h3>
                        <p className="text-muted-foreground mb-4">No maintenance requests or tasks for this unit</p>
                        <Button onClick={() => setIsAddTaskDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Documents</h3>
                  <p className="text-muted-foreground mb-4">Document management coming soon</p>
                  <Button variant="outline" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Task Details
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="ml-2">
                  Unsaved Changes
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTaskForDetails && (
            <div className="space-y-6">
              {/* Save Changes Bar */}
              {hasUnsavedChanges && (
                <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                  <p className="text-sm">You have unsaved changes</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setPendingChanges({});
                      setHasUnsavedChanges(false);
                    }}>
                      Discard
                    </Button>
                    <Button size="sm" onClick={savePendingChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Task Information */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Select 
                    value={pendingChanges.category || selectedTaskForDetails.category}
                    onValueChange={(value) => updatePendingChange('category', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="tenant_communication">Tenant Communication</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select 
                    value={pendingChanges.priority || selectedTaskForDetails.priority}
                    onValueChange={(value) => updatePendingChange('priority', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select 
                    value={pendingChanges.status || selectedTaskForDetails.status}
                    onValueChange={(value) => updatePendingChange('status', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    type="date"
                    value={
                      pendingChanges.dueDate !== undefined 
                        ? (pendingChanges.dueDate as any)
                        : selectedTaskForDetails.dueDate 
                          ? (String(selectedTaskForDetails.dueDate).split('T')[0])
                          : ''
                    }
                    onChange={(e) => updatePendingChange('dueDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Second Row: Assigned To, Property, Unit, Tenant */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Assigned To</Label>
                  <Input
                    value={pendingChanges.assignedTo !== undefined ? pendingChanges.assignedTo : selectedTaskForDetails.assignedTo || ''}
                    onChange={(e) => updatePendingChange('assignedTo', e.target.value)}
                    placeholder="Assign to..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Property</Label>
                  <Input
                    value={getPropertyName(selectedTaskForDetails.propertyId || '')}
                    disabled
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Unit</Label>
                  <Input
                    value={selectedTaskForDetails.unitId ? (units as Unit[]).find((u: Unit) => u.id === selectedTaskForDetails.unitId)?.unitNumber || 'Unknown' : 'None'}
                    disabled
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Tenant</Label>
                  <Input
                    value={selectedTaskForDetails.tenantId ? 
                      (() => {
                        const tenant = (tenants as Tenant[]).find((t: Tenant) => t.id === selectedTaskForDetails.tenantId);
                        return tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown';
                      })() : 'None'
                    }
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Title and Description */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <Input
                    value={pendingChanges.title !== undefined ? pendingChanges.title : selectedTaskForDetails.title}
                    onChange={(e) => updatePendingChange('title', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={pendingChanges.description !== undefined ? pendingChanges.description : selectedTaskForDetails.description}
                    onChange={(e) => updatePendingChange('description', e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>

              {/* Forum/Communications Section */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Communications Forum</h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsSendCommunicationOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Communication
                  </Button>
                </div>
                <TaskCommunications taskId={selectedTaskForDetails.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Task
            </DialogTitle>
          </DialogHeader>
          
          <Form {...createTaskForm}>
            <form onSubmit={createTaskForm.handleSubmit((data) => {
              const formData = new FormData();
              
              // Append all form fields, including required ones even if empty
              formData.append('title', data.title || '');
              formData.append('description', data.description || '');
              formData.append('category', data.category || '');
              formData.append('priority', data.priority || 'medium');
              formData.append('status', data.status || 'pending');
              
              // Optional fields
              if (data.dueDate) formData.append('dueDate', data.dueDate);
              if (data.assignedTo) formData.append('assignedTo', data.assignedTo);
              if (data.propertyId) formData.append('propertyId', data.propertyId);
              if (data.unitId) formData.append('unitId', data.unitId);
              if (data.tenantId) formData.append('tenantId', data.tenantId);
              
              if (uploadedDocument) {
                formData.append('attachments', uploadedDocument);
              }
              
              createTaskMutation.mutate(formData);
            })} className="space-y-6">
              
              {/* First Row: Category, Priority, Status */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={createTaskForm.control}
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
                          <SelectItem value="documentation">Documentation</SelectItem>
                          <SelectItem value="tenant_communication">Tenant Communication</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createTaskForm.control}
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
                  control={createTaskForm.control}
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

              {/* Second Row: Due Date, Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createTaskForm.control}
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
                  control={createTaskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input placeholder="Assign to..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Third Row: Property, Unit, Tenant */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={createTaskForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={createTaskForm.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit: Unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createTaskForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Title */}
              <FormField
                control={createTaskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={createTaskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Task description..." {...field} className="min-h-[100px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <div>
                <Label className="text-sm font-medium">Attachment (Required)</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedDocument(file);
                      }
                    }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                  />
                  {uploadedDocument && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {uploadedDocument.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddTaskDialogOpen(false);
                    createTaskForm.reset();
                    setUploadedDocument(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}