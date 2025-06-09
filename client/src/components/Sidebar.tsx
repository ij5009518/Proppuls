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
  Calendar,
  Bot,
  Settings,
  Mail,
  Zap,
  Sparkles,
} from 'lucide-react';
import logoImage from "@assets/ChatGPT Image Jun 8, 2025, 10_55_20 PM_1749438382648.png";
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
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        url: '/',
        icon: Home,
      },
    ]
  },
  {
    title: 'Property Management',
    items: [
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
    ]
  },
  {
    title: 'Financial Management',
    items: [
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
        title: 'Mortgages',
        url: '/mortgages',
        icon: Building2,
      },
    ]
  },
  {
    title: 'Business Operations',
    items: [
      {
        title: 'Reports',
        url: '/reports',
        icon: FileText,
      },
      {
        title: 'Advanced Features',
        url: '/advanced-features',
        icon: Zap,
      },
      {
        title: 'AI Assistant',
        url: '/ai-assistant',
        icon: Bot,
      },
    ]
  },
  {
    title: 'System',
    items: [
      {
        title: 'Settings',
        url: '/settings',
        icon: Settings,
      },
    ]
  }
];

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3 px-4 py-4">
          <img 
            src={logoImage} 
            alt="PropertyFlow Logo" 
            className="h-10 w-10 rounded-xl object-contain shadow-lg"
          />
          <div className="flex flex-col">
            <span className="font-bold text-foreground">PropertyFlow</span>
            <span className="text-xs text-muted-foreground">Property Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        {menuSections.map((section) => (
          <SidebarGroup key={section.title} className="mb-4">
            <div className="px-3 pb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h4>
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
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
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}