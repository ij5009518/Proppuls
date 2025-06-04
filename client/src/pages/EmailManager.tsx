
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, Users, Building, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmailManager() {
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [emailType, setEmailType] = useState<string>("");
  const { toast } = useToast();

  // Fetch data
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      return response.json();
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const response = await fetch("/api/tenants");
      return response.json();
    },
  });

  // Email mutations
  const sendRentReminderMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch("/api/email/rent-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rent reminder sent successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to send rent reminder", variant: "destructive" });
    },
  });

  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Welcome email sent successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to send welcome email", variant: "destructive" });
    },
  });

  const sendBulkRentRemindersMutation = useMutation({
    mutationFn: async (propertyId?: string) => {
      const response = await fetch("/api/email/bulk-rent-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Bulk emails sent", 
        description: `Sent: ${data.sent}, Failed: ${data.failed}` 
      });
    },
    onError: () => {
      toast({ title: "Failed to send bulk emails", variant: "destructive" });
    },
  });

  const handleSendEmail = () => {
    if (!selectedTenant) {
      toast({ title: "Please select a tenant", variant: "destructive" });
      return;
    }

    switch (emailType) {
      case "rent-reminder":
        sendRentReminderMutation.mutate(selectedTenant);
        break;
      case "welcome":
        sendWelcomeEmailMutation.mutate(selectedTenant);
        break;
      default:
        toast({ title: "Please select an email type", variant: "destructive" });
    }
  };

  const handleBulkRentReminders = () => {
    sendBulkRentRemindersMutation.mutate(selectedProperty === "all" ? undefined : selectedProperty || undefined);
  };

  const filteredTenants = selectedProperty && selectedProperty !== "all"
    ? tenants.filter((tenant: any) => {
        // You'll need to join with units to filter by property
        return true; // Simplified for now
      })
    : tenants;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Email Manager</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Email Sending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Individual Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Type</label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent-reminder">Rent Reminder</SelectItem>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Property (Optional)</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tenant</label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTenants.map((tenant: any) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName} - {tenant.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSendEmail} 
              className="w-full"
              disabled={sendRentReminderMutation.isPending || sendWelcomeEmailMutation.isPending}
            >
              {(sendRentReminderMutation.isPending || sendWelcomeEmailMutation.isPending) ? "Sending..." : "Send Email"}
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Email Sending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Email Sending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Property (Optional)</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property or leave blank for all" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Rent Reminders</h3>
              <p className="text-sm text-blue-700 mb-3">
                Send rent payment reminders to all tenants in the selected property (or all properties if none selected).
              </p>
              <Button 
                onClick={handleBulkRentReminders}
                disabled={sendBulkRentRemindersMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {sendBulkRentRemindersMutation.isPending ? "Sending..." : "Send Bulk Rent Reminders"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Templates Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Rent Reminder</Badge>
              <p className="text-sm text-gray-600">
                Automated reminder for upcoming rent payments with property and payment details.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Welcome Email</Badge>
              <p className="text-sm text-gray-600">
                Welcome new tenants with important information about their unit and property.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Maintenance Updates</Badge>
              <p className="text-sm text-gray-600">
                Notify tenants about maintenance request status changes and updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
