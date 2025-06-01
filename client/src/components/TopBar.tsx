import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Download, Bell, Search, Settings, User, LogOut } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const { user, logout } = useAuth();
  const currentTitle = pageTitle[location] || "PropertyFlow";

  const handleExport = () => {
    window.open("/api/export/expenses", "_blank");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    console.log("Searching for:", searchTerm);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
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
        <div className="flex-1 flex items-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-foreground mr-6">
            {currentTitle}
          </h2>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search properties, tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-slate-50 dark:bg-accent border-slate-200 dark:border-border focus:bg-white dark:focus:bg-card"
            />
          </form>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 space-x-3">
          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExport}
            className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground border border-slate-300 dark:border-border"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          {/* Notifications */}
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

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-500 dark:text-muted-foreground dark:hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild>
                <Link href="/users">
                  <User className="mr-2 h-4 w-4" />
                  <span>Users</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>General Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu - Rightmost */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.firstName && user?.lastName && (
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                  )}
                  {user?.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
