
import React from 'react';
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

const menuItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
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
    title: 'Vendors',
    url: '/vendors',
    icon: Store,
  },
  {
    title: 'Financials',
    url: '/financials',
    icon: DollarSign,
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
];

export default function AppSidebar() {
  const [location] = useLocation();

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
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
