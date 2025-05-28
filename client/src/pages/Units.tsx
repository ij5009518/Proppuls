import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, DoorOpen, Search, Filter, Bed, Bath, Square, DollarSign } from "lucide-react";
import { insertUnitSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import type { Unit, Property } from "@shared/schema";

export default function Units() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: units, isLoading: unitsLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: {
      propertyId: 0,
      unitNumber: "",
      bedrooms: 1,
      bathrooms: "1.0",
      squareFootage: 800,
      rentAmount: "0",
      status: "vacant",
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/units", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Unit created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create unit",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createUnitMutation.mutate(data);
  };

  const filteredUnits = units?.filter((unit) => {
    const property = properties?.find(p => p.id === unit.propertyId);
    const matchesSearch = unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || unit.status === statusFilter;
    const matchesProperty = propertyFilter === "all" || unit.propertyId.toString() === propertyFilter;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "occupied":
        return "default";
      case "vacant":
        return "secondary";
      case "maintenance":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (unitsLoading || propertiesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Units</h1>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
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
        <h1 className="text-3xl font-bold">Units</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
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
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 101, 2A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="squareFootage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Footage</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="800" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="$1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUnitMutation.isPending}>
                    {createUnitMutation.isPending ? "Creating..." : "Add Unit"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties?.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits?.map((unit) => {
          const property = properties?.find(p => p.id === unit.propertyId);
          return (
            <Card key={unit.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Unit {unit.unitNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {property?.name}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(unit.status)}>
                    {unit.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center">
                      <Bed className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-sm font-medium">{unit.bedrooms}</span>
                      <span className="text-xs text-muted-foreground">Beds</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Bath className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-sm font-medium">{unit.bathrooms}</span>
                      <span className="text-xs text-muted-foreground">Baths</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Square className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-sm font-medium">{unit.squareFootage}</span>
                      <span className="text-xs text-muted-foreground">Sq Ft</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Rent</p>
                      <p className="font-bold text-lg flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatCurrency(unit.rentAmount)}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedUnit(unit);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUnits?.length === 0 && (
        <div className="text-center py-12">
          <DoorOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-foreground">
            No units found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            {searchTerm || statusFilter !== "all" || propertyFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating your first unit."
            }
          </p>
        </div>
      )}

      {/* Unit Details Modal */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Unit Details</DialogTitle>
          </DialogHeader>
          {selectedUnit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit Number</label>
                  <p className="text-lg font-semibold">{selectedUnit.unitNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property</label>
                  <p className="text-lg">{properties?.find(p => p.id === selectedUnit.propertyId)?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bedrooms</label>
                  <p className="text-lg">{selectedUnit.bedrooms}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bathrooms</label>
                  <p className="text-lg">{selectedUnit.bathrooms}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Square Footage</label>
                  <p className="text-lg">{selectedUnit.squareFootage ? `${selectedUnit.squareFootage} sq ft` : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Monthly Rent</label>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedUnit.rentAmount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className={`text-lg font-medium ${getStatusColor(selectedUnit.status)}`}>
                    {selectedUnit.status.charAt(0).toUpperCase() + selectedUnit.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
