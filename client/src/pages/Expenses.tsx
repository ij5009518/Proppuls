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
import { Plus, Edit, Trash2, DollarSign, Receipt, Calendar, Filter, Building } from "lucide-react";

// Schema
const expenseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean().default(false),
  recurrencePeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  // Insurance and tax specific fields
  policyEffectiveDate: z.string().optional(),
  policyExpirationDate: z.string().optional(),
  accountNumber: z.string().optional(),
  // Utility specific fields
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  meterReadingStart: z.string().optional(),
  meterReadingEnd: z.string().optional(),
  usageAmount: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email required"),
  rating: z.number().min(1).max(5),
});

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

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Computed values
  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount.toString()), 0) : 0;

  // Filtered data
  const filteredExpenses = Array.isArray(expenses) ? expenses.filter((expense: any) => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesProperty = selectedProperty === "all" || expense.propertyId === selectedProperty;
    return matchesSearch && matchesCategory && matchesProperty;
  }) : [];

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
      recurrencePeriod: "monthly",
      vendorName: "",
      notes: "",
      policyEffectiveDate: "",
      policyExpirationDate: "",
      accountNumber: "",
      startDate: "",
      endDate: "",
      meterReadingStart: "",
      meterReadingEnd: "",
      usageAmount: "",
    },
  });

  const editForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
  });

  const vendorForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      specialty: "",
      phone: "",
      email: "",
      rating: 5,
    },
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Expense created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create expense", variant: "destructive" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => 
      apiRequest("PATCH", `/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditDialogOpen(false);
      toast({ title: "Expense updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update expense", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: VendorFormData) => apiRequest("POST", "/api/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      vendorForm.reset();
      toast({ title: "Vendor created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create vendor", variant: "destructive" });
    },
  });

  const handleCreateExpense = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    editForm.reset({
      propertyId: expense.propertyId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date.split('T')[0],
      isRecurring: expense.isRecurring,
      vendorName: expense.vendorName || "",
      notes: expense.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateExpense = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleCreateVendor = (data: VendorFormData) => {
    createVendorMutation.mutate(data);
  };

  const categories = [
    "Maintenance & Repairs",
    "Utilities",
    "Insurance",
    "Property Management",
    "Legal & Professional",
    "Marketing & Advertising",
    "Supplies",
    "Other"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateExpense)} className="space-y-4">
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
                          {Array.isArray(properties) && properties.map((property: any) => (
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
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter description" {...field} />
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
                            {createForm.watch("category") === "insurance" ? "Policy Number" : "Account Number"}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder={createForm.watch("category") === "insurance" ? "Policy number" : "Account number"} {...field} />
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
                  <FormField
                    control={createForm.control}
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
                )}

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

                <div className="flex gap-2">
                  <Button type="submit" disabled={createExpenseMutation.isPending}>
                    {createExpenseMutation.isPending ? "Creating..." : "Create Expense"}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredExpenses
                  .filter((expense: any) => {
                    const expenseDate = new Date(expense.date);
                    const now = new Date();
                    return expenseDate.getMonth() === now.getMonth() && 
                           expenseDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum: number, expense: any) => sum + parseFloat(expense.amount.toString()), 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredExpenses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(vendors) ? vendors.length : 0}</div>
          </CardContent>
        </Card>
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
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {Array.isArray(properties) && properties.map((property: any) => (
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No expenses found. Add your first expense to get started.
              </p>
            ) : (
              filteredExpenses.map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium">{expense.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.category} • {formatDate(expense.date)}
                        </p>
                        {expense.vendorName && (
                          <p className="text-sm text-muted-foreground">
                            Vendor: {expense.vendorName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(parseFloat(expense.amount))}</div>
                      {expense.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateExpense)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="flex gap-2">
                <Button type="submit" disabled={updateExpenseMutation.isPending}>
                  {updateExpenseMutation.isPending ? "Updating..." : "Update Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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