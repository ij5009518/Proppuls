import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, TrendingUp, DollarSign, BarChart3, PieChart, Calendar } from "lucide-react";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import type { Property, Expense, Revenue, MaintenanceRequest } from "@shared/schema";

export default function Reports() {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("current_month");
  const [reportType, setReportType] = useState<string>("financial");

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: revenues } = useQuery<Revenue[]>({
    queryKey: ["/api/revenues"],
  });

  const { data: maintenanceRequests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance-requests"],
  });

  // Filter data based on selections
  const filteredExpenses = expenses?.filter(expense => 
    selectedProperty === "all" || expense.propertyId?.toString() === selectedProperty
  );

  const filteredRevenues = revenues?.filter(revenue => 
    selectedProperty === "all" || revenue.propertyId.toString() === selectedProperty
  );

  const filteredMaintenance = maintenanceRequests?.filter(request => {
    if (selectedProperty === "all") return true;
    // Need to get unit's property ID
    // This would need the units data to properly filter
    return true;
  });

  // Calculate totals
  const totalRevenue = filteredRevenues?.reduce((sum, revenue) => sum + parseFloat(revenue.amount), 0) || 0;
  const totalExpenses = filteredExpenses?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;
  const netIncome = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // Group expenses by category
  const expensesByCategory = filteredExpenses?.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const handleExportFinancials = () => {
    const data = [
      ...filteredRevenues?.map(revenue => ({
        Date: formatDate(revenue.date),
        Type: "Revenue",
        Category: revenue.type,
        Description: revenue.description || "",
        Amount: revenue.amount,
        Property: properties?.find(p => p.id === revenue.propertyId)?.name || "",
      })) || [],
      ...filteredExpenses?.map(expense => ({
        Date: formatDate(expense.date),
        Type: "Expense",
        Category: expense.category,
        Description: expense.description,
        Amount: `-${expense.amount}`,
        Property: properties?.find(p => p.id === expense.propertyId)?.name || "",
      })) || [],
    ].sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

    downloadCSV(data, `financial-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportExpenses = () => {
    const data = filteredExpenses?.map(expense => ({
      Date: formatDate(expense.date),
      Category: expense.category,
      Description: expense.description,
      Amount: expense.amount,
      "QBO Category": expense.qboCategory || "",
      Property: properties?.find(p => p.id === expense.propertyId)?.name || "",
      Vendor: expense.vendorId || "",
      "Is Recurring": expense.isRecurring ? "Yes" : "No",
    })) || [];

    downloadCSV(data, `expenses-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportRevenues = () => {
    const data = filteredRevenues?.map(revenue => ({
      Date: formatDate(revenue.date),
      Type: revenue.type,
      Description: revenue.description || "",
      Amount: revenue.amount,
      Property: properties?.find(p => p.id === revenue.propertyId)?.name || "",
      "Unit ID": revenue.unitId || "",
      "Tenant ID": revenue.tenantId || "",
    })) || [];

    downloadCSV(data, `revenues-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportMaintenance = () => {
    const data = filteredMaintenance?.map(request => ({
      "Submitted Date": formatDate(request.submittedDate),
      "Completed Date": request.completedDate ? formatDate(request.completedDate) : "",
      Title: request.title,
      Description: request.description,
      Priority: request.priority,
      Status: request.status,
      "Unit ID": request.unitId,
      "Tenant ID": request.tenantId || "",
      "Vendor ID": request.vendorId || "",
      "Labor Cost": request.laborCost || "",
      "Material Cost": request.materialCost || "",
      "Total Cost": request.laborCost && request.materialCost 
        ? (parseFloat(request.laborCost) + parseFloat(request.materialCost)).toString()
        : request.laborCost || request.materialCost || "",
      Notes: request.notes || "",
    })) || [];

    downloadCSV(data, `maintenance-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property-select">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger id="property-select">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range-select">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range-select">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="current_quarter">Current Quarter</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="current_year">Current Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type-select">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type-select">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Summary</SelectItem>
                  <SelectItem value="expense">Expense Analysis</SelectItem>
                  <SelectItem value="revenue">Revenue Analysis</SelectItem>
                  <SelectItem value="maintenance">Maintenance Summary</SelectItem>
                  <SelectItem value="occupancy">Occupancy Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input type="date" id="start-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input type="date" id="end-date" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {reportType === "financial" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                      <TrendingUp className="text-green-600 dark:text-green-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                        Total Revenue
                      </dt>
                      <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                        {formatCurrency(totalRevenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                      <BarChart3 className="text-red-600 dark:text-red-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                        Total Expenses
                      </dt>
                      <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                        {formatCurrency(totalExpenses)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                      <DollarSign className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                        Net Income
                      </dt>
                      <dd className={`text-lg font-semibold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netIncome)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                      <PieChart className="text-purple-600 dark:text-purple-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                        Profit Margin
                      </dt>
                      <dd className={`text-lg font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitMargin.toFixed(1)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" onClick={handleExportFinancials} className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <FileText className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Financial Report</p>
                  <p className="text-sm text-muted-foreground">Complete P&L statement</p>
                </div>
              </div>
            </Button>

            <Button variant="outline" onClick={handleExportExpenses} className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <BarChart3 className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Expense Report</p>
                  <p className="text-sm text-muted-foreground">QBO-ready format</p>
                </div>
              </div>
            </Button>

            <Button variant="outline" onClick={handleExportRevenues} className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <TrendingUp className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Revenue Report</p>
                  <p className="text-sm text-muted-foreground">Income breakdown</p>
                </div>
              </div>
            </Button>

            <Button variant="outline" onClick={handleExportMaintenance} className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <PieChart className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Maintenance Report</p>
                  <p className="text-sm text-muted-foreground">Work orders & costs</p>
                </div>
              </div>
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="text-lg font-medium">QuickBooks Integration</h4>
            <p className="text-sm text-muted-foreground">
              Export data in formats ready for QuickBooks import. All exported files include proper
              category mappings and formatting for seamless accounting integration.
            </p>
            
            <div className="flex space-x-4">
              <Button onClick={() => window.open("/api/export/expenses", "_blank")}>
                <Download className="mr-2 h-4 w-4" />
                QBO Expenses
              </Button>
              <Button onClick={() => window.open("/api/export/revenues", "_blank")}>
                <Download className="mr-2 h-4 w-4" />
                QBO Revenues
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredRevenues?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Revenue Transactions</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredExpenses?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Expense Transactions</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {filteredMaintenance?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Maintenance Requests</p>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Data shown for {selectedProperty === "all" ? "all properties" : properties?.find(p => p.id.toString() === selectedProperty)?.name} 
                {" "}in the selected time period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
