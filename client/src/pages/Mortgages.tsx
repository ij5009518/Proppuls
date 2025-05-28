import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, Plus, Eye, Edit, Trash2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Mortgage, Property, InsertMortgage } from "@shared/schema";

const mortgageSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  lender: z.string().min(1, "Lender is required"),
  originalAmount: z.string().min(1, "Original amount is required"),
  currentBalance: z.string().min(1, "Current balance is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  monthlyPayment: z.string().min(1, "Monthly payment is required"),
  principalAmount: z.string().min(1, "Principal amount is required"),
  interestAmount: z.string().min(1, "Interest amount is required"),
  escrowAmount: z.string().optional(),
  startDate: z.date(),
  termYears: z.number().min(1, "Term must be at least 1 year"),
  accountNumber: z.string().optional(),
  notes: z.string().optional(),
});

type MortgageFormData = z.infer<typeof mortgageSchema>;

export default function Mortgages() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: mortgages = [] } = useQuery<Mortgage[]>({
    queryKey: ["/api/mortgages"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<MortgageFormData>({
    resolver: zodResolver(mortgageSchema),
    defaultValues: {
      propertyId: 0,
      lender: "",
      originalAmount: "",
      currentBalance: "",
      interestRate: "",
      monthlyPayment: "",
      principalAmount: "",
      interestAmount: "",
      escrowAmount: "",
      startDate: new Date(),
      termYears: 30,
      accountNumber: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertMortgage) => apiRequest("POST", "/api/mortgages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mortgages"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Mortgage created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create mortgage.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/mortgages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mortgages"] });
      toast({
        title: "Success",
        description: "Mortgage deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete mortgage.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MortgageFormData) => {
    const mortgageData = {
      ...data,
      escrowAmount: data.escrowAmount || "0",
    };
    createMutation.mutate(mortgageData);
  };

  const getPropertyName = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mortgages</h1>
          <p className="text-muted-foreground">
            Manage mortgage details and payment tracking across all properties
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Mortgage
        </Button>
      </div>

      {mortgages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mortgages found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add mortgages to your properties to track payment details and amortization schedules.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to Properties → View Property → Mortgage tab to add mortgage details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mortgages.map((mortgage) => (
            <Card key={mortgage.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{mortgage.lender}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getPropertyName(mortgage.propertyId)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatPercent(parseFloat(mortgage.interestRate))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-semibold">{formatCurrency(mortgage.originalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Balance</p>
                    <p className="font-semibold">{formatCurrency(mortgage.currentBalance)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Monthly Payment Breakdown</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <p className="text-blue-600 dark:text-blue-400">Principal</p>
                      <p className="font-semibold">{formatCurrency(mortgage.principalAmount)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <p className="text-red-600 dark:text-red-400">Interest</p>
                      <p className="font-semibold">{formatCurrency(mortgage.interestAmount)}</p>
                    </div>
                    {mortgage.escrowAmount && parseFloat(mortgage.escrowAmount) > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <p className="text-green-600 dark:text-green-400">Escrow</p>
                        <p className="font-semibold">{formatCurrency(mortgage.escrowAmount)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Monthly</p>
                      <p className="font-bold text-lg">{formatCurrency(mortgage.monthlyPayment)}</p>
                    </div>
                    <Badge variant="secondary">
                      {mortgage.termYears} years
                    </Badge>
                  </div>
                </div>

                {mortgage.accountNumber && (
                  <div className="text-xs text-muted-foreground">
                    Account: {mortgage.accountNumber}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteMutation.mutate(mortgage.id)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Mortgage Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Mortgage</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lender</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Wells Fargo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="originalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Loan Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" placeholder="0.000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center">
                  <Calculator className="h-4 w-4 mr-2" />
                  Monthly Payment Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Monthly Payment</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="principalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Principal Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="escrowAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escrow Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Mortgage"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}