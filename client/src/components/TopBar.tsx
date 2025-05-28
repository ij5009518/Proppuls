import { Button } from "@/components/ui/button";
import { Menu, Plus, Download, Bell } from "lucide-react";
import { useLocation } from "wouter";

interface TopBarProps {
  onMenuClick: () => void;
  showMenuButton: boolean;
}

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/properties": "Properties",
  "/units": "Units",
  "/tenants": "Tenants",
  "/maintenance": "Maintenance",
  "/vendors": "Vendors",
  "/financials": "Financials",
  "/reports": "Reports",
};

export default function TopBar({ onMenuClick, showMenuButton }: TopBarProps) {
  const [location] = useLocation();
  const currentTitle = pageTitle[location] || "PropertyFlow";

  const handleExport = () => {
    window.open("/api/export/expenses", "_blank");
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-card shadow-sm border-b border-slate-200 dark:border-border">
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="px-4 border-r border-slate-200 dark:border-border text-slate-500 dark:text-muted-foreground lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}
      
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-foreground">
            {currentTitle}
          </h2>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 space-x-3">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground border border-slate-300 dark:border-border"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-500 dark:text-muted-foreground dark:hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-card"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
