import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Plus, 
  Calendar, 
  DollarSign, 
  Shield,
  Clock,
  Users,
  Building,
  Search,
  Filter
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Lease {
  id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit?: number;
  status: string;
  lease_terms?: string;
  created_at: string;
  updated_at: string;
}

export default function LeaseManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: leases = [], isLoading } = useQuery({
    queryKey: ["/api/leases"],
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const createLeaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/leases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Lease created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create lease",
        variant: "destructive",
      });
    },
  });

  const renewLeaseMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      const response = await apiRequest("POST", `/api/leases/${leaseId}/renew`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      toast({
        title: "Success",
        description: "Lease renewal initiated",
      });
    },
  });

  const handleCreateLease = (formData: FormData) => {
    const data = {
      tenant_id: formData.get("tenant_id"),
      unit_id: formData.get("unit_id"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      rent_amount: parseFloat(formData.get("rent_amount") as string),
      security_deposit: formData.get("security_deposit") ? parseFloat(formData.get("security_deposit") as string) : undefined,
      lease_terms: formData.get("lease_terms"),
      status: "active"
    };
    createLeaseMutation.mutate(data);
  };

  const filteredLeases = Array.isArray(leases) ? leases.filter((lease: Lease) => {
    const matchesSearch = lease.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lease.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      terminated: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    };
    return <Badge className={variants[status] || variants.pending}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Lease Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage digital leases, renewals, and tenant agreements
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Lease
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lease</DialogTitle>
              <DialogDescription>
                Add a new lease agreement for a tenant and unit
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateLease(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant_id">Tenant</Label>
                  <Select name="tenant_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(tenants) && tenants.map((tenant: any) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Unit</Label>
                  <Select name="unit_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(units) && units.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input name="start_date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input name="end_date" type="date" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Monthly Rent</Label>
                  <Input name="rent_amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit</Label>
                  <Input name="security_deposit" type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease_terms">Lease Terms</Label>
                <Textarea name="lease_terms" placeholder="Enter specific lease terms and conditions..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeaseMutation.isPending}>
                  {createLeaseMutation.isPending ? "Creating..." : "Create Lease"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6">
        {filteredLeases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Leases Found</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "No leases match your current filters"
                  : "Get started by creating your first lease agreement"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Lease
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredLeases.map((lease: Lease) => (
            <Card key={lease.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lease #{lease.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(lease.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Rent</p>
                      <p className="font-semibold">${lease.rent_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  {lease.security_deposit && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Security Deposit</p>
                        <p className="font-semibold">${lease.security_deposit.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                      <p className="font-semibold">
                        {Math.max(0, Math.ceil((new Date(lease.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                      </p>
                    </div>
                  </div>
                </div>
                
                {lease.lease_terms && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{lease.lease_terms}</p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {lease.status === "active" && (
                    <Button 
                      size="sm"
                      onClick={() => renewLeaseMutation.mutate(lease.id)}
                      disabled={renewLeaseMutation.isPending}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Renew Lease
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}