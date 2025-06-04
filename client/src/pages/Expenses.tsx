import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Edit, Trash2, Calendar, DollarSign, Receipt, RotateCcw, Filter, Home, Upload, Store, Phone, Mail, MapPin, Wrench } from "lucide-react";
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
  propertyId: z.string().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean(),
  recurrencePeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  documentFile: z.any().optional(),
  accountNumber: z.string().optional(),
  policyEffectiveDate: z.string().optional(),
  policyExpirationDate: z.string().optional(),
  meterReadingStart: z.string().optional(),
  meterReadingEnd: z.string().optional(),
  usageAmount: z.string().optional(),
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
  maintenance: "Maintenance & Repairs",
  utilities: "Utilities",
  water: "Water",
  sewer: "Sewer",
  sanitation: "Sanitation",
  insurance: "Insurance",
  taxes: "Property Taxes",
  management: "Property Management",
  legal: "Legal & Professional",
  marketing: "Marketing & Advertising",
  supplies: "Supplies & Materials",
  landscaping: "Landscaping & Grounds",
  improvements: "Capital Improvements",
  other: "Other"
};

const vendorSpecialties = {
  maintenance: "Maintenance & Repairs",
  cleaning: "Cleaning Services", 
  landscaping: "Landscaping",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  legal: "Legal Services",
  accounting: "Accounting",
  insurance: "Insurance",
  security: "Security",
  pest_control: "Pest Control",
  other: "Other"
};

export default function Expenses() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // State for expenses
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // State for vendors
  const [isCreateVendorDialogOpen, setIsCreateVendorDialogOpen] = useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [selectedVendorCategory, setSelectedVendorCategory] = useState("all");

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

  // Queries
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Mutations for expenses
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, expense }: { id: string; expense: Partial<InsertExpense> }) => {
      return apiRequest("PUT", `/api/expenses/${id}`, expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setSelectedExpense(null);
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations for vendors
  const createVendorMutation = useMutation({
    mutationFn: async (data: InsertVendor) => apiRequest("POST", "/api/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateVendorDialogOpen(false);
      createVendorForm.reset();
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, vendor }: { id: string; vendor: Partial<InsertVendor> }) => {
      return apiRequest("PUT", `/api/vendors/${id}`, vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsEditVendorDialogOpen(false);
      editVendorForm.reset();
      setSelectedVendor(null);
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = propertiesLoading || expensesLoading || vendorsLoading;

  // Filtering
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.vendorName && expense.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesProperty = selectedProperty === "all" || expense.propertyId.toString() === selectedProperty;
    
    // Date filtering
    const expenseDate = new Date(expense.date);
    const matchesStartDate = !startDate || expenseDate >= new Date(startDate);
    const matchesEndDate = !endDate || expenseDate <= new Date(endDate);
    
    return matchesSearch && matchesCategory && matchesProperty && matchesStartDate && matchesEndDate;
  });

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                         vendor.specialty.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                         (vendor.email && vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase()));
    const matchesCategory = selectedVendorCategory === "all" || vendor.specialty === selectedVendorCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount.toString());
    switch (expense.category) {
      case 'maintenance': return sum + amount;
      case 'utilities': return sum + amount;
      case 'insurance': return sum + amount;
      case 'taxes': return sum + amount;
      default: return sum + amount;
    }
  }, 0);

  // Handlers
  const onCreateSubmit = (data: ExpenseFormData) => {
    const expenseData: InsertExpense = {
      propertyId: data.propertyId,
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      isRecurring: data.isRecurring,
      recurrencePeriod: data.recurrencePeriod,
      vendorName: data.vendorName || "",
      notes: data.notes || "",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      accountNumber: data.accountNumber,
      policyEffectiveDate: data.policyEffectiveDate ? new Date(data.policyEffectiveDate) : undefined,
      policyExpirationDate: data.policyExpirationDate ? new Date(data.policyExpirationDate) : undefined,
      meterReadingStart: data.meterReadingStart,
      meterReadingEnd: data.meterReadingEnd,
      usageAmount: data.usageAmount,
    };

    createMutation.mutate(expenseData);
  };

  const onEditSubmit = (data: ExpenseFormData) => {
    if (!selectedExpense) return;

    const expenseData: Partial<InsertExpense> = {
      propertyId: data.propertyId,
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      isRecurring: data.isRecurring,
      recurrencePeriod: data.recurrencePeriod,
      vendorName: data.vendorName || "",
      notes: data.notes || "",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      accountNumber: data.accountNumber,
      policyEffectiveDate: data.policyEffectiveDate ? new Date(data.policyEffectiveDate) : undefined,
      policyExpirationDate: data.policyExpirationDate ? new Date(data.policyExpirationDate) : undefined,
      meterReadingStart: data.meterReadingStart,
      meterReadingEnd: data.meterReadingEnd,
      usageAmount: data.usageAmount,
    };

    updateMutation.mutate({ id: selectedExpense.id, expense: expenseData });
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    editForm.reset({
      propertyId: expense.propertyId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split('T')[0],
      isRecurring: expense.isRecurring,
      recurrencePeriod: expense.recurrencePeriod || undefined,
      vendorName: expense.vendorName || "",
      notes: expense.notes || "",
      startDate: expense.startDate ? new Date(expense.startDate).toISOString().split('T')[0] : "",
      endDate: expense.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : "",
      accountNumber: expense.accountNumber || "",
      policyEffectiveDate: expense.policyEffectiveDate ? new Date(expense.policyEffectiveDate).toISOString().split('T')[0] : "",
      policyExpirationDate: expense.policyExpirationDate ? new Date(expense.policyExpirationDate).toISOString().split('T')[0] : "",
      meterReadingStart: expense.meterReadingStart || "",
      meterReadingEnd: expense.meterReadingEnd || "",
      usageAmount: expense.usageAmount || "",
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
    return <div className="flex justify-center items-center min-h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses & Vendors</h1>
          <p className="text-muted-foreground">
            Track expenses and manage vendors in one place
          </p>
        </div>
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

                      {(createForm.watch("category") === "insurance" || createForm.watch("category") === "utilities" || createForm.watch("category") === "water" || createForm.watch("category") === "sewer" || createForm.watch("category") === "sanitation" || createForm.watch("category") === "taxes") && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="accountNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter account number"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="documentFile"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Upload Document</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="file"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      onChange={(e) => field.onChange(e.target.files?.[0])}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          {(createForm.watch("category") === "insurance" || createForm.watch("category") === "taxes") && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={createForm.control}
                                name="policyEffectiveDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{createForm.watch("category") === "insurance" ? "Policy Effective Date" : "Tax Period Start"}</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="date" 
                                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                      />
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
                                    <FormLabel>{createForm.watch("category") === "insurance" ? "Policy Expiration Date" : "Tax Period End"}</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="date" 
                                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          {(createForm.watch("category") === "utilities" || createForm.watch("category") === "water" || createForm.watch("category") === "sewer" || createForm.watch("category") === "sanitation") && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={createForm.control}
                                name="startDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Service Period Start</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="date" 
                                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
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
                                    <FormLabel>Service Period End</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="date" 
                                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </>
                      )}

                      <FormField
                        control={createForm.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Recurring Expense</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Set up automatic recurring for this expense
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
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

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Creating..." : "Add Expense"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Expense filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Total Expenses</CardTitle>
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black dark:text-white">{formatCurrency(totalExpenses)}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {filteredExpenses.length} expense records
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-800 border-green-200 dark:border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Monthly Recurring</CardTitle>
                  <div className="p-2 bg-green-500 rounded-lg">
                    <RotateCcw className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black dark:text-white">
                    {formatCurrency(filteredExpenses.filter(e => e.isRecurring && e.recurrencePeriod === 'monthly').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {filteredExpenses.filter(e => e.isRecurring && e.recurrencePeriod === 'monthly').length} monthly expenses
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black dark:text-white">Total Records</CardTitle>
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Receipt className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black dark:text-white">{filteredExpenses.length}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Across {properties.length} properties
                  </p>
                </CardContent>
              </Card>
            </div>



            {/* Expenses table */}
            <div className="grid gap-6">
              {filteredExpenses.map((expense) => {
                const property = properties.find(p => p.id.toString() === expense.propertyId);
                return (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{expense.description}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{property?.name || "Unknown Property"}</span>
                            <Badge variant="outline">{expenseCategories[expense.category as keyof typeof expenseCategories] || expense.category}</Badge>
                            <span>{formatDate(expense.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-semibold">{formatCurrency(parseFloat(expense.amount.toString()))}</div>
                            {expense.isRecurring && (
                              <Badge variant="secondary" className="text-xs">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                {expense.recurrencePeriod}
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    {(expense.vendorName || expense.notes || (expense.category === "insurance" || expense.category === "taxes") && (expense.documentUploadDate || expense.policyEffectiveDate || expense.policyExpirationDate)) && (
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          {expense.vendorName && (
                            <div className="flex items-center space-x-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span>Vendor: {expense.vendorName}</span>
                            </div>
                          )}
                          {expense.notes && (
                            <div className="flex items-start space-x-2">
                              <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{expense.notes}</span>
                            </div>
                          )}
                          {(expense.category === "insurance" || expense.category === "taxes") && (
                            <div className="space-y-1 border-t pt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Document Tracking</div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                {expense.documentUploadDate && (
                                  <div>
                                    <div className="font-medium">Upload Date</div>
                                    <div className="text-muted-foreground">{formatDate(expense.documentUploadDate)}</div>
                                  </div>
                                )}
                                {expense.policyEffectiveDate && (
                                  <div>
                                    <div className="font-medium">Effective Date</div>
                                    <div className="text-muted-foreground">{formatDate(expense.policyEffectiveDate)}</div>
                                  </div>
                                )}
                                {expense.policyExpirationDate && (
                                  <div>
                                    <div className="font-medium">Expiration Date</div>
                                    <div className="text-muted-foreground">{formatDate(expense.policyExpirationDate)}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="vendors">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vendor Management</h2>
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
                          <Badge variant="outline">{vendorSpecialties[vendor.specialty as keyof typeof vendorSpecialties] || vendor.specialty}</Badge>
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

      {/* Edit Expense Dialog */}
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
                      <Input placeholder="Expense description" {...field} />
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
                        <Input placeholder="0.00" {...field} />
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
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
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
                    <FormLabel>Vendor (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor name" {...field} />
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
                      <Input placeholder="Additional notes or details" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(editForm.watch("category") === "insurance" || editForm.watch("category") === "utilities" || editForm.watch("category") === "water" || editForm.watch("category") === "sewer" || editForm.watch("category") === "sanitation" || editForm.watch("category") === "taxes") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter account number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="documentFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Upload Document</FormLabel>
                          <FormControl>
                            <Input 
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => field.onChange(e.target.files?.[0])}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {(editForm.watch("category") === "insurance" || editForm.watch("category") === "taxes") && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="policyEffectiveDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{editForm.watch("category") === "insurance" ? "Policy Effective Date" : "Tax Period Start"}</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="policyExpirationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{editForm.watch("category") === "insurance" ? "Policy Expiration Date" : "Tax Period End"}</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  {(editForm.watch("category") === "utilities" || editForm.watch("category") === "water" || editForm.watch("category") === "sewer" || editForm.watch("category") === "sanitation") && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Period Start</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Period End</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </>
              )}

              <FormField
                control={editForm.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Recurring Expense</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Set up automatic recurring for this expense
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditVendorDialogOpen} onOpenChange={setIsEditVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <Form {...editVendorForm}>
            <form onSubmit={editVendorForm.handleSubmit(onEditVendorSubmit)} className="space-y-4">
              <FormField
                control={editVendorForm.control}
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
                  control={editVendorForm.control}
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
                  control={editVendorForm.control}
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
                control={editVendorForm.control}
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
                control={editVendorForm.control}
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
                  control={editVendorForm.control}
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
                  control={editVendorForm.control}
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
                  control={editVendorForm.control}
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editVendorForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="1-5 stars" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editVendorForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Active Vendor</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditVendorDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateVendorMutation.isPending}>
                  {updateVendorMutation.isPending ? "Updating..." : "Update Vendor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}