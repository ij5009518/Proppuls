
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
    title: 'Tasks',
    url: '/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Rent Payments',
    url: '/rent-payments',
    icon: CreditCard,
  },
  {
    title: 'Maintenance',
    url: '/maintenance',
    icon: Wrench,
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
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Building className="h-6 w-6" />
          <span className="font-semibold">Property Manager</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.subItems ? (
                    <div>
                      <SidebarMenuButton
                        onClick={() => toggleExpanded(item.title)}
                        isActive={location.startsWith(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {expandedItems[item.title] ? (
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </SidebarMenuButton>
                      {expandedItems[item.title] && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={location === subItem.url}
                                size="sm"
                              >
                                <Link href={subItem.url} className="text-sm">
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
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
