import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Edit, Trash2, Calendar, DollarSign, Receipt, RotateCcw, Filter, Home, Upload, Store, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Expense, InsertExpense, Vendor, InsertVendor } from "@shared/schema";

const expenseSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.date(),
  isRecurring: z.boolean(),
  recurrencePeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  // Date range fields for taxes, insurance, utilities
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  // Document attachment
  documentFile: z.any().optional(),
});

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1, "Phone is required"),
  specialty: z.string().min(1, "Specialty is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  rating: z.string().optional(),
  isActive: z.boolean(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;
type VendorFormData = z.infer<typeof vendorSchema>;

const expenseCategories = {
  taxes: "Tax Expenses",
  insurance: "Insurance Policies", 
  utilities: "Utility Bills",
  maintenance: "Maintenance Costs",
  mortgage: "Mortgage Payments",
  marketing: "Marketing & Advertising",
  office: "Office Supplies",
  professional: "Professional Services",
  repairs: "Repairs & Renovations",
  travel: "Travel & Transportation"
};

const vendorSpecialties = {
  maintenance: "Maintenance & Repairs",
  cleaning: "Cleaning Services",
  landscaping: "Landscaping",
  hvac: "HVAC Services",
  plumbing: "Plumbing",
  electrical: "Electrical",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  legal: "Legal Services",
  accounting: "Accounting",
  insurance: "Insurance",
  supplies: "Supplies",
  utilities: "Utilities",
  security: "Security Services",
  other: "Other"
};

export default function Expenses() {
  const [location] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  
  // Vendor state
  const [isCreateVendorDialogOpen, setIsCreateVendorDialogOpen] = useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [selectedVendorCategory, setSelectedVendorCategory] = useState<string>("all");

  const { toast } = useToast();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Handle URL parameters for property integration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('propertyId');
    const propertyName = urlParams.get('propertyName');

    if (propertyId && propertyName) {
      setIsCreateDialogOpen(true);
      createForm.setValue('propertyId', parseInt(propertyId));
    }
  }, []);

  const createForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: 0,
      category: "taxes",
      description: "",
      amount: "",
      date: new Date(),
      isRecurring: false,
      recurrencePeriod: "monthly",
      vendorName: "",
      notes: "",
      startDate: undefined,
      endDate: undefined,
      documentFile: undefined,
    },
  });

  const editForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: 0,
      category: "other",
      description: "",
      amount: "",
      date: new Date(),
      isRecurring: false,
      recurrencePeriod: "monthly",
      vendorName: "",
      notes: "",
    },
  });

  // Vendor forms
  const createVendorForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "other",
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
      specialty: "other",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      rating: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      const expenseData = {
        ...data,
        amount: data.amount.toString(),
        propertyId: data.propertyId.toString(),
      };
      return apiRequest("POST", "/api/expenses", expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense created successfully" });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; expense: Partial<InsertExpense> }) => {
      const expenseData = {
        ...data.expense,
        amount: data.expense.amount?.toString(),
        propertyId: data.expense.propertyId?.toString(),
      };
      return apiRequest("PATCH", `/api/expenses/${data.id}`, expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Vendor mutations
  const createVendorMutation = useMutation({
    mutationFn: async (data: InsertVendor) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Success", description: "Vendor created successfully" });
      setIsCreateVendorDialogOpen(false);
      createVendorForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: { id: string; vendor: Partial<InsertVendor> }) => {
      return apiRequest("PATCH", `/api/vendors/${data.id}`, data.vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Success", description: "Vendor updated successfully" });
      setIsEditVendorDialogOpen(false);
      setSelectedVendor(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Success", description: "Vendor deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.vendorName && expense.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesProperty = selectedProperty === "all" || expense.propertyId === selectedProperty;
    return matchesSearch && matchesCategory && matchesProperty;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const recurringExpenses = filteredExpenses.filter(expense => expense.isRecurring);
  const monthlyRecurring = recurringExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount);
    const period = (expense as any).recurrencePeriod || "monthly";
    switch (period) {
      case "yearly": return sum + (amount / 12);
      case "quarterly": return sum + (amount / 3);
      default: return sum + amount;
    }
  }, 0);

  // Vendor filtering
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                         vendor.specialty.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                         (vendor.email && vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase()));
    const matchesCategory = selectedVendorCategory === "all" || vendor.specialty === selectedVendorCategory;
    return matchesSearch && matchesCategory;
  });

  const onCreateSubmit = (data: ExpenseFormData) => {
    const expenseData: InsertExpense = {
      propertyId: data.propertyId.toString(),
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: data.date,
      isRecurring: data.isRecurring,
      vendorName: data.vendorName,
      notes: data.notes,
    };
    
    if (data.isRecurring && data.recurrencePeriod) {
      (expenseData as any).recurrencePeriod = data.recurrencePeriod;
    }

    createMutation.mutate(expenseData);
  };

  const onEditSubmit = (data: ExpenseFormData) => {
    if (!selectedExpense) return;
    
    const expenseData: Partial<InsertExpense> = {
      propertyId: data.propertyId.toString(),
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: data.date,
      isRecurring: data.isRecurring,
      vendorName: data.vendorName,
      notes: data.notes,
    };
    
    if (data.isRecurring && data.recurrencePeriod) {
      (expenseData as any).recurrencePeriod = data.recurrencePeriod;
    }

    updateMutation.mutate({ id: selectedExpense.id, expense: expenseData });
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    editForm.reset({
      propertyId: parseInt(expense.propertyId),
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: new Date(expense.date),
      isRecurring: expense.isRecurring,
      recurrencePeriod: (expense as any).recurrencePeriod || "monthly",
      vendorName: expense.vendorName || "",
      notes: expense.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  // Vendor handlers
  const onCreateVendorSubmit = (data: VendorFormData) => {
    const vendorData: InsertVendor = {
      name: data.name,
      email: data.email || "",
      phone: data.phone,
      specialty: data.specialty,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      rating: data.rating || null,
      isActive: data.isActive,
    };

    createVendorMutation.mutate(vendorData);
  };

  const onEditVendorSubmit = (data: VendorFormData) => {
    if (!selectedVendor) return;

    const vendorData: Partial<InsertVendor> = {
      name: data.name,
      email: data.email || "",
      phone: data.phone,
      specialty: data.specialty,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      rating: data.rating || null,
      isActive: data.isActive,
    };

    updateVendorMutation.mutate({ id: selectedVendor.id, vendor: vendorData });
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    editVendorForm.reset({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone,
      specialty: vendor.specialty,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      zipCode: vendor.zipCode,
      rating: vendor.rating || "",
      isActive: vendor.isActive,
    });
    setIsEditVendorDialogOpen(true);
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteVendorMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-96">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses & Vendors</h1>
          <div className="space-y-1">
            <p className="text-muted-foreground">
              Track expenses and manage vendors in one place
            </p>
            {(() => {
              const urlParams = new URLSearchParams(window.location.search);
              const propertyName = urlParams.get('propertyName');
              const propertyId = urlParams.get('propertyId');

              if (propertyName && propertyId) {
                const property = properties.find(p => p.id.toString() === propertyId);
                return (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      Property: {decodeURIComponent(propertyName)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.location.href = '/expenses'}
                    >
                      View All Expenses
                    </Button>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        <div className="flex gap-2">
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
                        <Input placeholder="Enter expense description" {...field} />
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
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                          <Input
                            type="date"
                            value={field.value?.toISOString().split('T')[0]}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
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
                      <FormLabel>Vendor Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vendor name" {...field} />
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
                        <Input placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Range Fields for Taxes, Insurance, Utilities */}
                {(createForm.watch("category") === "taxes" || 
                  createForm.watch("category") === "insurance" || 
                  createForm.watch("category") === "utilities") && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">
                        {createForm.watch("category") === "taxes" && "Tax Period"}
                        {createForm.watch("category") === "insurance" && "Insurance Coverage Period"}
                        {createForm.watch("category") === "utilities" && "Utility Billing Period"}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  value={field.value?.toISOString().split('T')[0] || ""}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                />
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
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  value={field.value?.toISOString().split('T')[0] || ""}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Document Attachment */}
                    <div className="border-t pt-4">
                      <FormField
                        control={createForm.control}
                        name="documentFile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Attach Document
                              {createForm.watch("category") === "taxes" && " (Tax Documents)"}
                              {createForm.watch("category") === "insurance" && " (Insurance Policy)"}
                              {createForm.watch("category") === "utilities" && " (Utility Bill)"}
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => field.onChange(e.target.files?.[0])}
                                />
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Supported formats: PDF, JPG, PNG, DOC, DOCX
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <FormField
                  control={createForm.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Recurring Expense</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark this expense as recurring
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {createForm.watch("isRecurring") && (
                  <FormField
                    control={createForm.control}
                    name="recurrencePeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence Period</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
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
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Expense</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
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
              <RotateCcw className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Monthly Recurring</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyRecurring)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{filteredExpenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="utilities">Utilities</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="mortgage">Mortgage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(expenseCategories).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <div className="grid gap-4">
            {filteredExpenses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No expenses found</p>
                </CardContent>
              </Card>
            ) : (
              filteredExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{expense.description}</h3>
                          <Badge variant="outline">
                            {expenseCategories[expense.category as keyof typeof expenseCategories] || expense.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            <Calendar className="h-4 w-4 inline mr-1" />
                            {formatDate(expense.date)}
                          </span>
                          {expense.vendorName && (
                            <span>Vendor: {expense.vendorName}</span>
                          )}
                          {expense.isRecurring && (
                            <Badge variant="secondary">Recurring</Badge>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                        <div className="flex space-x-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        {/* Individual category tabs */}
        {Object.entries(expenseCategories).map(([key, label]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredExpenses
                    .filter(expense => expense.category === key)
                    .map((expense) => (
                    <Card key={expense.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{expense.description}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {formatDate(expense.date)}
                              </span>
                              {expense.vendorName && (
                                <span>Vendor: {expense.vendorName}</span>
                              )}
                              {expense.isRecurring && (
                                <Badge variant="secondary">Recurring</Badge>
                              )}
                            </div>
                            {expense.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                            <div className="flex space-x-2 mt-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(expense)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(expense.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredExpenses.filter(expense => expense.category === key).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No {label.toLowerCase()} expenses found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
                  control={editForm.control}
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
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter expense description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value?.toISOString().split('T')[0]}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Recurring Expense</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this expense as recurring
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editForm.watch("isRecurring") && (
                <FormField
                  control={editForm.control}
                  name="recurrencePeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence Period</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
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
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Expense</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
        </div>
      </div>

      {/* Add tabs for Expenses and Vendors */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses">
          {/* Existing expenses content */}
          <div className="space-y-4">
            {/* Add existing expense filters and table here */}
            <p>Expenses content will be moved here</p>
          </div>
        </TabsContent>
        
        <TabsContent value="vendors">
          {/* Vendors content */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Vendor Management</h3>
              <Dialog open={isCreateVendorDialogOpen} onOpenChange={setIsCreateVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Store className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                  </DialogHeader>
                  <Form {...createVendorForm}>
                    <form onSubmit={createVendorForm.handleSubmit(onCreateVendorSubmit)} className="space-y-4">
                      <FormField
                        control={createVendorForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vendor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createVendorForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="vendor@example.com" {...field} />
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
                        name="specialty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specialty</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select specialty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(vendorSpecialties).map(([key, label]) => (
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
                      
                      <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateVendorDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createVendorMutation.isPending}>
                          {createVendorMutation.isPending ? "Creating..." : "Add Vendor"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Vendor filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search vendors..."
                  value={vendorSearchTerm}
                  onChange={(e) => setVendorSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedVendorCategory} onValueChange={setSelectedVendorCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {Object.entries(vendorSpecialties).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Vendor grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                          <Store className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{vendor.name}</CardTitle>
                          <Badge variant="outline">{vendorSpecialties[vendor.specialty] || vendor.specialty}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vendor.email && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{vendor.email}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{vendor.phone}</span>
                      </div>

                      <div className="flex items-start space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">
                          {vendor.address}, {vendor.city}, {vendor.state} {vendor.zipCode}
                        </span>
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditVendor(vendor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVendor(vendor.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}