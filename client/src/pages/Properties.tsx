import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Grid, List, Eye, Edit, Trash2, Home, DollarSign, Calculator, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Property, InsertProperty, Unit, Mortgage, Expense } from "@shared/schema";

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

type PropertyFormData = z.infer<typeof propertySchema>;

export default function Properties() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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

  const createForm = useForm<PropertyFormData>({
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
      createForm.reset();
      toast({ title: "Property created successfully" });
    },
    onError: (error) => {
      console.error("Create property error:", error);
      toast({ title: "Failed to create property", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProperty> }) =>
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
    mutationFn: (id: number) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Property deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete property", variant: "destructive" });
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
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
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
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
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
                <div className="flex justify-end space-x-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleView(property)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(property)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(property.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
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
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleView(property)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(property)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(property.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {selectedProperty?.name} - Property Details
            </DialogTitle>
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
                  <Button size="sm" onClick={() => {
                    window.location.href = '/units';
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                  </Button>
                </div>
                
                <div className="grid gap-4">
                  {getPropertyUnits(selectedProperty.id).length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No units found for this property.</p>
                        <Button className="mt-4" onClick={() => {
                          window.location.href = '/units';
                        }}>
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
                    toast({
                      title: "Add Mortgage",
                      description: "Mortgage creation form will be available soon.",
                    });
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
                        toast({
                          title: "Add Mortgage",
                          description: "Mortgage creation form will be available soon.",
                        });
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
                  <Button size="sm" onClick={() => {
                    toast({
                      title: "Feature Coming Soon",
                      description: "Expense management interface will be available soon.",
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>

                {getPropertyExpenses(selectedProperty.id).length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No expenses recorded for this property.</p>
                      <Button onClick={() => {
                        toast({
                          title: "Feature Coming Soon",
                          description: "Expense tracking will be available soon.",
                        });
                      }}>
                        Add First Expense
                      </Button>
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
    </div>
  );
}