import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckSquare, Wrench, Calendar, Edit, Trash2, ChevronLeft, ChevronRight, Grid, List, FileText, Download, Eye, Paperclip, Upload, Mail, Phone, MessageSquare, Clock, User, Send, AlertCircle, X, History as HistoryIcon, DollarSign, CalendarIcon } from "lucide-react";
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
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  category: z.string().min(1, "Category is required"),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  communicationMethod: z.enum(["none", "email", "sms", "both"]).default("none"),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  recipientPhone: z.string().optional(),
});

const communicationFormSchema = z.object({
  method: z.enum(["email", "sms"]),
  recipient: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message is required"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;
type CommunicationFormData = z.infer<typeof communicationFormSchema>;

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
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");

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
      communicationMethod: "none",
      recipientEmail: "",
      recipientPhone: "",
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
      communicationMethod: "none",
      recipientEmail: "",
      recipientPhone: "",
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
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

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: InsertTask) => apiRequest("POST", "/api/tasks", taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddDialogOpen(false);
      form.reset();
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

  const sendCommunicationMutation = useMutation({
    mutationFn: (data: CommunicationFormData & { taskId: string }) =>
      apiRequest("POST", `/api/tasks/${data.taskId}/communications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTask?.id, "communications"] });
      setIsSendCommunicationOpen(false);
      communicationForm.reset();
      toast({
        title: "Success",
        description: "Communication sent successfully",
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

  const onCreateSubmit = (data: TaskFormData) => {
    const taskData: InsertTask = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };
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
    if (!selectedTask) return;
    sendCommunicationMutation.mutate({ ...data, taskId: selectedTask.id });
  };

  const handleSaveDescription = () => {
    if (!selectedTaskForDetails) return;
    
    updateTaskMutation.mutate({ 
      id: selectedTaskForDetails.id, 
      taskData: { ...selectedTaskForDetails, description: editingDescriptionValue }
    }, {
      onSuccess: () => {
        setEditingDescription(false);
      }
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // TODO: Implement file upload functionality
      console.log("Files selected:", files);
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
    });
    setIsEditDialogOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskForDetails(task);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedDocument(file);
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
                <div className="grid grid-cols-2 gap-4">
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
                            {taskCategories.map((category) => (
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
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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

                {/* Communication Settings */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium">Communication Settings</h3>
                  
                  <FormField
                    control={form.control}
                    name="communicationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Communication Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="both">Both Email & SMS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(form.watch("communicationMethod") === "email" || form.watch("communicationMethod") === "both") && (
                    <FormField
                      control={form.control}
                      name="recipientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Enter recipient email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(form.watch("communicationMethod") === "sms" || form.watch("communicationMethod") === "both") && (
                    <FormField
                      control={form.control}
                      name="recipientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="Enter recipient phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
          <CalendarView tasks={filteredTasks} />
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
              <div className="grid grid-cols-2 gap-4">
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
                          {taskCategories.map((category) => (
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
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

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

              {/* Communication Settings */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium">Communication Settings</h3>
                
                <FormField
                  control={editForm.control}
                  name="communicationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="both">Both Email & SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(editForm.watch("communicationMethod") === "email" || editForm.watch("communicationMethod") === "both") && (
                  <FormField
                    control={editForm.control}
                    name="recipientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Enter recipient email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(editForm.watch("communicationMethod") === "sms" || editForm.watch("communicationMethod") === "both") && (
                  <FormField
                    control={editForm.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Phone</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="Enter recipient phone number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedTaskForDetails) {
                      handleEdit(selectedTaskForDetails);
                      setIsTaskDetailsDialogOpen(false);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
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
              {/* Quick Edit Fields */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select 
                        value={selectedTaskForDetails.status} 
                        onValueChange={(value) => {
                          updateTaskMutation.mutate({ 
                            id: selectedTaskForDetails.id, 
                            taskData: { ...selectedTaskForDetails, status: value as any }
                          });
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
                      <label className="text-sm font-medium">Priority</label>
                      <Select 
                        value={selectedTaskForDetails.priority} 
                        onValueChange={(value) => {
                          updateTaskMutation.mutate({ 
                            id: selectedTaskForDetails.id, 
                            taskData: { ...selectedTaskForDetails, priority: value as any }
                          });
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
                      <label className="text-sm font-medium">Due Date</label>
                      <Input
                        type="date"
                        value={selectedTaskForDetails.dueDate ? new Date(selectedTaskForDetails.dueDate).toISOString().split('T')[0] : ""}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          updateTaskMutation.mutate({ 
                            id: selectedTaskForDetails.id, 
                            taskData: { ...selectedTaskForDetails, dueDate: newDate }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigned To</label>
                      <Input
                        value={selectedTaskForDetails.assignedTo || ""}
                        onChange={(e) => {
                          updateTaskMutation.mutate({ 
                            id: selectedTaskForDetails.id, 
                            taskData: { ...selectedTaskForDetails, assignedTo: e.target.value }
                          });
                        }}
                        placeholder="Enter assignee"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Task Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingDescriptionValue}
                        onChange={(e) => setEditingDescriptionValue(e.target.value)}
                        className="min-h-[80px]"
                        placeholder="Enter task description..."
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveDescription}
                          disabled={updateTaskMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditingDescription(false);
                            setEditingDescriptionValue(selectedTaskForDetails.description);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded border-dashed border border-transparent hover:border-gray-300 min-h-[40px]"
                      onClick={() => {
                        setEditingDescription(true);
                        setEditingDescriptionValue(selectedTaskForDetails.description);
                      }}
                    >
                      {selectedTaskForDetails.description || "Click to add description..."}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* File Attachments */}
              <Card>
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0px] pb-[0px]">
                  <CardTitle className="text-lg">Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        id="file-upload"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload files or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 flex items-center">
                        <Paperclip className="mr-1 h-3 w-3" />
                        No files attached yet
                      </div>
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
                  
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No communications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Communications will appear here when sent</p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <h3 className="text-lg font-medium">Task History</h3>
                  
                  <div className="text-center py-8">
                    <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No history yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Task changes will be tracked here</p>
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
      communicationMethod: "none",
      recipientEmail: "",
      recipientPhone: "",
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
                      onClick={() => handleTaskClick(task)}
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
              <div className="grid grid-cols-2 gap-4">
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
                          {taskCategories.map((category) => (
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
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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