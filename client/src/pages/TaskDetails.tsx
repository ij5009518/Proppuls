import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Trash2, Calendar, User, Tag, AlertCircle, CheckCircle, Clock, X, Paperclip, Upload, Eye, Download, Mail, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "shared/schema";

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

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskDetailsProps {
  task: Task;
  onBack: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

export default function TaskDetails({ task, onBack, onTaskUpdated, onTaskDeleted }: TaskDetailsProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      assignedTo: task.assignedTo || "",
      communicationMethod: task.communicationMethod || "none",
      recipientEmail: task.recipientEmail || "",
      recipientPhone: task.recipientPhone || "",
    },
  });

  // Reset form when task changes or dialog opens
  const resetFormWithTaskData = () => {
    form.reset({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      assignedTo: task.assignedTo || "",
      communicationMethod: task.communicationMethod || "none",
      recipientEmail: task.recipientEmail || "",
      recipientPhone: task.recipientPhone || "",
    });
  };

  // Fetch related data
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: tenants } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, taskData }: { id: string; taskData: any }) =>
      apiRequest("PUT", `/api/tasks/${id}`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditDialogOpen(false);
      onTaskUpdated();
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
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
      onTaskDeleted();
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onEditSubmit = (data: TaskFormData) => {
    const taskData = {
      title: data.title,
      description: data.description,
      status: data.status as "pending" | "in_progress" | "completed" | "cancelled",
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      category: data.category,
      assignedTo: data.assignedTo || "",
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      communicationMethod: data.communicationMethod || "none",
      recipientEmail: data.recipientEmail || "",
      recipientPhone: data.recipientPhone || "",
      propertyId: task.propertyId,
      unitId: task.unitId,
      tenantId: task.tenantId,
      vendorId: task.vendorId,
    };
    updateTaskMutation.mutate({ id: task.id, taskData });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedDocument(file);
    }
  };

  const getRelatedEntityName = () => {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString();
  };

  const taskCategories = [
    "general",
    "maintenance",
    "inspection",
    "repair",
    "cleaning",
    "landscaping",
    "administrative",
    "tenant_communication",
    "vendor_coordination",
    "emergency",
  ];

  return (
    <div className="max-h-screen overflow-y-auto">
      {/* Header matching Property Details layout exactly */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{task.title} - Task Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetFormWithTaskData();
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Task Overview - Compact Layout */}
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Task Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge className={task.status === "completed" ? "bg-green-100 text-green-800 border-green-200" : task.status === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                  {task.status.replace("_", " ").charAt(0).toUpperCase() + task.status.replace("_", " ").slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Badge className={task.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" : task.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <p className="text-sm text-muted-foreground capitalize">{task.category}</p>
              </div>
              {task.assignedTo && (
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <p className="text-sm text-muted-foreground">{task.assignedTo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Details & Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details & Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.dueDate && (
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <p className="text-sm text-muted-foreground">{formatDate(task.dueDate)}</p>
                </div>
              )}
              {getRelatedEntityName() && (
                <div>
                  <label className="text-sm font-medium">Related To</label>
                  <p className="text-sm text-muted-foreground">{getRelatedEntityName()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">{formatDate(task.createdAt)}</p>
              </div>
              <div className="pt-2 border-t">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {task.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication Settings */}
        {task.communicationMethod && task.communicationMethod !== "none" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Communication Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Method</label>
                <div className="flex items-center gap-2 mt-1">
                  {task.communicationMethod === "email" && <Mail className="h-4 w-4" />}
                  {task.communicationMethod === "sms" && <Phone className="h-4 w-4" />}
                  {task.communicationMethod === "both" && <MessageSquare className="h-4 w-4" />}
                  <span className="text-sm text-muted-foreground">{task.communicationMethod.toUpperCase()}</span>
                </div>
              </div>
              {task.recipientEmail && (
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{task.recipientEmail}</p>
                </div>
              )}
              {task.recipientPhone && (
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{task.recipientPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}


      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
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
                      <Textarea {...field} rows={3} />
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

              <div>
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Document Upload Section */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Documents</label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('document-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                    {uploadedDocument && (
                      <>
                        <Button type="button" variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button type="button" variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                  <input
                    id="document-upload"
                    type="file"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {uploadedDocument && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {uploadedDocument.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Communication Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold">Communication Settings</h3>
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
                          <SelectItem value="both">Both</SelectItem>
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
                          <Input type="email" {...field} />
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
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}