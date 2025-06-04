
import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home,
  Users,
  Building,
  MapPin,
  UserCheck,
  CreditCard,
  Wrench,
  Store,
  DollarSign,
  FileText,
  Building2,
  CheckSquare,
  Calendar,
  Bot,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  subItems?: { title: string; url: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
  },
  {
    title: 'Properties',
    url: '/properties',
    icon: Building,
  },
  {
    title: 'Units',
    url: '/units',
    icon: MapPin,
  },
  {
    title: 'Tenants',
    url: '/tenants',
    icon: UserCheck,
  },
  {
    title: 'Tasks & Maintenance',
    url: '/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Rent Payments',
    url: '/rent-payments',
    icon: CreditCard,
  },
  {
    title: 'Expenses',
    url: '/expenses',
    icon: DollarSign,
  },
  {
    title: 'Financials',
    url: '/financials',
    icon: FileText,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
  },
  {
    title: 'Mortgages',
    url: '/mortgages',
    icon: Building2,
  },
  {
    title: 'AI Assistant',
    url: '/ai-assistant',
    icon: Bot,
  },
  {
    title: 'Settings',
    url: '#',
    icon: ChevronRight,
    subItems: [
      { title: 'Users', url: '/users' }
    ]
  },
];

export default function AppSidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <Building className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground">Property Manager</span>
            <span className="text-xs text-muted-foreground">Real Estate Platform</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.subItems ? (
                    <div>
                      <SidebarMenuButton
                        onClick={() => toggleExpanded(item.title)}
                        isActive={location.startsWith(item.url)}
                        className="w-full rounded-xl px-3 py-3 font-medium transition-all duration-200 hover:bg-accent/60 hover:shadow-sm data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md group"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/50 group-data-[active=true]:from-primary-foreground/20 group-data-[active=true]:to-primary-foreground/10 transition-all duration-200">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-left">{item.title}</span>
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background/50 group-data-[active=true]:bg-primary-foreground/20">
                          {expandedItems[item.title] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </div>
                      </SidebarMenuButton>
                      {expandedItems[item.title] && (
                        <div className="ml-3 mt-2 space-y-1 border-l-2 border-border/30 pl-4">
                          {item.subItems.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={location === subItem.url}
                                size="sm"
                                className="rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent/40 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                              >
                                <Link href={subItem.url} className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-current opacity-60" />
                                  {subItem.title}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      className="w-full rounded-xl px-3 py-3 font-medium transition-all duration-200 hover:bg-accent/60 hover:shadow-sm data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md group"
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/50 group-data-[active=true]:from-primary-foreground/20 group-data-[active=true]:to-primary-foreground/10 transition-all duration-200">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Quick Stats Section */}
        <div className="mt-6 rounded-xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border border-border/30 p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Quick Overview
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Building className="h-3 w-3" />
                Active Properties
              </span>
              <span className="text-sm font-bold text-foreground">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                Total Units
              </span>
              <span className="text-sm font-bold text-foreground">48</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                Occupancy Rate
              </span>
              <span className="text-sm font-bold text-green-600">94%</span>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
