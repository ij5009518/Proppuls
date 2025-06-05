import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  CreditCard, 
  Shield, 
  Scale, 
  Smartphone,
  Building,
  Users,
  ClipboardCheck,
  Mail,
  TrendingUp,
  Zap,
  Lock,
  Gavel
} from "lucide-react";

export default function AdvancedFeatures() {
  const featureCategories = [
    {
      id: "lease-management",
      title: "Lease Management System",
      description: "Digital lease creation, e-signatures, renewals, and automated rent escalations",
      icon: FileText,
      status: "Available",
      route: "/lease-management",
      features: [
        "Digital lease creation with e-signature integration",
        "Automated lease renewals and notifications",
        "Rent escalation tracking and calculations",
        "Security deposit management and tracking",
        "Lease term monitoring and alerts"
      ],
      bgColor: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      id: "document-management",
      title: "Document Management Hub",
      description: "Centralized document storage with smart categorization and expiration tracking",
      icon: Building,
      status: "Available",
      route: "/document-management",
      features: [
        "Centralized document storage with cloud sync",
        "Smart categorization and tagging system",
        "Document expiration tracking and alerts",
        "Inspection report management with photos",
        "Insurance policy tracking and renewals"
      ],
      bgColor: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      id: "communication-hub",
      title: "Communication Hub",
      description: "Tenant portals, messaging system, and automated notifications",
      icon: MessageSquare,
      status: "Available",
      route: "/communication-hub",
      features: [
        "Tenant portal with self-service features",
        "Multi-channel messaging (email, SMS, in-app)",
        "Automated notification system",
        "Communication templates and scheduling",
        "Message tracking and read receipts"
      ],
      bgColor: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      id: "reporting-analytics",
      title: "Advanced Reporting & Analytics",
      description: "ROI tracking, market analysis, and comprehensive financial reporting",
      icon: BarChart3,
      status: "Available",
      route: "/reporting-analytics",
      features: [
        "ROI and cash flow analysis",
        "Market rent analysis and recommendations",
        "Automated financial report generation",
        "Property performance dashboards",
        "Custom report builder with scheduling"
      ],
      bgColor: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      id: "mobile-features",
      title: "Mobile App Features",
      description: "Inspection tools, photo documentation, and offline functionality",
      icon: Smartphone,
      status: "Coming Soon",
      route: "/mobile-features",
      features: [
        "Mobile inspection tools with offline capability",
        "Photo documentation with automatic tagging",
        "Push notifications for urgent issues",
        "GPS-enabled property check-ins",
        "Mobile maintenance request submission"
      ],
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      id: "integrations",
      title: "Third-Party Integrations",
      description: "Payment processing, accounting software, and background check services",
      icon: Zap,
      status: "Available",
      route: "/integrations",
      features: [
        "Stripe payment processing integration",
        "QuickBooks accounting synchronization",
        "SendGrid email automation",
        "Background check service connections",
        "API webhooks for custom integrations"
      ],
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
      iconColor: "text-cyan-600 dark:text-cyan-400"
    },
    {
      id: "compliance-legal",
      title: "Compliance & Legal Tools",
      description: "Permit tracking, eviction management, and regulatory compliance monitoring",
      icon: Scale,
      status: "Available",
      route: "/compliance-legal",
      features: [
        "Permit and license tracking with renewals",
        "Eviction process management and documentation",
        "Compliance monitoring and reporting",
        "Legal document templates and storage",
        "Regulatory deadline tracking and alerts"
      ],
      bgColor: "bg-red-50 dark:bg-red-950",
      iconColor: "text-red-600 dark:text-red-400"
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === "Available") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Available</Badge>;
    }
    return <Badge variant="secondary">Coming Soon</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Advanced Property Management Features
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Comprehensive tools to streamline operations, enhance tenant experience, 
          and maximize property performance across your entire portfolio.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {featureCategories.map((category) => {
          const IconComponent = category.icon;
          
          return (
            <Card key={category.id} className={`${category.bgColor} border-0 hover:shadow-lg transition-shadow duration-300`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${category.iconColor}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {category.title}
                      </CardTitle>
                    </div>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
                <CardDescription className="text-gray-700 dark:text-gray-300 mt-2">
                  {category.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {category.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
                      <ClipboardCheck className="h-4 w-4 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {category.status === "Available" ? (
                    <Link href={category.route} className="w-full">
                      <Button variant="default" className="w-full">
                        Explore Features
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="secondary" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ready to Transform Your Property Management?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          These advanced features are designed to scale with your business, 
          from single properties to large portfolios. Start exploring today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="px-8">
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="px-8">
            Schedule Demo
          </Button>
        </div>
      </div>
    </div>
  );
}