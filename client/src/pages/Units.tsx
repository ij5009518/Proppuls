import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Home, Users, Calendar, Building, Edit2, Trash2 } from "lucide-react";
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
  unitId: z.string().min(1, "Unit is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in_progress", "completed"]),
  dueDate: z.date().optional(),
});

const assignTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
});

type UnitFormData = z.infer<typeof unitSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type AssignTenantFormData = z.infer<typeof assignTenantSchema>;

export default function Units() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignTenantDialogOpen, setIsAssignTenantDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: tenants } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: tasks } = useQuery({
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
      squareFootage: 0,
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
      squareFootage: 0,
    },
  });

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      unitId: "",
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
    },
  });

  const assignTenantForm = useForm<AssignTenantFormData>({
    resolver: zodResolver(assignTenantSchema),
    defaultValues: {
      tenantId: "",
    },
  });

  // Mutations
  const createUnitMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Unit created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsEditDialogOpen(false);
      setEditingUnit(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      taskForm.reset();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: ({ unitId, tenantId }: { unitId: string; tenantId: string }) =>
      apiRequest("PATCH", `/api/tenants/${tenantId}`, { unitId, status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsAssignTenantDialogOpen(false);
      assignTenantForm.reset();
      toast({
        title: "Success",
        description: "Tenant assigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vacant":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "occupied":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "maintenance":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "moved_out":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "evicted":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties?.find((p: Property) => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getTenantForUnit = (unitId: string) => {
    return tenants?.find((tenant: Tenant) => tenant.unitId === unitId && tenant.status === "active");
  };

  const getAvailableTenants = () => {
    return tenants?.filter((tenant: Tenant) => !tenant.unitId || tenant.status !== "active") || [];
  };

  const getUnitTasks = (unitId: string) => {
    return tasks?.filter((task: Task) => task.unitId === unitId) || [];
  };

  // Form handlers
  const onCreateSubmit = (data: UnitFormData) => {
    const unitData: InsertUnit = {
      ...data,
      rentAmount: data.rentAmount,
      squareFootage: data.squareFootage || null,
    };
    createUnitMutation.mutate(unitData);
  };

  const onEditSubmit = (data: UnitFormData) => {
    if (!editingUnit) return;
    updateUnitMutation.mutate({
      id: editingUnit.id,
      data: {
        ...data,
        rentAmount: data.rentAmount,
        squareFootage: data.squareFootage || null,
      },
    });
  };

  const onTaskSubmit = (data: TaskFormData) => {
    if (!selectedUnit) return;
    const taskData: InsertTask = {
      ...data,
      unitId: selectedUnit.id,
      dueDate: data.dueDate || null,
    };
    createTaskMutation.mutate(taskData);
  };

  const onAssignTenantSubmit = (data: AssignTenantFormData) => {
    if (!selectedUnit) return;
    assignTenantMutation.mutate({
      unitId: selectedUnit.id,
      tenantId: data.tenantId,
    });
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
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
  };

  if (unitsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Units Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your property units and tenants
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Units List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            All Units ({units?.length || 0})
          </h2>
          <div className="space-y-3">
            {units?.map((unit: Unit) => {
              const tenant = getTenantForUnit(unit.id);
              return (
                <Card
                  key={unit.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedUnit?.id === unit.id
                      ? "ring-2 ring-primary shadow-lg"
                      : ""
                  }`}
                  onClick={() => handleView(unit)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                            <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Unit {unit.unitNumber}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getPropertyName(unit.propertyId)}
                          </p>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(unit.rentAmount || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(unit.status)}>
                          {unit.status}
                        </Badge>
                        {tenant && (
                          <Badge variant="outline" className="text-xs">
                            {tenant.firstName} {tenant.lastName}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(unit);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Unit Details */}
        <div>
          {selectedUnit ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Unit {selectedUnit.unitNumber}</span>
                </CardTitle>
                <CardDescription>
                  {getPropertyName(selectedUnit.propertyId)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    {/* Unit Information */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                        Unit Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bedrooms</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{selectedUnit.bedrooms}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bathrooms</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{selectedUnit.bathrooms}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rent Amount</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(selectedUnit.rentAmount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Square Footage</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {selectedUnit.squareFootage ? `${selectedUnit.squareFootage} sq ft` : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Tenant Information */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                        Current Tenant
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
                                  <Badge className={getStatusColor(tenant.status)}>
                                    {tenant.status}
                                  </Badge>
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
                    </div>

                    {/* Previous Tenants Section */}
                    {(() => {
                      const unitTenants = tenants?.filter((tenant: Tenant) => tenant.unitId === selectedUnit.id) || [];
                      const previousTenants = unitTenants.filter((tenant: Tenant) => 
                        tenant.status === 'moved_out' || tenant.status === 'evicted'
                      ).sort((a, b) => {
                        const dateA = new Date(b.moveOutDate || new Date());
                        const dateB = new Date(a.moveOutDate || new Date());
                        return dateA.getTime() - dateB.getTime();
                      });

                      if (previousTenants.length > 0) {
                        return (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide border-b pb-2">
                              Previous Tenants
                            </h4>
                            <div className="space-y-3">
                              {previousTenants.map((tenant: Tenant) => (
                                <div key={tenant.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                      </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h6 className="font-medium text-gray-900 dark:text-gray-100">
                                          {tenant.firstName} {tenant.lastName}
                                        </h6>
                                        <Badge variant="secondary" className="text-xs">
                                          {tenant.status === 'moved_out' ? 'Moved Out' : 'Evicted'}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 text-xs">Lease Period</p>
                                          <p className="text-gray-900 dark:text-gray-100">
                                            {tenant.leaseStart ? formatDate(tenant.leaseStart) : 'N/A'} - {tenant.leaseEnd ? formatDate(tenant.leaseEnd) : 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 text-xs">Monthly Rent</p>
                                          <p className="text-gray-900 dark:text-gray-100">{tenant.monthlyRent ? formatCurrency(parseFloat(tenant.monthlyRent)) : 'N/A'}</p>
                                        </div>
                                        {tenant.moveOutDate && (
                                          <div>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">Move Out Date</p>
                                            <p className="text-gray-900 dark:text-gray-100">{formatDate(tenant.moveOutDate)}</p>
                                          </div>
                                        )}
                                        {tenant.reasonForLeaving && (
                                          <div>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">Reason for Leaving</p>
                                            <p className="text-gray-900 dark:text-gray-100">{tenant.reasonForLeaving}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                        Tasks for Unit {selectedUnit.unitNumber}
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          taskForm.setValue("unitId", selectedUnit.id);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {getUnitTasks(selectedUnit.id).map((task: Task) => (
                        <Card key={task.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                  {task.title}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {task.description}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Due: {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Building className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Select a Unit
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Choose a unit from the list to view details
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Unit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Create a new unit for your property
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a property" />
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
                control={form.control}
                name="unitNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 101, A1, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
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
                        <Input placeholder="e.g., 1, 1.5, 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1200" {...field} />
                    </FormControl>
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
                        placeholder="e.g., 850"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
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
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
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
                  onClick={() => setIsCreateDialogOpen(false)}
                >
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

      {/* Assign Tenant Dialog */}
      <Dialog open={isAssignTenantDialogOpen} onOpenChange={setIsAssignTenantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tenant</DialogTitle>
            <DialogDescription>
              Assign a tenant to Unit {selectedUnit?.unitNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...assignTenantForm}>
            <form onSubmit={assignTenantForm.handleSubmit(onAssignTenantSubmit)} className="space-y-4">
              <FormField
                control={assignTenantForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableTenants().map((tenant: Tenant) => (
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
    </div>
  );
}