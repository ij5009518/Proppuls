import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "occupied":
    case "completed":
      return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
    case "vacant":
    case "pending":
    case "in_progress":
      return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
    case "maintenance":
    case "open":
      return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900";
    case "inactive":
    case "cancelled":
      return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
    default:
      return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
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
}

export function calculateMonthsRemaining(startDate: Date, termYears: number): number {
  const start = new Date(startDate);
  const endDate = new Date(start.getFullYear() + termYears, start.getMonth(), start.getDate());
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  return Math.max(0, diffMonths);
}

export function calculateROI(monthlyRevenue: number, monthlyExpenses: number, initialInvestment: number): number {
  const annualNetIncome = (monthlyRevenue - monthlyExpenses) * 12;
  return (annualNetIncome / initialInvestment) * 100;
}

export function downloadCSV(data: any[], filename: string): void {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
