import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, HandHeart, Search, Filter, Phone, Mail, MapPin, Star } from "lucide-react";
import { insertVendorSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@shared/schema";

const serviceTypeColors: Record<string, string> = {
  plumbing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  electrical: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hvac: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  landscaping: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  cleaning: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  security: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      serviceType: "other",
      rating: undefined,
      notes: "",
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createVendorMutation.mutate(data);
  };

  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesServiceType = serviceTypeFilter === "all" || vendor.serviceType === serviceTypeFilter;
    return matchesSearch && matchesServiceType;
  });

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({rating})</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Vendors</h1>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
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
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Plumbing Services" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@abcplumbing.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Service St, City, State 12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="maintenance">General Maintenance</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? Number(value) : null)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">No rating</SelectItem>
                          <SelectItem value="1">1 Star</SelectItem>
                          <SelectItem value="2">2 Stars</SelectItem>
                          <SelectItem value="3">3 Stars</SelectItem>
                          <SelectItem value="4">4 Stars</SelectItem>
                          <SelectItem value="5">5 Stars</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this vendor..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Service Types</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="hvac">HVAC</SelectItem>
            <SelectItem value="landscaping">Landscaping</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="maintenance">General Maintenance</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors?.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <HandHeart className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    {vendor.contactPerson && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {vendor.contactPerson}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={serviceTypeColors[vendor.serviceType] || serviceTypeColors.other}>
                  {vendor.serviceType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendor.rating && (
                  <div className="flex items-center">
                    {renderStars(vendor.rating)}
                  </div>
                )}

                <div className="space-y-2">
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

                  {vendor.address && (
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{vendor.address}</span>
                    </div>
                  )}
                </div>

                {vendor.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{vendor.notes}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors?.length === 0 && (
        <div className="text-center py-12">
          <HandHeart className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-foreground">
            No vendors found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            {searchTerm || serviceTypeFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by adding your first vendor."
            }
          </p>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  status: string;
}

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<Vendor>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      category: "",
      status: "active",
    },
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/vendors"],
    initialData: [],
  });

  const addVendorMutation = useMutation({
    mutationFn: async (vendor: Vendor) => {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
  });

  const onSubmit = (data: Vendor) => {
    addVendorMutation.mutate(data);
  };

  const filteredVendors = vendors?.filter((vendor: Vendor) =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Maintenance, Cleaning" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addVendorMutation.isPending}>
                  {addVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))
        ) : filteredVendors.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No vendors found</p>
            </CardContent>
          </Card>
        ) : (
          filteredVendors.map((vendor: Vendor) => (
            <Card key={vendor.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{vendor.name}</CardTitle>
                  <Badge variant={vendor.status === "active" ? "default" : "secondary"}>
                    {vendor.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{vendor.email}</p>
                  <p>{vendor.phone}</p>
                  <p className="font-medium text-foreground">{vendor.category}</p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
