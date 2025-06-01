import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FinancialHealthData {
  metric: string;
  value: number;
  maxValue: number;
  color: string;
}

export default function FinancialHealthRadar() {
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: rentPayments = [] } = useQuery({
    queryKey: ["/api/rent-payments"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: kpis } = useQuery({
    queryKey: ["/api/dashboard/kpis"],
  });

  // Calculate financial health metrics
  const calculateMetrics = (): FinancialHealthData[] => {
    const totalProperties = (properties as any[])?.length || 0;
    const totalUnits = (units as any[])?.length || 0;
    const occupiedUnits = (units as any[])?.filter(unit => unit.status === 'occupied')?.length || 0;
    
    // Calculate total revenue (rent payments)
    const totalRevenue = (rentPayments as any[])?.reduce((sum, payment) => {
      return payment.status === 'paid' ? sum + parseFloat(payment.amount || 0) : sum;
    }, 0) || 0;

    // Calculate total expenses
    const totalExpenses = (expenses as any[])?.reduce((sum, expense) => {
      return sum + parseFloat(expense.amount || 0);
    }, 0) || 0;

    // Calculate occupancy rate
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Calculate profit margin
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    // Calculate cash flow score (simplified)
    const cashFlowScore = Math.max(0, Math.min(100, (totalRevenue - totalExpenses) / 1000 * 10));

    // Calculate portfolio diversification (based on number of properties)
    const diversificationScore = Math.min(100, totalProperties * 20);

    return [
      {
        metric: "Revenue Performance",
        value: Math.min(100, totalRevenue / 1000), // Scale to 0-100
        maxValue: 100,
        color: "#22c55e"
      },
      {
        metric: "Expense Control",
        value: Math.max(0, 100 - (totalExpenses / (totalRevenue || 1000) * 100)), // Inverse - lower expenses = higher score
        maxValue: 100,
        color: "#ef4444"
      },
      {
        metric: "Occupancy Rate",
        value: occupancyRate,
        maxValue: 100,
        color: "#3b82f6"
      },
      {
        metric: "Profit Margin",
        value: Math.max(0, profitMargin),
        maxValue: 100,
        color: "#8b5cf6"
      },
      {
        metric: "Cash Flow",
        value: cashFlowScore,
        maxValue: 100,
        color: "#f59e0b"
      },
      {
        metric: "Portfolio Size",
        value: diversificationScore,
        maxValue: 100,
        color: "#06b6d4"
      }
    ];
  };

  const metricsData = calculateMetrics();

  // Prepare data for radar chart
  const radarData = metricsData.map(metric => ({
    metric: metric.metric,
    value: metric.value,
    fullMark: metric.maxValue
  }));

  // Calculate overall health score
  const overallHealth = metricsData.reduce((sum, metric) => sum + metric.value, 0) / metricsData.length;

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: "Excellent", color: "text-green-600", icon: TrendingUp };
    if (score >= 60) return { status: "Good", color: "text-blue-600", icon: TrendingUp };
    if (score >= 40) return { status: "Fair", color: "text-yellow-600", icon: Minus };
    return { status: "Needs Attention", color: "text-red-600", icon: TrendingDown };
  };

  const healthStatus = getHealthStatus(overallHealth);
  const StatusIcon = healthStatus.icon;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-card p-3 border border-slate-200 dark:border-border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Score: <span className="font-semibold text-primary">{data.value.toFixed(1)}</span>/100
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Financial Health Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <StatusIcon className={`h-5 w-5 ${healthStatus.color}`} />
            <span className={`font-medium ${healthStatus.color}`}>
              {healthStatus.status}
            </span>
            <span className="text-sm text-muted-foreground">
              ({overallHealth.toFixed(1)}/100)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" className="text-sm" />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  className="text-xs text-muted-foreground"
                />
                <Radar
                  name="Financial Health"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base mb-4">Metric Breakdown</h3>
            {metricsData.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.metric}</span>
                  <span className="text-sm text-muted-foreground">
                    {metric.value.toFixed(1)}/100
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, metric.value)}%`,
                      backgroundColor: metric.color
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Health Recommendations */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Quick Insights</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {overallHealth < 60 && (
                  <li>• Consider reviewing expense categories for optimization</li>
                )}
                {(metricsData.find(m => m.metric === "Occupancy Rate")?.value || 0) < 80 && (
                  <li>• Focus on reducing vacancy rates</li>
                )}
                {(metricsData.find(m => m.metric === "Portfolio Size")?.value || 0) < 40 && (
                  <li>• Consider expanding your property portfolio</li>
                )}
                <li>• Regular monitoring helps identify trends early</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}