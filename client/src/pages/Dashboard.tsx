import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RevenueChart from "@/components/Charts/RevenueChart";
import ExpenseBreakdown from "@/components/Charts/ExpenseBreakdown";
import FinancialHealthRadar from "@/components/Charts/FinancialHealthRadar";
import {
  DollarSign,
  Home,
  DoorOpen,
  Wrench,
  TrendingUp,
  ArrowUp,
  Plus,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  Calendar,
} from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  };

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis"],
  });

  const { data: propertiesWithStats, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties/with-stats"],
  });

  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["/api/maintenance-requests"],
  });

  const { data: paymentSummaries, isLoading: paymentSummariesLoading } = useQuery({
    queryKey: ["/api/dashboard/payment-summaries"],
  });

  // Auto-generate monthly rent payments on component mount
  const { mutate: generateRentPayments } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/rent-payments/generate-monthly", { 
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to generate payments');
      return response.json();
    },
    onSuccess: () => {
      // Refresh payment summaries after generation
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/payment-summaries"] });
    },
    onError: (error) => {
      console.log("Payment generation skipped:", error.message);
    }
  });

  // Generate payments on first load
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      generateRentPayments();
    }
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "maintenance":
        return "secondary";
      case "inactive":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950";
      case "high":
        return "border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950";
      case "medium":
        return "border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950";
      case "low":
        return "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950";
      default:
        return "border-gray-400 bg-gray-50 dark:border-gray-600 dark:bg-gray-950";
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

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (kpisLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                  <DollarSign className="text-green-600 dark:text-green-400 h-5 w-5" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {kpis?.totalRevenue || "$0"}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <ArrowUp className="mr-1 h-3 w-3" />
                <span>{kpis?.revenueChange || "+0%"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                  <Home className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                    Properties
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {kpis?.totalProperties || 0}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                <Plus className="mr-1 h-3 w-3" />
                <span>+{kpis?.newProperties || 0} this month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                  <DoorOpen className="text-purple-600 dark:text-purple-400 h-5 w-5" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                    Occupancy Rate
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {kpis?.occupancyRate || "0%"}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <ArrowUp className="mr-1 h-3 w-3" />
                <span>{kpis?.occupancyChange || "+0%"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-md flex items-center justify-center">
                  <Wrench className="text-orange-600 dark:text-orange-400 h-5 w-5" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                    Maintenance
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {kpis?.maintenanceRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-orange-600 dark:text-orange-400">
                <span>{kpis?.pendingRequests || 0} pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Revenue</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="text-xs">
                  6M
                </Button>
                <Button size="sm" className="text-xs">
                  1Y
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expense Breakdown</CardTitle>
              <Button variant="link" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdown />
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Radar Chart */}
      <FinancialHealthRadar />

      {/* Payment Summary Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Overview</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateRentPayments()}
              >
                Generate Rent
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentSummariesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                          {formatCurrency(paymentSummaries?.totalRevenue || 0)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {paymentSummaries?.paidPayments || 0} payments received
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          This Month Revenue
                        </p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                          {formatCurrency(paymentSummaries?.currentMonthRevenue || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          Upcoming (30 days)
                        </p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                          {formatCurrency(paymentSummaries?.upcomingPayments || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Outstanding Balance
                        </p>
                        <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                          {formatCurrency(paymentSummaries?.outstandingBalance || 0)}
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          {paymentSummaries?.pendingPayments || 0} pending payments
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Overdue Payments
                        </p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                          {formatCurrency(paymentSummaries?.overduePayments || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Payment Records
                      </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {paymentSummaries?.totalPayments || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flow-root">
              <ul className="-mb-8">
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center ring-8 ring-white dark:ring-card">
                          <CheckCircle className="text-green-600 dark:text-green-400 h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-muted-foreground">
                            New tenant signed lease for Unit 4B
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-muted-foreground">
                          <time>2h ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center ring-8 ring-white dark:ring-card">
                          <DollarSign className="text-blue-600 dark:text-blue-400 h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-muted-foreground">
                            Rent payment received from Unit 2A
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-muted-foreground">
                          <time>4h ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center ring-8 ring-white dark:ring-card">
                          <Wrench className="text-orange-600 dark:text-orange-400 h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-muted-foreground">
                            Maintenance request completed - HVAC repair
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-muted-foreground">
                          <time>6h ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center ring-8 ring-white dark:ring-card">
                          <FileText className="text-purple-600 dark:text-purple-400 h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-muted-foreground">
                            Monthly financial report generated
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-slate-500 dark:text-muted-foreground">
                          <time>1d ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mortgage Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-muted-foreground">
                  Total Principal Balance
                </span>
                <span className="text-lg font-semibold text-slate-900 dark:text-foreground">
                  $847,250
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-muted-foreground">
                  Monthly Payment
                </span>
                <span className="text-lg font-semibold text-slate-900 dark:text-foreground">
                  $4,890
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-muted-foreground">
                  Average Interest Rate
                </span>
                <span className="text-lg font-semibold text-slate-900 dark:text-foreground">
                  3.75%
                </span>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-muted-foreground">Principal Paid</span>
                  <span className="text-slate-900 dark:text-foreground">$152,750</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "15.3%" }}></div>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                View Amortization Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Maintenance Requests</CardTitle>
              <Badge variant="secondary">
                {kpis?.pendingRequests || 0} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceRequests?.slice(0, 3).map((request: any) => (
                  <div
                    key={request.id}
                    className={`flex items-center justify-between border-l-4 p-3 rounded-r-md ${getPriorityColor(
                      request.priority
                    )}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-foreground">
                        {request.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">
                        Unit {request.unitId} - Property {request.propertyId}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getPriorityBadgeVariant(request.priority)}>
                        {request.priority}
                      </Badge>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                        {new Date(request.submittedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="link" className="w-full">
                  View All Requests →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
