import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, Calculator } from "lucide-react";
import { formatCurrency, formatPercent, calculateMonthsRemaining } from "@/lib/utils";
import RevenueChart from "@/components/Charts/RevenueChart";
import ExpenseBreakdown from "@/components/Charts/ExpenseBreakdown";
import type { Property, Mortgage, Expense, Revenue } from "@shared/schema";

export default function Financials() {
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: mortgages, isLoading: mortgagesLoading } = useQuery<Mortgage[]>({
    queryKey: ["/api/mortgages"],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: revenues, isLoading: revenuesLoading } = useQuery<Revenue[]>({
    queryKey: ["/api/revenues"],
  });

  // Calculate financial metrics
  const totalRevenue = revenues?.reduce((sum, revenue) => sum + parseFloat(revenue.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;
  const netIncome = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  const totalMortgageBalance = mortgages?.reduce((sum, mortgage) => sum + parseFloat(mortgage.currentBalance), 0) || 0;
  const totalMonthlyPayments = mortgages?.reduce((sum, mortgage) => sum + parseFloat(mortgage.monthlyPayment), 0) || 0;
  const averageInterestRate = mortgages?.length 
    ? mortgages.reduce((sum, mortgage) => sum + parseFloat(mortgage.interestRate), 0) / mortgages.length 
    : 0;

  const totalPurchasePrice = properties?.reduce((sum, property) => sum + parseFloat(property.purchasePrice), 0) || 0;
  const totalEquity = totalPurchasePrice - totalMortgageBalance;

  if (propertiesLoading || mortgagesLoading || expensesLoading || revenuesLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Financials</h1>
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financials</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calculator className="mr-2 h-4 w-4" />
            Mortgage Calculator
          </Button>
          <Button>
            Export Financial Data
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
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
                    Net Income
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {formatCurrency(netIncome)}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className={`flex items-center text-sm ${netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {netIncome >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                <span>{formatPercent(profitMargin)} profit margin</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                  <TrendingUp className="text-blue-600 dark:text-blue-400 h-5 w-5" />
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
            <div className="mt-2">
              <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                <span>Monthly average</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-md flex items-center justify-center">
                  <CreditCard className="text-orange-600 dark:text-orange-400 h-5 w-5" />
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
            <div className="mt-2">
              <div className="flex items-center text-sm text-orange-600 dark:text-orange-400">
                <span>Monthly average</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                  <PiggyBank className="text-purple-600 dark:text-purple-400 h-5 w-5" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-muted-foreground truncate">
                    Total Equity
                  </dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-foreground">
                    {formatCurrency(totalEquity)}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                <span>{formatPercent((totalEquity / totalPurchasePrice) * 100)} of value</span>
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
              <CardTitle>Revenue Trend</CardTitle>
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
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdown />
          </CardContent>
        </Card>
      </div>

      {/* Mortgage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mortgage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-muted-foreground">
                    Total Balance
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-foreground">
                    {formatCurrency(totalMortgageBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-muted-foreground">
                    Monthly Payments
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-foreground">
                    {formatCurrency(totalMonthlyPayments)}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-muted-foreground">Average Interest Rate</span>
                  <span className="text-slate-900 dark:text-foreground font-medium">
                    {formatPercent(averageInterestRate)}
                  </span>
                </div>
                <Progress value={averageInterestRate * 20} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-muted-foreground">Loan-to-Value Ratio</span>
                  <span className="text-slate-900 dark:text-foreground font-medium">
                    {formatPercent((totalMortgageBalance / totalPurchasePrice) * 100)}
                  </span>
                </div>
                <Progress value={(totalMortgageBalance / totalPurchasePrice) * 100} className="h-2" />
              </div>

              <Button variant="outline" className="w-full">
                View Detailed Amortization
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individual Mortgages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mortgages?.slice(0, 3).map((mortgage, index) => {
                const property = properties?.find(p => p.id === mortgage.propertyId);
                const monthsRemaining = calculateMonthsRemaining(mortgage.startDate, mortgage.termYears);
                const totalMonths = mortgage.termYears * 12;
                const progressPercent = ((totalMonths - monthsRemaining) / totalMonths) * 100;

                return (
                  <div key={mortgage.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-foreground">
                          {property?.name || `Property ${mortgage.propertyId}`}
                        </h4>
                        <p className="text-sm text-muted-foreground">{mortgage.lender}</p>
                      </div>
                      <Badge variant="outline">
                        {formatPercent(parseFloat(mortgage.interestRate))}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Current Balance</p>
                        <p className="font-medium">{formatCurrency(mortgage.currentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly Payment</p>
                        <p className="font-medium">{formatCurrency(mortgage.monthlyPayment)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Payment Progress</span>
                        <span className="text-muted-foreground">
                          {monthsRemaining} months remaining
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </div>
                );
              })}

              {mortgages && mortgages.length > 3 && (
                <Button variant="link" className="w-full">
                  View All Mortgages →
                </Button>
              )}

              {(!mortgages || mortgages.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No mortgages found</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Mortgage
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Income</p>
              <div className="mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Expenses</p>
              <div className="mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netIncome)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Net Cash Flow</p>
              <div className="mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${totalRevenue > 0 ? Math.abs(netIncome / totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
