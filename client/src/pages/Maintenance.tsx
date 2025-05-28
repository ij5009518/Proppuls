import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Wrench, Search, Filter, Clock, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { insertMaintenanceRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency, getPriorityColor } from "@/lib/utils";
import type { MaintenanceRequest, Unit, Property, Vendor, Tenant } from "@shared/schema";

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: maintenanceRequests, isLoading: requestsLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance-requests"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm({
    resolver: zodResolver(insertMaintenanceRequestSchema.extend({
      submittedDate: insertMaintenanceRequestSchema.shape.submittedDate.default(new Date()),
    })),
    defaultValues: {
      unitId: 0,
      tenantId: null,
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      submittedDate: new Date(),
      completedDate: null,
      vendorId: null,
      laborCost: null,
      materialCost: null,
      notes: "",
    },
  });

  const createMaintenanceRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/maintenance-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Maintenance request created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create maintenance request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMaintenanceRequestMutation.mutate(data);
  };

  const filteredRequests = maintenanceRequests?.filter((request) => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "open":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      case "low":
        return "default";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "open":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getUnitInfo = (unitId: number) => {
    const unit = units?.find(u => u.id === unitId);
    const property = properties?.find(p => p.id === unit?.propertyId);
    return unit && property ? `${property.name} - Unit ${unit.unitNumber}` : `Unit ${unitId}`;
  };

  const getVendorName = (vendorId: number | null) => {
    if (!vendorId) return null;
    const vendor = vendors?.find(v => v.id === vendorId);
    return vendor?.name;
  };

  const getTenantName = (tenantId: number | null) => {
    if (!tenantId) return null;
    const tenant = tenants?.find(t => t.id === tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : null;
  };

  if (requestsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Maintenance Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit) => {
                            const property = properties?.find(p => p.id === unit.propertyId);
                            return (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {property?.name} - Unit {unit.unitNumber}
                              </SelectItem>
                            );
                          })}
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
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))} defaultValue={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No tenant</SelectItem>
                          {tenants?.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.firstName} {tenant.lastName}
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
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
                        <Textarea placeholder="Detailed description of the maintenance request" {...field} />
                      </FormControl>
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
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))} defaultValue={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No vendor assigned</SelectItem>
                          {vendors?.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMaintenanceRequestMutation.isPending}>
                    {createMaintenanceRequestMutation.isPending ? "Creating..." : "Create Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search maintenance requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Maintenance Requests List */}
      <div className="space-y-4">
        {filteredRequests?.map((request) => (
          <Card key={request.id} className={`hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(request.priority)}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getUnitInfo(request.unitId)}
                    </p>
                    {getTenantName(request.tenantId) && (
                      <p className="text-sm text-muted-foreground">
                        Submitted by: {getTenantName(request.tenantId)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {request.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">{formatDate(request.submittedDate)}</p>
                  </div>
                  
                  {request.completedDate && (
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{formatDate(request.completedDate)}</p>
                    </div>
                  )}

                  {getVendorName(request.vendorId) && (
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="font-medium">{getVendorName(request.vendorId)}</p>
                    </div>
                  )}

                  {(request.laborCost || request.materialCost) && (
                    <div>
                      <p className="text-muted-foreground">Total Cost</p>
                      <p className="font-medium flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatCurrency(
                          (parseFloat(request.laborCost || "0") + parseFloat(request.materialCost || "0"))
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {request.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{request.notes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests?.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-foreground">
            No maintenance requests found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Create your first maintenance request to get started."
            }
          </p>
        </div>
      )}
    </div>
  );
}
