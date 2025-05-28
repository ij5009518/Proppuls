import { Link, useLocation } from "wouter";
import { 
  Building, 
  Home, 
  DoorOpen, 
  Users, 
  Wrench, 
  HandHeart, 
  TrendingUp, 
  FileText,
  BarChart3,
  DollarSign,
  LogIn,
  LogOut,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClose?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Properties", href: "/properties", icon: Home },
  { name: "Units", href: "/units", icon: DoorOpen },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Mortgages", href: "/mortgages", icon: DollarSign },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Vendors", href: "/vendors", icon: HandHeart },
  { name: "Financials", href: "/financials", icon: TrendingUp },
  { name: "Reports", href: "/reports", icon: FileText },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-sidebar border-r border-slate-200 dark:border-sidebar-border">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building className="text-primary-foreground h-5 w-5" />
            </div>
            <h1 className="ml-3 text-xl font-bold text-slate-900 dark:text-sidebar-foreground">
              PropertyFlow
            </h1>
          </div>
        </div>

        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? "bg-primary/10 border-r-2 border-primary text-primary"
                      : "text-slate-600 dark:text-sidebar-foreground hover:bg-slate-50 dark:hover:bg-sidebar-accent hover:text-slate-900 dark:hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    isActive
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-slate-500 dark:text-sidebar-foreground"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 dark:border-sidebar-border p-4">
        {/* Check if user is logged in */}
        {localStorage.getItem("token") ? (
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-300 dark:bg-sidebar-accent rounded-full flex items-center justify-center">
                <Users className="text-slate-600 dark:text-sidebar-accent-foreground h-4 w-4" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-sidebar-foreground">
                  {JSON.parse(localStorage.getItem("user") || "{}").firstName || "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-sidebar-foreground/70">
                  {JSON.parse(localStorage.getItem("user") || "{}").email || "user@example.com"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="default" size="sm" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}