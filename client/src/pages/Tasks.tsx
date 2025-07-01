import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckSquare, Wrench, Calendar, Edit, Trash2, ChevronLeft, ChevronRight, Grid, List, FileText, Download, Eye, Paperclip, Upload, Mail, Phone, MessageSquare, Clock, User, Send, AlertCircle, X, History as HistoryIcon, DollarSign, CalendarIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Task, InsertTask } from "shared/schema";

const taskFormSchema = z.object({
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

type TaskFormData = z.infer<typeof taskFormSchema>;
type CommunicationFormData = z.infer<typeof communicationFormSchema>;

// Task Communications Component
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
              {comm.method === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
              {comm.method === 'sms' && <Phone className="h-4 w-4 text-green-500" />}
              <span className="font-medium capitalize">{comm.method}</span>
              <Badge variant={comm.status === 'delivered' ? 'default' : comm.status === 'failed' ? 'destructive' : 'secondary'}>
                {comm.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
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

export default function Tasks() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSendCommunicationOpen, setIsSendCommunicationOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<Task>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Helper function to update pending changes
  const updatePendingChange = (field: keyof Task, value: any) => {
    setPendingChanges(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    // Also update the visual state immediately for responsive UI
    setSelectedTaskForDetails(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Function to save all pending changes at once
  const handleSaveChanges = () => {
    if (!selectedTaskForDetails || Object.keys(pendingChanges).length === 0) return;
    
    // Convert date to ISO string if it's a Date object
    const changesWithFormattedDate = { ...pendingChanges };
    if (changesWithFormattedDate.dueDate && changesWithFormattedDate.dueDate instanceof Date) {
      changesWithFormattedDate.dueDate = changesWithFormattedDate.dueDate.toISOString();
    }
    
    updateTaskMutation.mutate({ 
      id: selectedTaskForDetails.id, 
      taskData: changesWithFormattedDate
    });
  };

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
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

  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
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

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: taskCommunications = [] } = useQuery({
    queryKey: ["/api/tasks", selectedTaskForDetails?.id, "communications"],
    enabled: !!selectedTaskForDetails?.id,
  });

  const { data: taskHistory = [] } = useQuery({
    queryKey: ["/api/tasks", selectedTaskForDetails?.id, "history"],
    enabled: !!selectedTaskForDetails?.id,
  });

  const communicationForm = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      method: "email",
      recipient: "",
      message: "",
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      const formData = new FormData();
      
      // Add all task fields to FormData
      Object.entries(taskData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'dueDate' && value instanceof Date) {
            formData.append(key, value.toISOString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      // Add multiple files if present
      if (uploadedDocument && Array.isArray(uploadedDocument)) {
        uploadedDocument.forEach((file) => {
          formData.append('attachments', file);
        });
      }
      
      // Use fetch instead of apiRequest for FormData
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddDialogOpen(false);
      form.reset();
      setUploadedDocument(null); // Clear uploaded document
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

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, taskData }: { id: string; taskData: Partial<InsertTask> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      editForm.reset();
      // Clear pending changes after successful save
      setPendingChanges({});
      setHasUnsavedChanges(false);
      // Refresh task history if task details dialog is open
      if (selectedTaskForDetails) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskForDetails.id, "history"] });
      }
      toast({
        title: "Success",
        description: "Task updated successfully",
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

  const sendCommunicationMutation = useMutation({
    mutationFn: (communicationData: any) => apiRequest("POST", `/api/tasks/${communicationData.taskId}/communications`, communicationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (selectedTaskForDetails) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskForDetails.id, "communications"] });
      }
      toast({
        title: "Communication sent",
        description: "The communication has been sent successfully.",
      });
    },
    onError: (error) => {
      console.error("Error sending communication:", error);
      toast({
        title: "Error",
        description: "Failed to send communication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: TaskFormData) => {
    const taskData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    } as InsertTask;
    
    createTaskMutation.mutate(taskData);
  };

  const onEditSubmit = (data: TaskFormData) => {
    if (!selectedTask) return;
    const taskData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };
    updateTaskMutation.mutate({ id: selectedTask.id, taskData });
  };

  const onSendCommunication = (data: CommunicationFormData) => {
    if (!selectedTaskForDetails) return;
    sendCommunicationMutation.mutate({ ...data, taskId: selectedTaskForDetails.id });
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploadedDocument(files[0]);
      toast({
        title: "File Selected",
        description: `Selected: ${files[0].name}`,
      });
    }
  };

  const openTaskHistory = (task: Task) => {
    setSelectedTask(task);
    setIsHistoryDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    editForm.reset({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      assignedTo: task.assignedTo || "",
      propertyId: task.propertyId || "",
      unitId: task.unitId || "",
      tenantId: task.tenantId || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskForDetails(task);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 5); // Limit to 5 files
      setUploadedDocument(fileArray);
      toast({
        title: "Files Selected",
        description: `Ready to attach ${fileArray.length} file(s)`,
      });
    }
  };

  const handleDownloadAttachment = (task: Task) => {
    if (task.attachmentUrl && task.attachmentName) {
      // Create a download link for the file
      const link = document.createElement('a');
      link.href = task.attachmentUrl;
      link.download = task.attachmentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${task.attachmentName}`,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  const getRelatedEntityName = (task: Task) => {
    if (task.propertyId) {
      const property = Array.isArray(properties) ? properties.find((p: any) => p.id === task.propertyId) : null;
      return property ? `Property: ${property.name}` : "";
    }
    if (task.unitId) {
      const unit = Array.isArray(units) ? units.find((u: any) => u.id === task.unitId) : null;
      return unit ? `Unit: ${unit.name}` : "";
    }
    if (task.tenantId) {
      const tenant = Array.isArray(tenants) ? tenants.find((t: any) => t.id === task.tenantId) : null;
      return tenant ? `Tenant: ${tenant.firstName} ${tenant.lastName}` : "";
    }
    if (task.vendorId) {
      const vendor = Array.isArray(vendors) ? vendors.find((v: any) => v.id === task.vendorId) : null;
      return vendor ? `Vendor: ${vendor.name}` : "";
    }
    return "";
  };

  const filteredTasks = Array.isArray(tasks) ? tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const taskCategories = [
    "general",
    "maintenance",
    "inspection",
    "repair",
    "cleaning",
    "landscaping",
    "legal",
    "financial",
    "administrative",
  ];

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  if (tasksLoading) {
    return <div className="flex justify-center items-center min-h-96">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks & Maintenance</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* First line: Category, Priority, Status, Due Date */}
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    control={form.control}
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
                  <FormField
                    control={form.control}
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
                </div>

                {/* Second line: Assigned To, Property, Unit, Tenant */}
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter assignee name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
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
                            {properties?.map((property: any) => (
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
                            {units?.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                Unit {unit.unitNumber} - {properties?.find((p: any) => p.id === unit.propertyId)?.name || 'Property'}
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
                            {tenants?.map((tenant: any) => (
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



                {/* Multiple Document Upload Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attach Documents (up to 5 files)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={handleDocumentUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                      multiple
                      className="flex-1"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {uploadedDocument && Array.isArray(uploadedDocument) && uploadedDocument.length > 0 && (
                    <div className="space-y-2">
                      {uploadedDocument.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)}KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFiles = uploadedDocument.filter((_, i) => i !== index);
                              setUploadedDocument(newFiles.length > 0 ? newFiles : null);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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

      {/* Tabs for Tasks, Maintenance, and Calendar */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <div className="space-y-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">No tasks found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchTerm ? "Try adjusting your search terms." : "Get started by creating a new task."}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task: Task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTaskClick(task)}>
                      <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0px] pb-[0px]">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={
                            task.priority === "urgent" ? "destructive" :
                            task.priority === "high" ? "secondary" :
                            task.priority === "medium" ? "outline" :
                            "outline"
                          }>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </Badge>
                          <Badge variant={
                            task.status === "completed" ? "default" :
                            task.status === "in_progress" ? "secondary" :
                            "outline"
                          }>
                            {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <span className="block">
                            Category: {task.category}
                          </span>
                          {task.dueDate && (
                            <span className="text-muted-foreground">
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        {getRelatedEntityName(task) && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {getRelatedEntityName(task)}
                          </div>
                        )}
                        {((task.attachments && task.attachments.length > 0) || task.attachmentUrl) && (
                          <div className="mt-2 flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {task.attachments && task.attachments.length > 0 
                                ? `${task.attachments.length} attachment${task.attachments.length > 1 ? 's' : ''}`
                                : task.attachmentName || '1 attachment'
                              }
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">No tasks found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchTerm ? "Try adjusting your search terms." : "Get started by creating a new task."}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task: Task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTaskClick(task)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <Badge variant={
                                task.priority === "urgent" ? "destructive" :
                                task.priority === "high" ? "secondary" :
                                task.priority === "medium" ? "outline" :
                                "outline"
                              }>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </Badge>
                              <Badge variant={
                                task.status === "completed" ? "default" :
                                task.status === "in_progress" ? "secondary" :
                                "outline"
                              }>
                                {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">Category: {task.category}</span>
                              {task.dueDate && (
                                <span className="text-sm text-muted-foreground">Due: {formatDate(task.dueDate)}</span>
                              )}
                            </div>
                            {getRelatedEntityName(task) && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {getRelatedEntityName(task)}
                              </div>
                            )}
                            {task.attachmentUrl && (
                              <div className="mt-2 flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadAttachment(task);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {task.attachmentName || 'Download Attachment'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="maintenance">
          <div className="space-y-6">
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Maintenance functionality</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Maintenance requests are now integrated with tasks for better organization.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView 
            tasks={filteredTasks} 
            setSelectedTaskForDetails={setSelectedTaskForDetails}
            setIsTaskDetailsDialogOpen={setIsTaskDetailsDialogOpen}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* First line: Category, Priority, Status, Due Date */}
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={editForm.control}
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
                <FormField
                  control={editForm.control}
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
              </div>

              {/* Second line: Assigned To, Property, Unit, Tenant */}
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={editForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter assignee name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
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
                          {properties?.map((property: any) => (
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
                          {units?.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {properties?.find((p: any) => p.id === unit.propertyId)?.name || 'Property'}
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
                          {tenants?.map((tenant: any) => (
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

              {/* Document Upload Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Attach Document</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={handleDocumentUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedDocument && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm">{uploadedDocument.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedDocument(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Communications and History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Task Communications & History
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="communications" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="communications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Communications</h3>
                  <Button
                    size="sm"
                    onClick={() => setIsSendCommunicationOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Communication
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {taskCommunications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {comm.method === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                          {comm.method === 'sms' && <Phone className="h-4 w-4 text-green-500" />}
                          <span className="font-medium capitalize">{comm.method}</span>
                          <Badge variant={comm.status === 'sent' ? 'default' : comm.status === 'failed' ? 'destructive' : 'secondary'}>
                            {comm.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(comm.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{comm.recipient}</p>
                      <p className="text-sm mt-1">{comm.message}</p>
                    </div>
                  ))}
                  {taskCommunications.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                      <p>No communications sent yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Task History</h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {taskHistory.map((history) => (
                    <div key={history.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{history.action}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(history.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {history.previousValues && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p><strong>Previous:</strong> {JSON.stringify(history.previousValues)}</p>
                        </div>
                      )}
                      {history.newValues && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <p><strong>New:</strong> {JSON.stringify(history.newValues)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {taskHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2" />
                      <p>No history available</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Send Communication Dialog */}
      <Dialog open={isSendCommunicationOpen} onOpenChange={(open) => {
        setIsSendCommunicationOpen(open);
        // Keep task details dialog open when communication dialog closes
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Communication</DialogTitle>
          </DialogHeader>
          
          <Form {...communicationForm}>
            <form onSubmit={communicationForm.handleSubmit(onSendCommunication)} className="space-y-4">
              <FormField
                control={communicationForm.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={communicationForm.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {communicationForm.watch("method") === "email" ? "Email Address" : "Phone Number"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={communicationForm.watch("method") === "email" ? "email" : "tel"}
                        placeholder={communicationForm.watch("method") === "email" ? "Enter email address" : "Enter phone number"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={communicationForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter your message" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsSendCommunicationOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendCommunicationMutation.isPending}>
                  {sendCommunicationMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <CheckSquare className="h-6 w-6" />
                {selectedTaskForDetails?.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant={hasUnsavedChanges ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectedTaskForDetails && hasUnsavedChanges) {
                      // Convert date to ISO string if it's a Date object
                      const changesWithFormattedDate = { ...pendingChanges };
                      if (changesWithFormattedDate.dueDate && changesWithFormattedDate.dueDate instanceof Date) {
                        changesWithFormattedDate.dueDate = changesWithFormattedDate.dueDate.toISOString();
                      }
                      
                      updateTaskMutation.mutate({ 
                        id: selectedTaskForDetails.id, 
                        taskData: changesWithFormattedDate
                      });
                    }
                  }}
                  disabled={updateTaskMutation.isPending || !hasUnsavedChanges}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateTaskMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedTaskForDetails && confirm("Are you sure you want to delete this task?")) {
                      handleDelete(selectedTaskForDetails.id);
                      setIsTaskDetailsDialogOpen(false);
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {selectedTaskForDetails && (
            <div className="space-y-6">
              {/* Task Details with Same Layout as Forms */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  {/* First line: Category, Priority, Status, Due Date */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select 
                        value={selectedTaskForDetails.category} 
                        onValueChange={(value) => {
                          updatePendingChange('category', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="administrative">Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select 
                        value={selectedTaskForDetails.priority} 
                        onValueChange={(value) => {
                          updatePendingChange('priority', value as any);
                        }}
                      >
                        <SelectTrigger>
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
                      <label className="text-sm font-medium">Status</label>
                      <Select 
                        value={selectedTaskForDetails.status} 
                        onValueChange={(value) => {
                          updatePendingChange('status', value as any);
                        }}
                      >
                        <SelectTrigger>
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
                      <label className="text-sm font-medium">Due Date</label>
                      <Input
                        type="date"
                        value={selectedTaskForDetails.dueDate ? new Date(selectedTaskForDetails.dueDate).toISOString().split('T')[0] : ""}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          updatePendingChange('dueDate', newDate);
                        }}
                      />
                    </div>
                  </div>

                  {/* Second line: Assigned To, Property, Unit, Tenant */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Assigned To</label>
                      <Input
                        value={selectedTaskForDetails.assignedTo || ""}
                        onChange={(e) => {
                          updatePendingChange('assignedTo', e.target.value);
                        }}
                        placeholder="Enter assignee name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Property (Optional)</label>
                      <Select 
                        value={selectedTaskForDetails.propertyId || ""} 
                        onValueChange={(value) => {
                          updatePendingChange('propertyId', value || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties?.map((property: any) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Unit (Optional)</label>
                      <Select 
                        value={selectedTaskForDetails.unitId || ""} 
                        onValueChange={(value) => {
                          updatePendingChange('unitId', value || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units?.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {properties?.find((p: any) => p.id === unit.propertyId)?.name || 'Property'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tenant (Optional)</label>
                      <Select 
                        value={selectedTaskForDetails.tenantId || ""} 
                        onValueChange={(value) => {
                          updatePendingChange('tenantId', value || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants?.map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inline Editable Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={selectedTaskForDetails.description || ""}
                    onChange={(e) => {
                      updatePendingChange('description', e.target.value);
                    }}
                    className="min-h-[100px] border-dashed resize-none focus:border-solid"
                    placeholder="Enter task description..."
                  />
                </CardContent>
              </Card>

              {/* File Attachments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTaskForDetails.attachments && selectedTaskForDetails.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTaskForDetails.attachments.map((attachment: any, index: number) => (
                        <div key={attachment.id || index} className="flex items-center gap-2 p-2 bg-muted rounded border">
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{attachment.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              {attachment.size ? `${Math.round(attachment.size / 1024)}KB` : ''} • 
                              {attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = attachment.url;
                                link.download = attachment.filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast({
                                  title: "Download Started",
                                  description: `Downloading ${attachment.filename}`,
                                });
                              }}
                              className="flex items-center gap-1 h-8"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Delete ${attachment.filename}?`)) {
                                  try {
                                    const response = await fetch(`/api/tasks/${selectedTaskForDetails.id}/attachments/${attachment.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                      },
                                    });
                                    
                                    if (response.ok) {
                                      const updatedTask = await response.json();
                                      setSelectedTaskForDetails(updatedTask);
                                      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
                                      toast({
                                        title: "Attachment deleted",
                                        description: `${attachment.filename} has been removed`,
                                      });
                                    } else {
                                      throw new Error('Delete failed');
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Delete failed",
                                      description: "Failed to delete attachment. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              className="flex items-center gap-1 h-8 text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedTaskForDetails.attachmentUrl && selectedTaskForDetails.attachmentName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <span className="text-sm flex-1">{selectedTaskForDetails.attachmentName}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(selectedTaskForDetails)}
                          className="flex items-center gap-1 h-8"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">No attachments</p>
                    </div>
                  )}
                  
                  {/* Add Additional Documents Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Add Additional Documents</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const file = files[0];
                              if (file.size > 10 * 1024 * 1024) { // 10MB limit
                                toast({
                                  title: "File too large",
                                  description: "Please select a file smaller than 10MB",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              const formData = new FormData();
                              formData.append('attachment', file);
                              
                              try {
                                // Upload file and update task
                                const response = await fetch(`/api/tasks/${selectedTaskForDetails.id}/attachments`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                  },
                                  body: formData,
                                });
                                
                                if (response.ok) {
                                  const updatedTask = await response.json();
                                  toast({
                                    title: "Document uploaded",
                                    description: `${file.name} has been attached to the task`,
                                  });
                                  // Update local state with the new attachment info
                                  setSelectedTaskForDetails(updatedTask);
                                  // Refresh task list
                                  queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
                                  // Clear the file input
                                  e.target.value = '';
                                } else {
                                  throw new Error('Upload failed');
                                }
                              } catch (error) {
                                toast({
                                  title: "Upload failed",
                                  description: "Failed to upload document. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                          className="flex-1"
                        />
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT (Max 10MB)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communications Tab */}
              <Tabs defaultValue="communications" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="communications">Communications</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="communications" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Task Communications</h3>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedTask(selectedTaskForDetails);
                        setIsSendCommunicationOpen(true);
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                  
                  {/* Query and display task communications */}
                  <TaskCommunications taskId={selectedTaskForDetails.id} />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <h3 className="text-lg font-medium">Task History</h3>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {taskHistory.map((history) => (
                      <div key={history.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{history.action}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(history.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {history.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>{history.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {taskHistory.length === 0 && (
                      <div className="text-center py-8">
                        <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No history yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Task changes will be tracked here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Calendar View Component
function CalendarView({ 
  tasks,
  setSelectedTaskForDetails,
  setIsTaskDetailsDialogOpen 
}: { 
  tasks: Task[];
  setSelectedTaskForDetails: (task: Task) => void;
  setIsTaskDetailsDialogOpen: (open: boolean) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<Date | null>(null);
  const { toast } = useToast();

  const createTaskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
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

  const createTaskMutation = useMutation({
    mutationFn: (taskData: InsertTask) => apiRequest("POST", "/api/tasks", taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowCreateTaskDialog(false);
      createTaskForm.reset();
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

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const calendarGrid = generateCalendarGrid();

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.dueDate && new Date(task.dueDate).toDateString() === date.toDateString()
    );
  };

  const previousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDateForTask(date);
    createTaskForm.setValue("dueDate", date.toISOString().split('T')[0]);
    setShowCreateTaskDialog(true);
  };

  const handleCalendarTaskClick = (task: Task) => {
    setSelectedTaskForDetails(task);
    setIsTaskDetailsDialogOpen(true);
  };

  const onCreateTaskSubmit = (data: TaskFormData) => {
    const taskData: InsertTask = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };
    createTaskMutation.mutate(taskData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderMonthView = () => (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-2">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((date, index) => {
          const tasksForDate = date ? getTasksForDate(date) : [];
          const isToday = date && date.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`min-h-24 p-2 border rounded-lg ${
                date ? 'bg-card hover:bg-accent cursor-pointer' : 'bg-muted'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
              onClick={() => date && handleDateClick(date)}
            >
              {date && (
                <>
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'font-bold text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {tasksForDate.slice(0, 2).map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`text-xs p-1 rounded truncate border cursor-pointer hover:scale-105 transition-transform ${getPriorityColor(task.priority)}`}
                        title={task.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCalendarTaskClick(task);
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {tasksForDate.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{tasksForDate.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const events = getTasksForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
        </div>
        
        <div className="border rounded-lg">
          {hours.map(hour => (
            <div key={hour} className="border-b last:border-b-0 p-3 min-h-[60px]">
              <div className="flex">
                <div className="w-20 text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1">
                  {events
                    .filter(() => hour === 9) // Show all events at 9 AM for simplicity
                    .map(task => (
                      <div
                        key={task.id}
                        className={`p-2 rounded border mb-1 cursor-pointer hover:scale-105 transition-transform ${getPriorityColor(task.priority)}`}
                        onClick={() => handleCalendarTaskClick(task)}
                      >
                        <div className="flex items-center space-x-2">
                          <CheckSquare className="h-4 w-4" />
                          <span className="font-medium">{task.title}</span>
                        </div>
                        {task.description && (
                          <div className="text-sm mt-1 text-muted-foreground">
                            {task.description}
                          </div>
                        )}
                      </div>
                    ))}
                  {hour === 9 && events.length === 0 && (
                    <div 
                      className="p-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400 transition-colors text-center text-gray-500 text-sm"
                      onClick={() => handleDateClick(selectedDate)}
                    >
                      + Add Task
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              Week of {weekStart.toLocaleDateString()}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const tasksForDate = getTasksForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className="space-y-2">
                <div className={`text-center p-2 rounded ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="font-medium">{dayNames[day.getDay()]}</div>
                  <div className="text-lg">{day.getDate()}</div>
                </div>
                <div className="space-y-1 min-h-48">
                  {tasksForDate.map(task => (
                    <div
                      key={task.id}
                      className={`text-xs p-2 rounded border cursor-pointer hover:scale-105 transition-transform ${getPriorityColor(task.priority)}`}
                      onClick={() => handleCalendarTaskClick(task)}
                    >
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="mt-1 text-xs opacity-75 line-clamp-2">
                          {task.description}
                        </div>
                      )}
                    </div>
                  ))}
                  <div 
                    className="text-xs p-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400 transition-colors text-center text-gray-500"
                    onClick={() => handleDateClick(day)}
                  >
                    + Add Task
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  let content;
  if (viewMode === 'day') {
    content = renderDayView();
  } else if (viewMode === 'week') {
    content = renderWeekView();
  } else {
    content = renderMonthView();
  }

  return (
    <div className="space-y-4">
      {content}
      
      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <Form {...createTaskForm}>
            <form onSubmit={createTaskForm.handleSubmit(onCreateTaskSubmit)} className="space-y-4">
              <FormField
                control={createTaskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createTaskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={createTaskForm.control}
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
                          {["general", "maintenance", "inspection", "financial", "administrative", "legal", "marketing", "emergency"].map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
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
                  control={createTaskForm.control}
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

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={createTaskForm.control}
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
                        <Input {...field} placeholder="Enter assignee name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createTaskForm.control}
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
                          {properties?.map((property: any) => (
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createTaskForm.control}
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
                          {units?.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {properties?.find((p: any) => p.id === unit.propertyId)?.name || 'Property'}
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
                      <FormLabel>Tenant (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant: any) => (
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

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
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