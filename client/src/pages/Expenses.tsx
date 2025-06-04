import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Receipt,
  Calendar,
  RotateCcw,
  Filter,
  Building,
  User,
  Star
} from "lucide-react";
import {
  Expense,
  Vendor,
  Property,
  InsertExpense,
  InsertVendor,
  expenseSchema,
  vendorSchema
} from "../../../shared/schema";

const expenseCategories = {
  maintenance: "Maintenance & Repairs",
  utilities: "Utilities",
  water: "Water",
  sewer: "Sewer",
  sanitation: "Sanitation/Trash",
  insurance: "Insurance",
  taxes: "Property Taxes",
  management: "Property Management",
  legal: "Legal & Professional",
  marketing: "Marketing & Advertising",
  supplies: "Supplies & Materials",
  landscaping: "Landscaping",
  improvements: "Capital Improvements",
  other: "Other"
};

type ExpenseFormData = z.infer<typeof expenseSchema>;
type VendorFormData = z.infer<typeof vendorSchema>;

export default function Expenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateVendorDialogOpen, setIsCreateVendorDialogOpen] = useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = useState(false);

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [selectedVendorCategory, setSelectedVendorCategory] = useState("all");

  // Queries
  const { data: expenses } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Computed values
  const totalExpenses = expenses?.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount.toString()), 0) || 0;

  // Filtered data
  const filteredExpenses = expenses?.filter((expense: any) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesProperty = selectedProperty === "all" || expense.propertyId === selectedProperty;
    const matchesDateRange = (!startDate || new Date(expense.date) >= new Date(startDate)) &&
                            (!endDate || new Date(expense.date) <= new Date(endDate));
    return matchesSearch && matchesCategory && matchesProperty && matchesDateRange;
  }) || [];

  const filteredVendors = vendors?.filter((vendor: any) => {
    const matchesSearch = vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                         vendor.specialty?.toLowerCase().includes(vendorSearchTerm.toLowerCase());
    const matchesCategory = selectedVendorCategory === "all" || 
                           vendor.specialty?.toLowerCase().includes(selectedVendorCategory);
    return matchesSearch && matchesCategory;
  }) || [];

  // Forms
  const createForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: "",
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      vendorName: "",
      notes: "",
      accountNumber: "",
      startDate: "",
      endDate: "",
      policyEffectiveDate: "",
      policyExpirationDate: "",
      meterReadingStart: "",
      meterReadingEnd: "",
      usageAmount: "",
      recurrencePeriod: "monthly",
    },
  });

  const editForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: "",
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      vendorName: "",
      notes: "",
      accountNumber: "",
      startDate: "",
      endDate: "",
      policyEffectiveDate: "",
      policyExpirationDate: "",
      meterReadingStart: "",
      meterReadingEnd: "",
      usageAmount: "",
      recurrencePeriod: "monthly",
    },
  });

  const createVendorForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      rating: "",
      isActive: true,
    },
  });

  const editVendorForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      rating: "",
      isActive: true,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Expense added successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertExpense }) =>
      apiRequest("PUT", `/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Expense updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: InsertVendor) => apiRequest("POST", "/api/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateVendorDialogOpen(false);
      createVendorForm.reset();
      toast({ title: "Success", description: "Vendor added successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertVendor }) =>
      apiRequest("PUT", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsEditVendorDialogOpen(false);
      toast({ title: "Success", description: "Vendor updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Success", description: "Vendor deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const onCreateSubmit = (data: ExpenseFormData) => {
    const expenseData: InsertExpense = {
      ...data,
      amount: parseFloat(data.amount),
      propertyId: data.propertyId,
    };
    createMutation.mutate(expenseData);
  };

  const onEditSubmit = (data: ExpenseFormData) => {
    const expenseData: InsertExpense = {
      ...data,
      amount: parseFloat(data.amount),
      propertyId: data.propertyId,
    };
    updateMutation.mutate({ id: editForm.getValues("id") || "", data: expenseData });
  };

  const handleEdit = (expense: Expense) => {
    editForm.reset({
      ...expense,
      amount: expense.amount.toString(),
      date: expense.date.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const onCreateVendorSubmit = (data: VendorFormData) => {
    const vendorData: InsertVendor = {
      ...data,
      rating: parseFloat(data.rating),
    };
    createVendorMutation.mutate(vendorData);
  };

  const onEditVendorSubmit = (data: VendorFormData) => {
    const vendorData: InsertVendor = {
      ...data,
      rating: parseFloat(data.rating),
    };
    updateVendorMutation.mutate({ id: editVendorForm.getValues("id") || "", data: vendorData });
  };

  const handleEditVendor = (vendor: Vendor) => {
    editVendorForm.reset({
      ...vendor,
      rating: vendor.rating.toString(),
    });
    setIsEditVendorDialogOpen(true);
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteVendorMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses & Vendors</h1>
        <p className="text-muted-foreground">
          Track expenses and manage vendors in one place
        </p>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Expense Management</h2>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="propertyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select property" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {properties?.map((property: any) => (
                                    <SelectItem key={property.id} value={property.id}>
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
                          control={createForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(expenseCategories).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Expense description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createForm.control}
                        name="vendorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Vendor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Additional notes or details" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Conditional fields based on category */}
                      {(createForm.watch("category") === "insurance" || createForm.watch("category") === "taxes") && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="policyEffectiveDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {createForm.watch("category") === "insurance" ? "Policy Effective Date" : "Tax Period Start"}
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="policyExpirationDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {createForm.watch("category") === "insurance" ? "Policy Expiration Date" : "Tax Period End"}
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={createForm.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {createForm.watch("category") === "insurance" ? "Policy Number" : "Tax Account Number"}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={createForm.watch("category") === "insurance" ? "Policy number" : "Tax account number"} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* Utility-specific fields */}
                      {(createForm.watch("category") === "utilities" || createForm.watch("category") === "water" || 
                        createForm.watch("category") === "sewer" || createForm.watch("category") === "sanitation") && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Period Start</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Period End</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={createForm.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service Account Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="Utility account number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Meter readings for water, sewer utilities */}
                          {(createForm.watch("category") === "water" || createForm.watch("category") === "sewer") && (
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={createForm.control}
                                name="meterReadingStart"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Starting Meter Reading</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Previous reading" type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createForm.control}
                                name="meterReadingEnd"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Ending Meter Reading</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Current reading" type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createForm.control}
                                name="usageAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Usage Amount</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Gallons/units used" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Recurring expense fields */}
                      <FormField
                        control={createForm.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Recurring Expense</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                This expense repeats on a regular schedule
                              </div>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border border-input"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {createForm.watch("isRecurring") && (
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={createForm.control}
                            name="recurrencePeriod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date (Optional)</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Adding..." : "Add Expense"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(expenseCategories).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Property</label>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger>
                        <SelectValue placeholder="All properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties?.map((property: any) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Expense Count</p>
                      <p className="text-2xl font-bold">{filteredExpenses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          filteredExpenses
                            .filter((e: any) => new Date(e.date).getMonth() === new Date().getMonth())
                            .reduce((sum: any, e: any) => sum + parseFloat(e.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <RotateCcw className="h-8 w-8 text-muted-foreground" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Recurring</p>
                      <p className="text-2xl font-bold">
                        {filteredExpenses.filter((e: any) => e.isRecurring).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Property</th>
                        <th className="text-left p-4">Category</th>
                        <th className="text-left p-4">Description</th>
                        <th className="text-left p-4">Amount</th>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Vendor</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense: any) => {
                        const property = properties?.find((p: any) => p.id === expense.propertyId);
                        return (
                          <tr key={expense.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">{property?.name || 'Unknown Property'}</td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {expenseCategories[expense.category as keyof typeof expenseCategories] || expense.category}
                              </Badge>
                            </td>
                            <td className="p-4">{expense.description}</td>
                            <td className="p-4 font-semibold">{formatCurrency(expense.amount)}</td>
                            <td className="p-4">{formatDate(expense.date)}</td>
                            <td className="p-4">{expense.vendorName || '-'}</td>
                            <td className="p-4">
                              {expense.isRecurring ? (
                                <Badge variant="secondary">
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Recurring
                                </Badge>
                              ) : (
                                <Badge variant="outline">One-time</Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(expense)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vendor Management</h2>
              <Dialog open={isCreateVendorDialogOpen} onOpenChange={setIsCreateVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                  </DialogHeader>
                  <Form {...createVendorForm}>
                    <form onSubmit={createVendorForm.handleSubmit(onCreateVendorSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createVendorForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Vendor name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createVendorForm.control}
                          name="specialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialty</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Plumbing, Electrical" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createVendorForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="vendor@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createVendorForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createVendorForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={createVendorForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createVendorForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createVendorForm.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="12345" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createVendorForm.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rating (1-5)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="5" placeholder="5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateVendorDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createVendorMutation.isPending}>
                          {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Vendor Filters */}
            <div className="flex space-x-4">
              <Input
                placeholder="Search vendors..."
                value={vendorSearchTerm}
                onChange={(e) => setVendorSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={selectedVendorCategory} onValueChange={setSelectedVendorCategory}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="All specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="painting">Painting</SelectItem>
                  <SelectItem value="general">General Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vendors Table */}
            <Card>
              <CardHeader>
                <CardTitle>Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Specialty</th>
                        <th className="text-left p-4">Contact</th>
                        <th className="text-left p-4">Location</th>
                        <th className="text-left p-4">Rating</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((vendor: any) => (
                        <tr key={vendor.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{vendor.name}</td>
                          <td className="p-4">
                            <Badge variant="outline">{vendor.specialty}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <div>{vendor.email}</div>
                              <div className="text-muted-foreground">{vendor.phone}</div>
                            </div>
                          </td>
                          <td className="p-4 text-sm">
                            {vendor.city}, {vendor.state} {vendor.zipCode}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <span className="mr-1">{vendor.rating}</span>
                              <span className="text-yellow-500">★</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={vendor.isActive ? "default" : "secondary"}>
                              {vendor.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVendor(vendor.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}