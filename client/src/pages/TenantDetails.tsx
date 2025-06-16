import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Edit, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Building,
  Phone,
  Mail,
  Calendar,
  User
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TenantDetails() {
  const params = useParams();
  const tenantId = params.id as string;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedBillingId, setSelectedBillingId] = useState("");

  // Fetch tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  // Fetch tenant billing records
  const { data: billingRecords = [], isLoading: billingLoading } = useQuery({
    queryKey: ["/api/tenants", tenantId, "billing"],
    enabled: !!tenantId,
  });

  // Fetch outstanding balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/tenants", tenantId, "outstanding-balance"],
    enabled: !!tenantId,
  });

  // Fetch unit and property info
  const { data: unit } = useQuery({
    queryKey: ["/api/units", tenant?.unitId],
    enabled: !!tenant?.unitId,
  });

  const { data: property } = useQuery({
    queryKey: ["/api/properties", unit?.propertyId],
    enabled: !!unit?.propertyId,
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (data: { billingId: string; paymentAmount: string; paymentMethod: string }) =>
      apiRequest(`/api/billing-records/${data.billingId}/payment`, "POST", {
        paymentAmount: data.paymentAmount,
        paymentMethod: data.paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "outstanding-balance"] });
      setPaymentDialog(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setSelectedBillingId("");
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const handleRecordPayment = () => {
    if (!selectedBillingId || !paymentAmount || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please fill in all payment details",
        variant: "destructive",
      });
      return;
    }

    recordPaymentMutation.mutate({
      billingId: selectedBillingId,
      paymentAmount,
      paymentMethod,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case "pending":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTenantStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (tenantLoading) {
    return <div className="container mx-auto p-6">Loading tenant details...</div>;
  }

  if (!tenant) {
    return <div className="container mx-auto p-6">Tenant not found</div>;
  }

  const outstandingBalance = balanceData?.outstandingBalance || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/tenants")}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {tenant.firstName} {tenant.lastName}
          </h1>
          <p className="text-muted-foreground">Tenant Details</p>
        </div>
        <Button onClick={() => navigate(`/tenants/${tenantId}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold">${tenant.monthlyRent || "0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  ${balanceLoading ? "..." : outstandingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getTenantStatusBadge(tenant.status)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unit</p>
                <p className="text-2xl font-bold">
                  {unit ? `Unit ${unit.unitNumber}` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p>{tenant.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p>{tenant.phone}</p>
              </div>
            </div>
            {tenant.emergencyContactName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Emergency Contact</p>
                  <p>{tenant.emergencyContactName}</p>
                  {tenant.emergencyContactPhone && (
                    <p className="text-sm text-muted-foreground">{tenant.emergencyContactPhone}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lease Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Property</p>
                <p>{property?.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">
                  {property?.address ? `${property.address}, ${property.city}, ${property.state}` : ""}
                </p>
              </div>
            </div>
            {tenant.leaseStart && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Lease Period</p>
                  <p>
                    {format(new Date(tenant.leaseStart), "MMM dd, yyyy")}
                    {tenant.leaseEnd && (
                      <> - {format(new Date(tenant.leaseEnd), "MMM dd, yyyy")}</>
                    )}
                  </p>
                </div>
              </div>
            )}
            {tenant.securityDeposit && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Security Deposit</p>
                  <p>${tenant.securityDeposit}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Tracking Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
            <DialogTrigger asChild>
              <Button>
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="billing-record">Billing Record</Label>
                  <Select value={selectedBillingId} onValueChange={setSelectedBillingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing record" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingRecords
                        .filter((record: any) => record.status !== "paid")
                        .map((record: any) => (
                          <SelectItem key={record.id} value={record.id}>
                            {record.billingPeriod} - ${record.amount} 
                            ({record.status === "partial" ? `$${record.paidAmount} paid` : "unpaid"})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-amount">Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="online_payment">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRecordPayment}
                    disabled={recordPaymentMutation.isPending}
                  >
                    {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Loading billing records...
                    </TableCell>
                  </TableRow>
                ) : billingRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No billing records found
                    </TableCell>
                  </TableRow>
                ) : (
                  billingRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.billingPeriod}</TableCell>
                      <TableCell>${parseFloat(record.amount).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(record.paidAmount || "0").toFixed(2)}</TableCell>
                      <TableCell>
                        {format(new Date(record.dueDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="capitalize">
                        {record.paymentMethod?.replace("_", " ") || "-"}
                      </TableCell>
                      <TableCell>
                        {record.paidDate 
                          ? format(new Date(record.paidDate), "MMM dd, yyyy")
                          : "-"
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}