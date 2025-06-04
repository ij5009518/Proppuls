import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Grid, List, Eye, Edit, Trash2, Home, DollarSign, Calculator, Users, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, InsertProperty, Unit, Mortgage, Expense, InsertExpense, InsertUnit, InsertTask, Task } from "@shared/schema";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  totalUnits: z.number().min(1, "Must have at least 1 unit"),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  purchaseDate: z.date(),
  propertyType: z.string().min(1, "Property type is required"),
  status: z.string().min(1, "Status is required"),
});

const unitSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  bedrooms: z.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.string().min(1, "Bathrooms is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  status: z.string().min(1, "Status is required"),
  squareFootage: z.number().optional(),
});

const mortgageSchema = z.object({
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

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.string().min(1, "Priority is required"),
  propertyId: z.string().optional(),
  dueDate: z.string().optional(),
});

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
});

type PropertyFormData = z.infer<typeof propertySchema>;
type MortgageFormData = z.infer<typeof mortgageSchema>;
type UnitFormData = z.infer<typeof unitSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

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

export default function Properties() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isMortgageDialogOpen, setIsMortgageDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isCreateExpenseDialogOpen, setIsCreateExpenseDialogOpen] = useState(false);

  const { toast } = useToast();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Additional data for property details
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: mortgages = [] } = useQuery<Mortgage[]>({
    queryKey: ["/api/mortgages"],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const createForm = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unitNumber: "",
      bedrooms: 1,
      bathrooms: "1",
      rentAmount: "",
      status: "vacant",
      squareFootage: undefined,
    },
  });

  const createPropertyForm = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      totalUnits: 1,
      purchasePrice: "",
      purchaseDate: new Date(),
      propertyType: "",
      status: "active",
    },
  });

  const mortgageForm = useForm<MortgageFormData>({
    resolver: zodResolver(mortgageSchema),
    defaultValues: {
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

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      category: "general",
      priority: "medium",
      propertyId: "",
    },
  });

  const expenseForm = useForm<ExpenseFormData>({
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
      startDate: "",
      endDate: "",
      accountNumber: "",
      policyEffectiveDate: "",
      policyExpirationDate: "",
      meterReadingStart: "",
      meterReadingEnd: "",
      usageAmount: "",
      recurrencePeriod: "monthly",
    },
  });

  const taskCategories = [
    "general",
    "maintenance", 
    "inspection",
    "lease",
    "payment",
    "vendor",
    "legal",
    "administrative"
  ];

  // Mortgage payment calculator function
  const calculateMortgagePayments = (principal: number, interestRate: number, termYears: number) => {
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = termYears * 12;

    // Calculate monthly payment using amortization formula
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Calculate first month's interest and principal
    const firstMonthInterest = principal * monthlyRate;
    const firstMonthPrincipal = monthlyPayment - firstMonthInterest;

    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      principalAmount: firstMonthPrincipal.toFixed(2),
      interestAmount: firstMonthInterest.toFixed(2)
    };
  };

  // Auto-calculate when key fields change
  const watchedValues = mortgageForm.watch(["originalAmount", "interestRate", "termYears"]);

  const handleAutoCalculate = () => {
    const [originalAmount, interestRate, termYears] = watchedValues;

    if (originalAmount && interestRate && termYears) {
      const principal = parseFloat(originalAmount);
      const rate = parseFloat(interestRate);
      const years = parseInt(termYears.toString());

      if (principal > 0 && rate > 0 && years > 0) {
        const calculations = calculateMortgagePayments(principal, rate, years);

        mortgageForm.setValue("monthlyPayment", calculations.monthlyPayment);
        mortgageForm.setValue("principalAmount", calculations.principalAmount);
        mortgageForm.setValue("interestAmount", calculations.interestAmount);

        // Auto-set current balance to original amount if not set
        if (!mortgageForm.getValues("currentBalance")) {
          mortgageForm.setValue("currentBalance", originalAmount);
        }
      }
    }
  };

  const editForm = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      totalUnits: 1,
      purchasePrice: "",
      purchaseDate: new Date(),
      propertyType: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      try {
        const response = await apiRequest("POST", "/api/properties", data);
        return response.json();
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsCreateDialogOpen(false);
      createPropertyForm.reset();
      toast({ title: "Property created successfully" });
    },
    onError: (error) => {
      console.error("Create property error:", error);
      toast({ title: "Failed to create property", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProperty> }) =>
      apiRequest("PATCH", `/api/properties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsEditDialogOpen(false);
      setSelectedProperty(null);
      toast({ title: "Property updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update property", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Property deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete property", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsCreateTaskDialogOpen(false);
      taskForm.reset();
      toast({ title: "Task created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertExpense) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsCreateExpenseDialogOpen(false);
      expenseForm.reset();
      toast({ title: "Expense created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create expense", description: error.message, variant: "destructive" });
    },
  });

  const onCreateSubmit = (data: PropertyFormData) => {
    console.log("Form data being submitted:", data);
    // Ensure proper data formatting for database
    const formattedData = {
      ...data,
      purchasePrice: data.purchasePrice.toString(),
      purchaseDate: new Date(data.purchaseDate),
    };
    console.log("Formatted data:", formattedData);
    createMutation.mutate(formattedData);
  };

  const onEditSubmit = (data: PropertyFormData) => {
    if (selectedProperty) {
      updateMutation.mutate({ id: selectedProperty.id, data });
    }
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    editForm.reset({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      totalUnits: property.totalUnits,
      purchasePrice: property.purchasePrice,
      purchaseDate: new Date(property.purchaseDate),
      propertyType: property.propertyType,
      status: property.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (property: Property) => {
    setSelectedProperty(property);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this property?")) {
      deleteMutation.mutate(id);
    }
  };

  const onCreateTaskSubmit = (data: TaskFormData) => {
    const taskData: InsertTask = {
      title: data.title,
      description: data.description,
      status: data.status as "pending" | "in_progress" | "completed" | "cancelled",
      category: data.category,
      priority: data.priority as "low" | "medium" | "high" | "urgent",
      propertyId: selectedProperty?.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };
    createTaskMutation.mutate(taskData);
    taskForm.reset();
    setIsCreateTaskDialogOpen(false);
  };

  const onCreateExpenseSubmit = (data: ExpenseFormData) => {
    const expenseData: InsertExpense = {
      propertyId: selectedProperty?.id?.toString(),
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      isRecurring: data.isRecurring,
      vendorName: data.vendorName || undefined,
      notes: data.notes || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      accountNumber: data.accountNumber || undefined,
      policyEffectiveDate: data.policyEffectiveDate ? new Date(data.policyEffectiveDate) : undefined,
      policyExpirationDate: data.policyExpirationDate ? new Date(data.policyExpirationDate) : undefined,
      meterReadingStart: data.meterReadingStart || undefined,
      meterReadingEnd: data.meterReadingEnd || undefined,
      usageAmount: data.usageAmount || undefined,
      recurrencePeriod: data.recurrencePeriod || undefined,
    };
    createExpenseMutation.mutate(expenseData);
  };

  // Helper functions for property details
  const getPropertyUnits = (propertyId: number) => {
    return units.filter(unit => unit.propertyId === propertyId);
  };

  const getPropertyMortgages = (propertyId: number) => {
    return mortgages.filter(mortgage => mortgage.propertyId === propertyId);
  };

  const getPropertyExpenses = (propertyId: number) => {
    return expenses.filter(expense => expense.propertyId === propertyId);
  };

  const calculatePropertyStats = (propertyId: number) => {
    const propertyUnits = getPropertyUnits(propertyId);
    const propertyExpenses = getPropertyExpenses(propertyId);

    const totalUnits = propertyUnits.length;
    const occupiedUnits = propertyUnits.filter(unit => unit.status === "occupied").length;
    const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";

    const monthlyRent = propertyUnits.reduce((sum, unit) => {
      return sum + (unit.status === "occupied" ? parseFloat(unit.rentAmount) : 0);
    }, 0);

    const monthlyExpenses = propertyExpenses
      .filter(expense => expense.isRecurring)
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    return {
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyRent,
      monthlyExpenses,
      netIncome: monthlyRent - monthlyExpenses
    };
  };



  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-96">Loading properties...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <Form {...createPropertyForm}>
              <form onSubmit={createPropertyForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createPropertyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Property name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createPropertyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createPropertyForm.control}
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
                    control={createPropertyForm.control}
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
                    control={createPropertyForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createPropertyForm.control}
                    name="totalUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Units</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createPropertyForm.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                          <Input placeholder="$0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createPropertyForm.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="single_family">Single Family</SelectItem>
                            <SelectItem value="duplex">Duplex</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Property"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card 
              key={property.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(property)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{property.name}</span>
                  <Badge className={getStatusColor(property.status)}>
                    {property.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{property.address}</p>
                  <p className="text-sm text-gray-600">
                    {property.city}, {property.state} {property.zipCode}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Units:</span> {property.totalUnits}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Type:</span> {property.propertyType}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Purchase Price:</span> {formatCurrency(property.purchasePrice)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((property) => (
            <Card 
              key={property.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(property)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{property.name}</h3>
                        <p className="text-sm text-gray-600">
                          {property.address}, {property.city}, {property.state} {property.zipCode}
                        </p>
                      </div>
                      <Badge className={getStatusColor(property.status)}>
                        {property.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{property.totalUnits} units</p>
                      <p className="text-sm text-gray-600">{formatCurrency(property.purchasePrice)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Property Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {selectedProperty?.name} - Property Details
              </DialogTitle>
              <div className="flex items-center gap-2 mr-8">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreateTaskDialogOpen(true);
                  }}
                  title="Add Task"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(selectedProperty!);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedProperty!.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedProperty && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="units" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Units
                </TabsTrigger>
                <TabsTrigger value="mortgage" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Mortgage
                </TabsTrigger>
                <TabsTrigger value="taxes" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Taxes & Expenses
                </TabsTrigger>
              </TabsList>

              {/* Property Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Property Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Property Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Address</label>
                        <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">City, State ZIP</label>
                        <p className="text-sm text-muted-foreground">
                          {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Property Type</label>
                        <p className="text-sm text-muted-foreground capitalize">{selectedProperty.propertyType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge className={getStatusColor(selectedProperty.status)}>
                          {selectedProperty.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const stats = calculatePropertyStats(selectedProperty.id);
                        return (
                          <>
                            <div>
                              <label className="text-sm font-medium">Purchase Price</label>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(selectedProperty.purchasePrice)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Monthly Rent Income</label>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(stats.monthlyRent)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Monthly Expenses</label>
                              <p className="text-lg font-semibold text-red-600">
                                {formatCurrency(stats.monthlyExpenses)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Net Monthly Income</label>
                              <p className={`text-lg font-semibold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(stats.netIncome)}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Occupancy Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Occupancy Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const stats = calculatePropertyStats(selectedProperty.id);
                        return (
                          <>
                            <div>
                              <label className="text-sm font-medium">Total Units</label>
                              <p className="text-lg font-semibold">{stats.totalUnits}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Occupied Units</label>
                              <p className="text-lg font-semibold text-green-600">{stats.occupiedUnits}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Vacant Units</label>
                              <p className="text-lg font-semibold text-orange-600">{stats.totalUnits - stats.occupiedUnits}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Occupancy Rate</label>
                              <p className="text-lg font-semibold">{stats.occupancyRate}%</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Purchase Date</label>
                              <p className="text-sm text-muted-foreground">{formatDate(selectedProperty.purchaseDate)}</p>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Units Management Tab */}
              <TabsContent value="units" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Property Units</h3>
                  <Button size="sm" onClick={() => setIsUnitDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                  </Button>
                </div>

                <div className="grid gap-4">
                  {getPropertyUnits(selectedProperty.id).length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No units found for this property.</p>
                        <Button className="mt-4" onClick={() => setIsUnitDialogOpen(true)}>
                          Add First Unit
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    getPropertyUnits(selectedProperty.id).map((unit) => (
                      <Card key={unit.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-semibold">Unit {unit.unitNumber}</h4>
                              <p className="text-sm text-muted-foreground">
                                {unit.bedrooms} bed, {unit.bathrooms} bath • {unit.squareFootage || 'N/A'} sq ft
                              </p>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(unit.rentAmount)}/month
                              </p>
                            </div>
                            <Badge className={getStatusColor(unit.status)}>
                              {unit.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Enhanced Mortgage Information Tab */}
              <TabsContent value="mortgage" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Mortgage Details & Payment Breakdown</h3>
                  <Button size="sm" onClick={() => {
                    setIsMortgageDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mortgage
                  </Button>
                </div>

                {getPropertyMortgages(selectedProperty.id).length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No mortgage information found for this property.</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add mortgage details to track monthly payments, principal/interest breakdown, and escrow information.
                      </p>
                      <Button onClick={() => {
                        setIsMortgageDialogOpen(true);
                      }}>
                        Add Mortgage Details
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {getPropertyMortgages(selectedProperty.id).map((mortgage) => (
                      <div key={mortgage.id} className="space-y-4">
                        {/* Mortgage Overview Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Mortgage Details - {mortgage.lender}</span>
                              <Badge variant="outline">{mortgage.accountNumber || "Account Info Needed"}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                                <p className="text-lg font-semibold">{formatCurrency(mortgage.originalAmount)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Current Balance</label>
                                <p className="text-lg font-semibold text-orange-600">{formatCurrency(mortgage.currentBalance)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Interest Rate</label>
                                <p className="text-lg font-semibold">{mortgage.interestRate}%</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Term</label>
                                <p className="text-lg font-semibold">{mortgage.termYears} years</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Monthly Payment Breakdown Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Calculator className="h-5 w-5" />
                              Monthly Payment Breakdown
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Total Payment */}
                              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <label className="text-sm font-medium text-muted-foreground">Total Monthly Payment</label>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(mortgage.monthlyPayment)}</p>
                              </div>

                              {/* Principal */}
                              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <label className="text-sm font-medium text-muted-foreground">Principal</label>
                                <p className="text-xl font-semibold text-green-600">{formatCurrency(mortgage.principalAmount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {((parseFloat(mortgage.principalAmount) / parseFloat(mortgage.monthlyPayment)) * 100).toFixed(1)}%
                                </p>
                              </div>

                              {/* Interest */}
                              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <label className="text-sm font-medium text-muted-foreground">Interest</label>
                                <p className="text-xl font-semibold text-red-600">{formatCurrency(mortgage.interestAmount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {((parseFloat(mortgage.interestAmount) / parseFloat(mortgage.monthlyPayment)) * 100).toFixed(1)}%
                                </p>
                              </div>

                              {/* Escrow */}
                              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <label className="text-sm font-medium text-muted-foreground">Escrow</label>
                                <p className="text-xl font-semibold text-orange-600">
                                  {formatCurrency(mortgage.escrowAmount || '0')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {mortgage.escrowAmount ? 
                                    ((parseFloat(mortgage.escrowAmount) / parseFloat(mortgage.monthlyPayment)) * 100).toFixed(1) + '%' : 
                                    '0%'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Payment Progress Bar */}
                            <div className="mt-6">
                              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                <span>Loan Progress</span>
                                <span>
                                  {formatCurrency(parseFloat(mortgage.originalAmount) - parseFloat(mortgage.currentBalance))} of {formatCurrency(mortgage.originalAmount)} paid
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div 
                                  className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${((parseFloat(mortgage.originalAmount) - parseFloat(mortgage.currentBalance)) / parseFloat(mortgage.originalAmount)) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>
                                  {(((parseFloat(mortgage.originalAmount) - parseFloat(mortgage.currentBalance)) / parseFloat(mortgage.originalAmount)) * 100).toFixed(1)}% paid
                                </span>
                                <span>Started: {formatDate(mortgage.startDate)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Amortization Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Loan Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="font-medium text-muted-foreground">Remaining Balance</label>
                                <p className="text-lg font-semibold text-orange-600">{formatCurrency(mortgage.currentBalance)}</p>
                              </div>
                              <div>
                                <label className="font-medium text-muted-foreground">Total Interest Paid</label>
                                <p className="text-lg font-semibold text-red-600">
                                  {formatCurrency((parseFloat(mortgage.originalAmount) - parseFloat(mortgage.currentBalance)) * 0.7)} {/* Rough estimate */}
                                </p>
                              </div>
                              <div>
                                <label className="font-medium text-muted-foreground">Estimated Payoff</label>
                                <p className="text-lg font-semibold">
                                  {new Date(new Date(mortgage.startDate).getTime() + (mortgage.termYears * 365 * 24 * 60 * 60 * 1000)).getFullYear()}
                                </p>
                              </div>
                            </div>
                            {mortgage.notes && (
                              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                                <label className="font-medium text-sm text-muted-foreground">Notes</label>
                                <p className="text-sm mt-1">{mortgage.notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Taxes & Expenses Tab */}
              <TabsContent value="taxes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Property Expenses & Taxes</h3>
                  <Dialog open={isCreateExpenseDialogOpen} onOpenChange={setIsCreateExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>

                {getPropertyExpenses(selectedProperty.id).length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No expenses recorded for this property.</p>
                      <Dialog open={isCreateExpenseDialogOpen} onOpenChange={setIsCreateExpenseDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>Add First Expense</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add New Expense</DialogTitle>
                          </DialogHeader>
                          <Form {...expenseForm}>
                            <form onSubmit={expenseForm.handleSubmit(onCreateExpenseSubmit)} className="space-y-4">
                              <FormField
                                control={expenseForm.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Object.entries(expenseCategories).map(([key, label]) => (
                                          <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={expenseForm.control}
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
                                  control={expenseForm.control}
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
                                  control={expenseForm.control}
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
                                control={expenseForm.control}
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
                              {/* Conditional fields based on category */}
                              {(expenseForm.watch("category") === "insurance" || expenseForm.watch("category") === "taxes") && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={expenseForm.control}
                                      name="policyEffectiveDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            {expenseForm.watch("category") === "insurance" ? "Policy Effective Date" : "Tax Period Start"}
                                          </FormLabel>
                                          <FormControl>
                                            <Input type="date" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={expenseForm.control}
                                      name="policyExpirationDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            {expenseForm.watch("category") === "insurance" ? "Policy Expiration Date" : "Tax Period End"}
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
                                    control={expenseForm.control}
                                    name="accountNumber"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          {expenseForm.watch("category") === "insurance" ? "Policy Number" : "Account Number"}
                                        </FormLabel>
                                        <FormControl>
                                          <Input placeholder={expenseForm.watch("category") === "insurance" ? "Policy number" : "Account number"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              )}

                              {/* Utility-specific fields */}
                              {(expenseForm.watch("category") === "utilities" || expenseForm.watch("category") === "water" || 
                                expenseForm.watch("category") === "sewer" || expenseForm.watch("category") === "sanitation") && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={expenseForm.control}
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
                                      control={expenseForm.control}
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
                                    control={expenseForm.control}
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
                                  {(expenseForm.watch("category") === "water" || expenseForm.watch("category") === "sewer") && (
                                    <div className="grid grid-cols-3 gap-4">
                                      <FormField
                                        control={expenseForm.control}
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
                                        control={expenseForm.control}
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
                                        control={expenseForm.control}
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
                              {expenseForm.watch("isRecurring") && (
                                <>
                                  <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                      control={expenseForm.control}
                                      name="recurrencePeriod"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Frequency</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                      control={expenseForm.control}
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
                                      control={expenseForm.control}
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
                                </>
                              )}
                              
                              {/* Recurring expense toggle */}
                              <FormField
                                control={expenseForm.control}
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
                              
                              <FormField
                                control={expenseForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="Additional notes" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsCreateExpenseDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={createExpenseMutation.isPending}>
                                  {createExpenseMutation.isPending ? "Creating..." : "Add Expense"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {getPropertyExpenses(selectedProperty.id).map((expense) => (
                      <Card key={expense.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-semibold capitalize">{expense.category}</h4>
                              <p className="text-sm text-muted-foreground">{expense.description}</p>
                              <p className="text-lg font-semibold text-red-600">
                                {formatCurrency(expense.amount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={expense.isRecurring ? "default" : "secondary"}>
                                {expense.isRecurring ? "Recurring" : "One-time"}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatDate(expense.date)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Property name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="totalUnits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Units</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input placeholder="$0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="single_family">Single Family</SelectItem>
                          <SelectItem value="duplex">Duplex</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Property"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mortgage Creation Dialog */}
      <Dialog open={isMortgageDialogOpen} onOpenChange={setIsMortgageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Add Mortgage Details for {selectedProperty?.name}
            </DialogTitle>
          </DialogHeader>
          <Form {...mortgageForm}>
            <form onSubmit={mortgageForm.handleSubmit((data) => {
              // Add propertyId to the mortgage data
              const mortgageData = {
                ...data,
                propertyId: selectedProperty?.id || 0,
                escrowAmount: data.escrowAmount || "0",
              };

              // Create mortgage via API
              fetch("/api/mortgages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mortgageData),
              })
              .then(res => res.json())
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/mortgages"] });
                setIsMortgageDialogOpen(false);
                mortgageForm.reset();
                toast({
                  title: "Success",
                  description: "Mortgage added successfully.",
                });
              })
              .catch(() => {
                toast({
                  title: "Error",
                  description: "Failed to add mortgage.",
                  variant: "destructive",
                });
              });
            })} className="space-y-6">

              {/* Basic Mortgage Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Mortgage Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={mortgageForm.control}
                    name="lender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lender Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Wells Fargo Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Loan Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={mortgageForm.control}
                    name="originalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Loan Amount</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="285000" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Trigger auto-calculation after a short delay
                              setTimeout(handleAutoCalculate, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="currentBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Balance</FormLabel>
                        <FormControl>
                          <Input placeholder="275000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="4.25" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              setTimeout(handleAutoCalculate, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={mortgageForm.control}
                    name="termYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term (Years)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value) || 0);
                              setTimeout(handleAutoCalculate, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Auto-Calculate Button */}
                <div className="flex justify-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAutoCalculate}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    Calculate Monthly Payments
                  </Button>
                </div>
              </div>

              {/* Monthly Payment Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Monthly Payment Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={mortgageForm.control}
                    name="monthlyPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Monthly Payment</FormLabel>
                        <FormControl>
                          <Input placeholder="1400.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="principalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Principal Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="450.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="interestAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="750.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={mortgageForm.control}
                    name="escrowAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escrow Amount (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="200.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <strong>💡 Smart Calculator:</strong> The payment amounts above are automatically calculated as you type! 
                  Based on your loan amount, interest rate, and term, we compute the exact monthly payment breakdown.
                  <br />
                  <strong>Tip:</strong> Principal builds equity, interest is the cost of borrowing, and escrow covers taxes/insurance.
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={mortgageForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Fixed rate mortgage with escrow for taxes and insurance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsMortgageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Mortgage
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Unit Creation Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Unit to {selectedProperty?.name}</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => {
                // Add propertyId to the unit data
                const unitData = {
                  ...data,
                  propertyId: selectedProperty.id,
                  bedrooms: Number(data.bedrooms) || 1,
                  rentAmount: data.rentAmount.toString(),
                  bathrooms: data.bathrooms.toString(),
                };

                // Create unit via API
                fetch("/api/units", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(unitData),
                })
                .then(res => res.json())
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/units"] });
                  setIsUnitDialogOpen(false);
                  createForm.reset();
                  toast({
                    title: "Success",
                    description: "Unit added successfully.",
                  });
                })
                .catch(() => {
                  toast({
                    title: "Error",
                    description: "Failed to add unit.",
                    variant: "destructive",
                  });
                });
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input placeholder="1.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="$1,200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="squareFootage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="850"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Unit
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Task for {selectedProperty?.name}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onCreateTaskSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taskCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
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
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}