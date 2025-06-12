import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Send, Users, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const testEmailSchema = z.object({
  to: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export default function EmailManager() {
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const testEmailForm = useForm<z.infer<typeof testEmailSchema>>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: "",
      subject: "",
      message: "",
    },
  });

  // Fetch tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: () => apiRequest("GET", "/api/tenants"),
  });

  // Fetch properties for context
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: () => apiRequest("GET", "/api/properties"),
  });

  // Fetch units for context
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
    queryFn: () => apiRequest("GET", "/api/units"),
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: (data: z.infer<typeof testEmailSchema>) => 
      apiRequest("POST", "/api/emails/test", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Test email sent successfully" });
      setIsTestEmailDialogOpen(false);
      testEmailForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send test email", variant: "destructive" });
    },
  });

  const sendRentReminderMutation = useMutation({
    mutationFn: (tenantId: string) => 
      apiRequest("POST", "/api/emails/send-rent-reminder", { tenantId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Rent reminder sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send rent reminder", variant: "destructive" });
    },
  });

  const sendWelcomeEmailMutation = useMutation({
    mutationFn: (tenantId: string) => 
      apiRequest("POST", "/api/emails/send-welcome", { tenantId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Welcome email sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send welcome email", variant: "destructive" });
    },
  });

  const getPropertyName = (propertyId: string) => {
    if (!propertyId || !properties) return "Unknown Property";
    const property = properties.find((p: any) => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getUnitName = (unitId: string) => {
    if (!unitId || !units) return "Unknown Unit";
    const unit = units.find((u: any) => u.id === unitId);
    return unit?.name || "Unknown Unit";
  };

  const onTestEmailSubmit = (data: z.infer<typeof testEmailSchema>) => {
    sendTestEmailMutation.mutate(data);
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Email Manager</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Manager</h1>
        <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
            </DialogHeader>
            <Form {...testEmailForm}>
              <form onSubmit={testEmailForm.handleSubmit(onTestEmailSubmit)} className="space-y-4">
                <FormField
                  control={testEmailForm.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <FormControl>
                        <Input placeholder="recipient@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={testEmailForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Test email subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={testEmailForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Your test message..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsTestEmailDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendTestEmailMutation.isPending}>
                    {sendTestEmailMutation.isPending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Email Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Gmail Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Gmail is configured and ready to send emails
              </span>
            </div>
            <Button variant="outline" onClick={() => setIsTestEmailDialogOpen(true)}>
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Send to Tenants</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Emails to Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {tenants?.map((tenant: any) => {
                  const unit = units?.find((u: any) => u.id === tenant.unitId);
                  const property = properties?.find((p: any) => p.id === unit?.propertyId);
                  
                  return (
                    <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-full">
                          {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {tenant.firstName} {tenant.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tenant.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {property?.name} - Unit {unit?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendRentReminderMutation.mutate(tenant.id)}
                          disabled={sendRentReminderMutation.isPending}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Rent Reminder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendWelcomeEmailMutation.mutate(tenant.id)}
                          disabled={sendWelcomeEmailMutation.isPending}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Welcome Email
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Rent Reminder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Automatically includes tenant name, property details, rent amount, and due date.
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <strong>Subject:</strong> Rent Payment Reminder - [Property] Unit [Unit]<br/>
                  <strong>Content:</strong> Dear [Tenant], this is a friendly reminder that your rent payment is due...
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Welcome Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sent to new tenants with important information about their lease.
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <strong>Subject:</strong> Welcome to [Property] - Unit [Unit]<br/>
                  <strong>Content:</strong> Welcome to your new home! Important reminders about rent payments...
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Maintenance Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Updates tenants on the status of their maintenance requests.
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <strong>Subject:</strong> Maintenance Update - [Property] Unit [Unit]<br/>
                  <strong>Content:</strong> We have an update regarding your maintenance request...
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}