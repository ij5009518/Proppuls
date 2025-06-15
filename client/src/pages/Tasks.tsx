import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckSquare, Wrench, Calendar, Edit, Trash2, ChevronLeft, ChevronRight, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema, type Task, type InsertTask } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getPriorityColor } from "@/lib/utils";

const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function Tasks() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      category: "general",
      assignedTo: "",
      estimatedHours: 0,
      actualHours: 0,
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
      assignedTo: "",
      estimatedHours: 0,
      actualHours: 0,
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
    mutationFn: ({ id, ...taskData }: Partial<Task> & { id: string }) =>
      apiRequest("PUT", `/api/tasks/${id}`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setSelectedTask(null);
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
      id: selectedTask.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };
    updateTaskMutation.mutate(taskData);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    editForm.reset({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      category: task.category,
      assignedTo: task.assignedTo || "",
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      propertyId: task.propertyId || undefined,
      unitId: task.unitId || undefined,
      tenantId: task.tenantId || undefined,
      vendorId: task.vendorId || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  const getRelatedEntityName = (task: Task) => {
    if (task.propertyId) {
      const property = properties.find((p: any) => p.id === task.propertyId);
      return property ? `Property: ${property.name}` : "";
    }
    if (task.unitId) {
      const unit = units.find((u: any) => u.id === task.unitId);
      return unit ? `Unit: ${unit.name}` : "";
    }
    if (task.tenantId) {
      const tenant = tenants.find((t: any) => t.id === task.tenantId);
      return tenant ? `Tenant: ${tenant.firstName} ${tenant.lastName}` : "";
    }
    if (task.vendorId) {
      const vendor = vendors.find((v: any) => v.id === task.vendorId);
      return vendor ? `Vendor: ${vendor.name}` : "";
    }
    return "";
  };

  const filteredTasks = tasks.filter((task: Task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const taskCategories = [
    "general",
    "maintenance",
    "inspection",
    "lease",
    "payment",
    "vendor",
    "legal",
    "administrative"
  ];

  if (tasksLoading) {
    return <div className="flex justify-center items-center min-h-96">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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

                      <div className="grid grid-cols-3 gap-4">
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

            {/* Tasks List */}
            <div className="grid gap-4">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No tasks found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first task to get started.
                  </p>
                </div>
              ) : (
                tasks.map((task: any) => (
                  <Card key={task.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
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
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                task.priority === "urgent" ? "bg-red-100 text-red-800" :
                                task.priority === "high" ? "bg-orange-100 text-orange-800" :
                                task.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                task.status === "completed" ? "bg-green-100 text-green-800" :
                                task.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                                task.status === "cancelled" ? "bg-red-100 text-red-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                              </span>
                              <span>Category: {task.category}</span>
                              {task.dueDate && (
                                <span>Due: {formatDate(task.dueDate)}</span>
                              )}
                            </div>
                            {getRelatedEntityName(task) && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {getRelatedEntityName(task)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Maintenance Requests</h2>
              <Button>
                <Wrench className="mr-2 h-4 w-4" />
                Add Maintenance Request
              </Button>
            </div>
            
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
          <CalendarView tasks={tasks as Task[]} />
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

              <div className="grid grid-cols-3 gap-4">
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
    </div>
  );
}

// Calendar component for tasks
function CalendarView({ tasks }: { tasks: Task[] }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={previousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </h2>
        <Button variant="outline" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((date, index) => {
          const tasksForDate = date ? getTasksForDate(date) : [];
          
          return (
            <div
              key={index}
              className={`min-h-24 p-2 border rounded-lg ${
                date ? 'bg-card hover:bg-accent cursor-pointer' : 'bg-muted'
              }`}
            >
              {date && (
                <>
                  <div className="text-sm font-medium mb-1">
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {tasksForDate.slice(0, 2).map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`text-xs p-1 rounded truncate ${
                          getPriorityColor(task.priority)
                        }`}
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
}