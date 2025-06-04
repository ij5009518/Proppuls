import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

const expenseColors: Record<string, string> = {
  maintenance: "bg-blue-500",
  utilities: "bg-green-500",
  water: "bg-cyan-500",
  sewer: "bg-teal-500",
  sanitation: "bg-emerald-500",
  insurance: "bg-purple-500",
  taxes: "bg-orange-500",
  management: "bg-red-500",
  landscaping: "bg-yellow-500",
  repairs: "bg-indigo-500",
  legal: "bg-slate-500",
  marketing: "bg-pink-500",
  supplies: "bg-amber-500",
  improvements: "bg-violet-500",
  other: "bg-gray-500",
};

export default function ExpenseBreakdown() {
  const { data: expensesByCategory, isLoading } = useQuery({
    queryKey: ["/api/expenses/by-category"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex justify-between items-center mb-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!expensesByCategory || expensesByCategory.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expensesByCategory.map((expense: any) => (
        <div key={expense.category} className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-3 ${
              expenseColors[expense.category] || expenseColors.other
            }`}
          />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-foreground capitalize">
                {expense.category}
              </span>
              <span className="text-sm text-slate-900 dark:text-foreground font-semibold">
                ${expense.amount.toLocaleString()}
              </span>
            </div>
            <Progress
              value={expense.percentage}
              className="mt-1 h-2"
              indicatorClassName={expenseColors[expense.category] || expenseColors.other}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
