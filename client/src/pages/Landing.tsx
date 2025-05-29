
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Users, 
  DollarSign, 
  Wrench, 
  BarChart3, 
  Calendar,
  CheckCircle,
  ArrowRight,
  Home,
  Shield,
  Clock,
  TrendingUp,
  FileText,
  Star
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Building,
      title: "Property Management",
      description: "Manage multiple properties with detailed tracking of units, occupancy rates, and property information."
    },
    {
      icon: Users,
      title: "Tenant Management",
      description: "Complete tenant profiles, lease tracking, and communication tools in one place."
    },
    {
      icon: DollarSign,
      title: "Financial Tracking",
      description: "Track rent payments, expenses, and generate comprehensive financial reports."
    },
    {
      icon: Wrench,
      title: "Maintenance Requests",
      description: "Streamline maintenance workflows with priority tracking and vendor management."
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Get insights into your portfolio performance with detailed analytics and custom reports."
    },
    {
      icon: Calendar,
      title: "Task Management",
      description: "Stay organized with task scheduling and deadline tracking for all property activities."
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Save Time",
      description: "Automate routine tasks and streamline your property management workflow."
    },
    {
      icon: TrendingUp,
      title: "Increase Revenue",
      description: "Optimize rent collection and reduce vacancy periods with better tenant management."
    },
    {
      icon: Shield,
      title: "Stay Compliant",
      description: "Keep track of important dates, documents, and regulatory requirements."
    },
    {
      icon: FileText,
      title: "Better Organization",
      description: "Centralize all your property data in one secure, accessible platform."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Property Manager",
      company: "Urban Estates",
      rating: 5,
      text: "PropertyFlow has transformed how we manage our 50+ unit portfolio. The maintenance tracking alone has saved us countless hours."
    },
    {
      name: "Michael Chen",
      role: "Real Estate Investor",
      company: "Chen Properties",
      rating: 5,
      text: "The financial reporting features give me the insights I need to make better investment decisions. Highly recommended!"
    },
    {
      name: "Lisa Rodriguez",
      role: "Property Owner",
      company: "Downtown Rentals",
      rating: 5,
      text: "Finally, a property management solution that's both powerful and easy to use. Our tenants love the streamlined process too."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-foreground">
                PropertyFlow
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => window.location.href = '/login'}>
                Login
              </Button>
              <Button onClick={() => window.location.href = '/register'}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6" variant="outline">
            🚀 The Complete Property Management Solution
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 dark:text-foreground mb-6">
            Simplify Your
            <span className="text-primary block">Property Management</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-muted-foreground mb-8 max-w-3xl mx-auto">
            Streamline operations, track finances, manage tenants, and grow your real estate portfolio 
            with our comprehensive property management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={() => window.location.href = '/register'}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-foreground mb-4">
              Everything You Need to Manage Properties
            </h2>
            <p className="text-xl text-slate-600 dark:text-muted-foreground max-w-3xl mx-auto">
              From tenant screening to financial reporting, PropertyFlow provides all the tools 
              you need to efficiently manage your real estate portfolio.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-foreground mb-4">
              Why Choose PropertyFlow?
            </h2>
            <p className="text-xl text-slate-600 dark:text-muted-foreground max-w-3xl mx-auto">
              Join thousands of property managers and real estate investors who have transformed 
              their business with our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-slate-600 dark:text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-foreground mb-4">
              Loved by Property Professionals
            </h2>
            <p className="text-xl text-slate-600 dark:text-muted-foreground">
              See what our customers have to say about PropertyFlow
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 dark:text-muted-foreground mb-4 italic">
                    "{testimonial.text}"
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of property managers who have streamlined their operations with PropertyFlow.
            Start your free trial today and see the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-3"
              onClick={() => window.location.href = '/register'}
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-blue-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">PropertyFlow</span>
              </div>
              <p className="text-slate-400">
                The complete property management solution for modern real estate professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 PropertyFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
