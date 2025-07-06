import { useState } from "react";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Grid, List, Upload, Download, FileText, DollarSign, Calendar, CalendarIcon, Clock, AlertTriangle, CheckSquare, Shield, MessageSquare, History, Mail, Phone, CheckCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Tenant, InsertTenant, Unit, RentPayment, InsertRentPayment, Task, InsertTask, TenantHistory } from "@shared/schema";
import TaskDetails from "./TaskDetails";

// Component to display outstanding balance for a tenant
function OutstandingBalanceDisplay({ tenantId }: { tenantId: string }) {
  const { data: tenantOutstandingBalance, isLoading: balanceLoading, refetch } = useQuery({
    queryKey: [`/api/outstanding-balance/${tenantId}`],
    enabled: !!tenantId,
  });
  
  const { data: rentPayments } = useQuery({ 
    queryKey: ["/api/rent-payments"],
  });
  
  const totalOutstanding = tenantOutstandingBalance?.balance || 0;
  
  // Calculate total paid
  const tenantPayments = rentPayments?.filter((payment: any) => payment.tenantId === tenantId) || [];
  const totalPaid = tenantPayments
    .filter((payment: any) => payment.paidDate)
    .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
  
  if (balanceLoading) {
    return (
      <div className="text-center">
        <div className="space-y-1">
          <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div className="space-y-1">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Paid</div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid.toString())}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Outstanding</div>
          <div className="font-medium text-blue-600 dark:text-blue-400">
            {formatCurrency(totalOutstanding.toString())}
          </div>
        </div>
      </div>
    </div>
  );
}

const tenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  status: z.enum(["active", "inactive", "pending"]),
  unitId: z.string().optional(),
  leaseStart: z.date().optional(),
  leaseEnd: z.date().optional(),
  monthlyRent: z.string().optional(),
  deposit: z.string().optional(),
  dateOfBirth: z.date().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  idDocumentUrl: z.string().optional(),
  idDocumentName: z.string().optional(),
  tenantType: z.enum(["primary", "spouse", "child", "other"]).default("primary"),
  relationToPrimary: z.string().optional(),
});

const tenantStatusSchema = z.object({
  status: z.enum(["active", "pending", "moved"]),
  moveOutDate: z.string().optional(),
  moveOutReason: z.string().optional(),
});

const rentPaymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  unitId: z.string().min(1, "Unit is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.date(),
  paymentMethod: z.enum(["CHECK", "CASH", "ACH"]),
  lateFeeAmount: z.string().optional(),
  notes: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date(),
  assignedTo: z.string().optional(),
  tenantId: z.string().optional(),
  unitId: z.string().optional(),
  propertyId: z.string().optional(),
  vendorId: z.string().optional(),
  estimatedCost: z.string().optional(),
  actualCost: z.string().optional(),
});

const billingRecordSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.date(),
  billingPeriod: z.string().min(1, "Billing period is required"),
  status: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().optional(),
});

const dueDateOptionSchema = z.object({
  dueDate: z.date(),
});

export default function Tenants() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isBackgroundCheckDialogOpen, setIsBackgroundCheckDialogOpen] = useState(false);
  const [isTenantHistoryDialogOpen, setIsTenantHistoryDialogOpen] = useState(false);
  const [isTenantStatusDialogOpen, setIsTenantStatusDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedUnitForHistory, setSelectedUnitForHistory] = useState<Unit | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [uploadedIdDocument, setUploadedIdDocument] = useState<{url: string, name: string} | null>(null);
  const [uploadedIdBackDocument, setUploadedIdBackDocument] = useState<{url: string, name: string} | null>(null);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingIdBack, setIsUploadingIdBack] = useState(false);
  const [editBillingRecord, setEditBillingRecord] = useState<any>(null);
  const [isEditBillingDialogOpen, setIsEditBillingDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const { toast } = useToast();

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: rentPayments } = useQuery({
    queryKey: ["/api/rent-payments"],
  });

  // Fetch outstanding balances for all tenants (simplified)
  const { data: tenantOutstandingBalances, refetch: refetchBalances } = useQuery({
    queryKey: ["/api/outstanding-balances"],
    queryFn: async () => {
      if (!tenants) return {};
      const balances: Record<string, number> = {};
      await Promise.all(
        tenants.map(async (tenant: Tenant) => {
          try {
            const response = await apiRequest("GET", `/api/outstanding-balance/${tenant.id}`);
            balances[tenant.id] = response.balance || 0;
          } catch (error) {
            balances[tenant.id] = 0;
          }
        })
      );
      return balances;
    },
    enabled: !!tenants,
  });

  // Fetch all billing records (simplified)
  const { data: allBillingRecords } = useQuery({
    queryKey: ["/api/all-billing-records"],
    queryFn: async () => {
      if (!tenants) return {};
      const records: Record<string, any[]> = {};
      await Promise.all(
        tenants.map(async (tenant: Tenant) => {
          try {
            const response = await apiRequest("GET", `/api/billing-records/${tenant.id}`);
            records[tenant.id] = response || [];
          } catch (error) {
            records[tenant.id] = [];
          }
        })
      );
      return records;
    },
    enabled: !!tenants,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: tenantHistory = [] } = useQuery<TenantHistory[]>({
    queryKey: ["/api/tenant-history", selectedUnitForHistory?.id],
    enabled: !!selectedUnitForHistory?.id,
  });

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: undefined,
      emergencyContactName: "",
      emergencyContactPhone: "",
      status: "pending",
      unitId: "",
      leaseStart: undefined,
      leaseEnd: undefined,
      monthlyRent: "",
      deposit: "",
      idDocumentUrl: "",
      idDocumentName: "",
      tenantType: "primary",
      relationToPrimary: "",
    },
  });

  const paymentForm = useForm<z.infer<typeof rentPaymentSchema>>({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: "",
      paymentDate: new Date(),
      paymentMethod: "CHECK",
      lateFeeAmount: "",
      notes: "",
    },
  });

  const editPaymentForm = useForm<z.infer<typeof rentPaymentSchema>>({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      tenantId: "",
      unitId: "",
      amount: "",
      paymentDate: new Date(),
      paymentMethod: "CHECK",
      lateFeeAmount: "",
      notes: "",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      category: "",
      priority: "medium",
      assignedTo: "",
      estimatedCost: "",
      actualCost: "",
    },
  });

  const tenantStatusForm = useForm<z.infer<typeof tenantStatusSchema>>({
    resolver: zodResolver(tenantStatusSchema),
    defaultValues: {
      status: "active",
      moveOutDate: "",
      moveOutReason: "",
    },
  });

  const billingRecordForm = useForm<z.infer<typeof billingRecordSchema>>({
    resolver: zodResolver(billingRecordSchema),
    defaultValues: {
      amount: "",
      billingPeriod: "",
      status: "pending",
      notes: "",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tenants", data),
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/units"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/all-billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] }),
        queryClient.refetchQueries({ queryKey: ["/api/tenants"] }),
        queryClient.refetchQueries({ queryKey: ["/api/units"] }),
      ]);
      
      // Reset component state
      setIsAddDialogOpen(false);
      form.reset();
      setUploadedIdDocument(null);
      setUploadedIdBackDocument(null);
      toast({ title: "Success", description: "Tenant created successfully" });
    },
    onError: (error: any) => {
      console.error("Tenant creation error:", error);
      const errorMessage = error?.message || "Failed to create tenant";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/tenants/${id}`, data),
    onSuccess: async () => {
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/units"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/all-billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] }),
        queryClient.refetchQueries({ queryKey: ["/api/tenants"] }),
        queryClient.refetchQueries({ queryKey: ["/api/units"] }),
      ]);
      
      // Reset component state
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
      form.reset();
      toast({ title: "Success", description: "Tenant updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tenant", variant: "destructive" });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Success", description: "Tenant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenant", variant: "destructive" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/rent-payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/billing-records/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/outstanding-balance/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      // Invalidate outstanding balance queries globally
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({ title: "Success", description: "Payment recorded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/rent-payments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/billing-records/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/outstanding-balance/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] });
      // Invalidate outstanding balance queries globally
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance"] });
      setIsEditPaymentDialogOpen(false);
      editPaymentForm.reset();
      toast({ title: "Success", description: "Payment updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payment", variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/rent-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance", selectedTenant?.id] });
      toast({ title: "Success", description: "Payment deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment", variant: "destructive" });
    },
  });

  // Tenant billing records queries and mutations  
  const { data: tenantBillingRecords = [] } = useQuery({
    queryKey: [`/api/billing-records/${selectedTenant?.id}`],
    enabled: !!selectedTenant?.id,
  });

  const { data: tenantOutstandingBalance = { balance: 0 } } = useQuery({
    queryKey: [`/api/outstanding-balance/${selectedTenant?.id}`],
    enabled: !!selectedTenant?.id,
  });

  const generateMonthlyBillingMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing-records/generate-monthly"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance", selectedTenant?.id] });
      toast({ title: "Success", description: "Monthly billing generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: "Failed to generate monthly billing", variant: "destructive" });
    },
  });

  const sendRentReminderMutation = useMutation({
    mutationFn: (tenantId: string) => apiRequest("POST", "/api/emails/send-rent-reminder", { tenantId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Rent reminder email sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send rent reminder", variant: "destructive" });
    },
  });

  const sendWelcomeEmailMutation = useMutation({
    mutationFn: (tenantId: string) => apiRequest("POST", "/api/emails/send-welcome", { tenantId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Welcome email sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send welcome email", variant: "destructive" });
    },
  });

  // Generate monthly billing mutation
  const generateBillingMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing-records/generate-monthly"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance", selectedTenant?.id] });
      toast({
        title: "Success",
        description: "Monthly billing generated successfully",
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

  // Run automatic billing mutation
  const runAutomaticBillingMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing-records/run-automatic"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance", selectedTenant?.id] });
      toast({
        title: "Success",
        description: `Generated ${data.generated} new billing records, updated ${data.updated} overdue records`,
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

  // Update billing record mutation (for marking payments)
  const updateBillingMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest("PUT", `/api/billing-records/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] });
      queryClient.invalidateQueries({ queryKey: [`/api/billing-records/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/outstanding-balance/${selectedTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] });
      // Invalidate outstanding balance queries globally
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balance"] });
      setIsEditBillingDialogOpen(false);
      billingRecordForm.reset();
      toast({
        title: "Success",
        description: "Billing record updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: "Failed to update billing record",
        variant: "destructive"
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      taskForm.reset();
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: z.infer<typeof tenantStatusSchema> }) =>
      apiRequest("PATCH", `/api/tenants/${tenantId}/status`, data),
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/units"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/outstanding-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/all-billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/billing-records"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] }),
        queryClient.refetchQueries({ queryKey: ["/api/tenants"] }),
        queryClient.refetchQueries({ queryKey: ["/api/units"] }),
      ]);
      
      // Reset component state
      setIsTenantStatusDialogOpen(false);
      setEditingTenant(null);
      tenantStatusForm.reset();
      toast({ title: "Success", description: "Tenant status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleIdDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please select a file smaller than 50MB", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploadingId(true);
    try {
      const formData = new FormData();
      formData.append('idDocument', file);

      const response = await fetch('/api/upload/id-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadedIdDocument({
        url: result.url,
        name: result.originalName,
      });

      toast({ 
        title: "Document uploaded successfully", 
        description: `${file.name} has been uploaded` 
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingId(false);
    }
  };

  const handleIdBackDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please select a file smaller than 50MB", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploadingIdBack(true);
    try {
      const formData = new FormData();
      formData.append('idDocument', file);

      const response = await fetch('/api/upload/id-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadedIdBackDocument({
        url: result.url,
        name: result.originalName,
      });

      toast({ 
        title: "ID back uploaded successfully", 
        description: `${file.name} has been uploaded` 
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingIdBack(false);
    }
  };

  const onSubmit = (data: z.infer<typeof tenantSchema>) => {
    const submitData = {
      ...data,
      organizationId: "default-org", // Add required organizationId
      leaseStart: data.leaseStart?.toISOString().split('T')[0] || null,
      leaseEnd: data.leaseEnd?.toISOString().split('T')[0] || null,
      dateOfBirth: data.dateOfBirth?.toISOString().split('T')[0] || null,
      idDocumentUrl: uploadedIdDocument?.url || null,
      idDocumentName: uploadedIdDocument?.name || null,
      idBackDocumentUrl: uploadedIdBackDocument?.url || null,
      idBackDocumentName: uploadedIdBackDocument?.name || null,
      monthlyRent: data.monthlyRent || null,
      deposit: data.deposit || null,
      unitId: data.unitId || null,
    };
    
    console.log("Submitting tenant data:", submitData);
    createTenantMutation.mutate(submitData);
  };

  const onEditSubmit = (data: z.infer<typeof tenantSchema>) => {
    if (!selectedTenant) return;
    const submitData = {
      ...data,
      leaseStart: data.leaseStart?.toISOString(),
      leaseEnd: data.leaseEnd?.toISOString(),
      monthlyRent: data.monthlyRent === "" ? null : data.monthlyRent,
      deposit: data.deposit === "" ? null : data.deposit,
    };
    updateTenantMutation.mutate({ id: selectedTenant.id, data: submitData });
  };

  const onPaymentSubmit = (data: z.infer<typeof rentPaymentSchema>) => {
    // Use provided due date or calculate 30 days from payment date
    const dueDate = data.dueDate || (() => {
      const calculated = new Date(data.paymentDate);
      calculated.setDate(calculated.getDate() + 30);
      return calculated;
    })();
    
    const submitData = {
      tenantId: data.tenantId,
      unitId: data.unitId,
      amount: parseFloat(data.amount),
      dueDate: dueDate.toISOString(),
      paidDate: data.paymentDate.toISOString(),
      paymentMethod: data.paymentMethod,
      lateFeeAmount: data.lateFeeAmount ? parseFloat(data.lateFeeAmount) : 0,
      notes: data.notes || "",
      status: "paid"
    };
    createPaymentMutation.mutate(submitData);
  };

  const onEditPaymentSubmit = (data: z.infer<typeof rentPaymentSchema>) => {
    if (!selectedPayment) return;
    
    // Use provided due date or calculate 30 days from payment date
    const dueDate = data.dueDate || (() => {
      const calculated = new Date(data.paymentDate);
      calculated.setDate(calculated.getDate() + 30);
      return calculated;
    })();
    
    const submitData = {
      tenantId: data.tenantId,
      unitId: data.unitId,
      amount: parseFloat(data.amount),
      dueDate: dueDate.toISOString(),
      paidDate: data.paymentDate.toISOString(),
      paymentMethod: data.paymentMethod,
      lateFeeAmount: data.lateFeeAmount ? parseFloat(data.lateFeeAmount) : 0,
      notes: data.notes || "",
    };
    updatePaymentMutation.mutate({ id: selectedPayment.id, data: submitData });
  };

  const onTaskSubmit = (data: z.infer<typeof taskSchema>) => {
    const taskData: InsertTask = {
      ...data,
      dueDate: data.dueDate,
      estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
      actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleCreateTask = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    taskForm.setValue("tenantId", tenant.id);
    taskForm.setValue("unitId", tenant.unitId || "");
    setIsTaskDialogOpen(true);
  };

  const handleLeaseAgreementUpload = async (event: React.ChangeEvent<HTMLInputElement>, tenantId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // Update tenant with lease agreement URL
        await apiRequest("PATCH", `/api/tenants/${tenantId}`, {
          leaseAgreementUrl: dataUrl,
        });

        toast({
          title: "Success",
          description: "Lease agreement uploaded successfully.",
        });
        
        // Refresh tenants data
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      };

      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "There was an error reading the file.",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading the lease agreement.",
        variant: "destructive",
      });
    }
  };

  const handleViewTenantHistory = (unit: Unit) => {
    setSelectedUnitForHistory(unit);
    setIsTenantHistoryDialogOpen(true);
  };

  const onTenantStatusSubmit = (data: z.infer<typeof tenantStatusSchema>) => {
    if (editingTenant) {
      updateTenantStatusMutation.mutate({
        tenantId: editingTenant.id,
        data,
      });
    }
  };

  const handleEditTenantStatus = (tenant: Tenant) => {
    setEditingTenant(tenant);
    tenantStatusForm.reset({
      status: tenant.status,
      moveOutDate: "",
      moveOutReason: "",
    });
    setIsTenantStatusDialogOpen(true);
  };

  const filteredTenants = tenants?.filter((tenant: Tenant) => {
    const matchesSearch = `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getUnitNumber = (unitId?: string) => {
    if (!unitId || !units) return "N/A";
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit?.unitNumber || "N/A";
  };

  const getPropertyName = (propertyId: string) => {
    if (!propertyId || !properties) return "Unknown Property";
    const property = properties.find((p: any) => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  const getCurrentMonthBalance = (tenantId: string) => {
    if (!rentPayments) return 0;
    
    // Get all unpaid rent payments for this tenant
    const unpaidPayments = rentPayments.filter((p: RentPayment) => 
      p.tenantId === tenantId && 
      p.status === 'pending' && 
      !p.paidDate
    );
    
    // Calculate total unpaid amount
    const totalUnpaid = unpaidPayments.reduce((total: number, payment: RentPayment) => {
      return total + (parseFloat(payment.amount.toString()) || 0);
    }, 0);
    
    return totalUnpaid;
  };

  const getOverduePayments = (tenantId: string) => {
    if (!rentPayments) return [];
    const now = new Date();
    return rentPayments.filter((p: RentPayment) => 
      p.tenantId === tenantId && 
      new Date(p.dueDate) < now && 
      !p.paidDate
    );
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">Tenants</h1>
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
        <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">Tenants</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
              form.reset({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                dateOfBirth: undefined,
                emergencyContactName: "",
                emergencyContactPhone: "",
                status: "pending",
                unitId: "",
                leaseStart: undefined,
                leaseEnd: undefined,
                monthlyRent: "",
                deposit: "",
                tenantType: "primary",
                relationToPrimary: "",
              });
              setUploadedIdDocument(null);
              setUploadedIdBackDocument(null);
              setIsAddDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
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
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units?.map((unit: Unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  Unit {unit.unitNumber} - {getPropertyName(unit.propertyId)}
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
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* ID Upload Section */}
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Identity Documents</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel>Government ID (Front)</FormLabel>
                          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                            <div className="space-y-1 text-center">
                              {uploadedIdDocument?.url ? (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    <img 
                                      src={uploadedIdDocument.url} 
                                      alt="Front ID" 
                                      className="max-w-full max-h-48 object-contain rounded-md border"
                                    />
                                  </div>
                                  <p className="text-sm text-green-600 font-medium">Front ID Uploaded</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUploadedIdDocument(null)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <div className="flex text-sm text-gray-600">
                                    <label
                                      htmlFor="id-front-upload"
                                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                    >
                                      <span>{isUploadingId ? "Uploading..." : "Upload front of ID"}</span>
                                      <input 
                                        id="id-front-upload" 
                                        name="id-front-upload" 
                                        type="file" 
                                        className="sr-only" 
                                        accept="image/*,application/pdf"
                                        disabled={isUploadingId}
                                        onChange={handleIdDocumentUpload}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 50MB</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <FormLabel>Government ID (Back)</FormLabel>
                          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                            <div className="space-y-1 text-center">
                              {uploadedIdBackDocument?.url ? (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    <img 
                                      src={uploadedIdBackDocument.url} 
                                      alt="Back ID" 
                                      className="max-w-full max-h-48 object-contain rounded-md border"
                                    />
                                  </div>
                                  <p className="text-sm text-green-600 font-medium">Back ID Uploaded</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUploadedIdBackDocument(null)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <div className="flex text-sm text-gray-600">
                                    <label
                                      htmlFor="id-back-upload"
                                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                    >
                                      <span>{isUploadingIdBack ? "Uploading..." : "Upload back of ID"}</span>
                                      <input 
                                        id="id-back-upload" 
                                        name="id-back-upload" 
                                        type="file" 
                                        className="sr-only" 
                                        accept="image/*,application/pdf"
                                        disabled={isUploadingIdBack}
                                        onChange={handleIdBackDocumentUpload}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 50MB</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leaseStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leaseEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthlyRent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent</FormLabel>
                          <FormControl>
                            <Input placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit</FormLabel>
                          <FormControl>
                            <Input placeholder="1500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddDialogOpen(false);
                      setUploadedIdDocument(null);
                      setUploadedIdBackDocument(null);
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTenantMutation.isPending}>
                      {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
        </Dialog>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            className={viewMode === "grid" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            className={viewMode === "list" ? "bg-blue-600 hover:bg-blue-700" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const overduePayments = getOverduePayments(tenant.id);
            const currentBalance = getCurrentMonthBalance(tenant.id);
            
            return (
              <Card 
                key={tenant.id} 
                className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors border-l-4 border-l-blue-600"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setIsViewDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Name at the top */}
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tenant.firstName} {tenant.lastName}
                      </h3>
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </div>

                    {/* Unit information below name */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {tenant.unitId ? `Unit ${getUnitNumber(tenant.unitId)}` : "No Unit Assigned"}
                      </p>
                      {tenant.unitId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getPropertyName(units?.find((u: Unit) => u.id === tenant.unitId)?.propertyId || "")}
                        </p>
                      )}
                      {tenant.monthlyRent && (
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(tenant.monthlyRent)}/mo
                        </p>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-sm text-blue-600 dark:text-blue-400">{tenant.email}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{tenant.phone}</p>
                    </div>



                    {/* Payment Summary - Always Show Outstanding */}
                    {(() => {
                      const tenantPayments = rentPayments?.filter((payment: any) => payment.tenantId === tenant.id) || [];
                      const totalPaid = tenantPayments
                        .filter((payment: any) => payment.paidDate)
                        .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
                      
                      // Use API outstanding balance
                      const apiOutstanding = tenantOutstandingBalances?.[tenant.id] || 0;
                      
                      // Calculate overdue from billing records that are pending and past due
                      const tenantBillingRecords = allBillingRecords?.[tenant.id] || [];
                      const overdueAmount = tenantBillingRecords
                        .filter((record: any) => 
                          record.status === 'pending' && 
                          new Date(record.dueDate) < new Date()
                        )
                        .reduce((sum: number, record: any) => sum + parseFloat(record.amount || 0), 0);

                      return (
                        <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div className="grid grid-cols-2 gap-2 text-xs p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-blue-800/20 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Total Paid:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(totalPaid.toString())}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Outstanding:</span>
                              <span className={`font-medium ${apiOutstanding > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(apiOutstanding.toString())}
                              </span>
                            </div>
                            {overdueAmount > 0 && (
                              <div className="flex items-center justify-between col-span-2">
                                <span className="text-blue-600 dark:text-blue-400 flex items-center">
                                  <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                                  Overdue:
                                </span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {formatCurrency(overdueAmount.toString())}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTenants.map((tenant) => {
            const overduePayments = getOverduePayments(tenant.id);
            
            return (
              <Card 
                key={tenant.id} 
                className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors border-l-4 border-l-blue-600"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setIsViewDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold">
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{tenant.firstName} {tenant.lastName}</h3>
                            <Badge className={getStatusColor(tenant.status)}>
                              {tenant.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-6 mt-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {tenant.unitId ? `Unit ${getUnitNumber(tenant.unitId)}` : "No Unit Assigned"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.email}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.phone}</p>
                          </div>
                          {tenant.unitId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {getPropertyName(units?.find((u: Unit) => u.id === tenant.unitId)?.propertyId || "")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Rent</div>
                        {tenant.monthlyRent && (
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(tenant.monthlyRent)}
                          </p>
                        )}
                        {tenant.leaseStart && tenant.leaseEnd && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
                          </p>
                        )}
                      </div>
                      <OutstandingBalanceDisplay tenantId={tenant.id} />
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTenant(tenant);
                            paymentForm.setValue("tenantId", tenant.id);
                            paymentForm.setValue("unitId", tenant.unitId || "");
                            paymentForm.setValue("amount", tenant.monthlyRent || "");
                            setIsPaymentDialogOpen(true);
                          }}
                          title="Record Payment"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTenant(tenant);
                            form.reset({
                              firstName: tenant.firstName,
                              lastName: tenant.lastName,
                              email: tenant.email,
                              phone: tenant.phone,
                              dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth) : undefined,
                              emergencyContactName: tenant.emergencyContactName || "",
                              emergencyContactPhone: tenant.emergencyContactPhone || "",
                              status: tenant.status,
                              unitId: tenant.unitId || "",
                              leaseStart: tenant.leaseStart ? new Date(tenant.leaseStart) : undefined,
                              leaseEnd: tenant.leaseEnd ? new Date(tenant.leaseEnd) : undefined,
                              monthlyRent: tenant.monthlyRent || "",
                              deposit: tenant.deposit || "",
                            });
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit Tenant"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTenantMutation.mutate(tenant.id);
                          }}
                          title="Delete Tenant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="1000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CHECK">Check</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="lateFeeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Payment notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentDialogOpen} onOpenChange={setIsEditPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <Form {...editPaymentForm}>
            <form onSubmit={editPaymentForm.handleSubmit(onEditPaymentSubmit)} className="space-y-4">
              <FormField
                control={editPaymentForm.control}
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
                control={editPaymentForm.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPaymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CHECK">Check</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPaymentForm.control}
                name="lateFeeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPaymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Payment notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePaymentMutation.isPending}>
                  {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Task description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Task form with same layout as Tasks page - 4-column grid */}
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={taskForm.control}
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
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="administrative">Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value || "pending"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
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
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Second line: Assigned To, Property, Unit, Tenant */}
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter assignee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property: Property) => (
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
                  control={taskForm.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit: Unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {getPropertyName(unit.propertyId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.firstName} {tenant.lastName}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Attachment</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(file);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
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
      {/* Tenant Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {selectedTenant?.firstName} {selectedTenant?.lastName} - Tenant Details
              </DialogTitle>
              <div className="flex items-center gap-2 mr-8">

                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTenant) {
                      form.reset({
                        firstName: selectedTenant.firstName,
                        lastName: selectedTenant.lastName,
                        email: selectedTenant.email,
                        phone: selectedTenant.phone,
                        dateOfBirth: selectedTenant.dateOfBirth ? new Date(selectedTenant.dateOfBirth) : undefined,
                        emergencyContactName: selectedTenant.emergencyContactName || "",
                        emergencyContactPhone: selectedTenant.emergencyContactPhone || "",
                        status: selectedTenant.status,
                        unitId: selectedTenant.unitId,
                        leaseStart: selectedTenant.leaseStart ? new Date(selectedTenant.leaseStart) : undefined,
                        leaseEnd: selectedTenant.leaseEnd ? new Date(selectedTenant.leaseEnd) : undefined,
                        monthlyRent: selectedTenant.monthlyRent || "",
                        deposit: selectedTenant.deposit || "",
                      });
                      setIsEditDialogOpen(true);
                    }
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
                    if (selectedTenant) {
                      deleteTenantMutation.mutate(selectedTenant.id);
                      setIsViewDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedTenant && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-blue-50 dark:bg-blue-900/20 p-1 rounded-lg">
                <TabsTrigger 
                  value="details"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  Basic
                </TabsTrigger>
                <TabsTrigger 
                  value="lease"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  Lease & Screening
                </TabsTrigger>
                <TabsTrigger 
                  value="payments"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium"
                >
                  Tasks
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">First Name</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">{selectedTenant.firstName}</p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Email</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">{selectedTenant.email}</p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Date of Birth</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                          {selectedTenant.dateOfBirth 
                            ? new Date(selectedTenant.dateOfBirth).toLocaleDateString() 
                            : "Not provided"}
                        </p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Emergency Contact Name</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                          {selectedTenant.emergencyContactName || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Last Name</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">{selectedTenant.lastName}</p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Phone</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">{selectedTenant.phone}</p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Status</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                          <Badge className={getStatusColor(selectedTenant.status)}>
                            {selectedTenant.status}
                          </Badge>
                        </p>
                      </div>
                      <div className="mb-6 p-3 bg-white dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Emergency Contact Phone</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                          {selectedTenant.emergencyContactPhone || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lease" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Lease Details</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Lease Status:</span>
                          <p className="text-sm">
                            {selectedTenant.leaseStart ? 'Active' : 'No Active Lease'}
                          </p>
                        </div>
                        {selectedTenant.leaseStart && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Start Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.leaseStart)}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedTenant.leaseEnd && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">End Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.leaseEnd)}</p>
                          </div>
                        )}
                        {selectedTenant.monthlyRent && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Monthly Rent:</span>
                            <p className="text-sm">{formatCurrency(selectedTenant.monthlyRent)}</p>
                          </div>
                        )}
                        {selectedTenant.deposit && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Security Deposit:</span>
                            <p className="text-sm">{formatCurrency(selectedTenant.deposit)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex gap-2 flex-wrap">
                      {selectedTenant.leaseAgreementUrl ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.open(selectedTenant.leaseAgreementUrl!, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Lease Agreement
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedTenant.leaseAgreementUrl!;
                              link.download = `${selectedTenant.firstName}_${selectedTenant.lastName}_Lease_Agreement`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Lease Agreement
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            className="hidden"
                            id={`lease-upload-${selectedTenant.id}`}
                            onChange={(e) => handleLeaseAgreementUpload(e, selectedTenant.id)}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`lease-upload-${selectedTenant.id}`) as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Lease Agreement
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBackgroundCheckDialogOpen(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Background Check
                      </Button>
                    </div>
                  </div>
                  
                  {/* Screening Information */}
                  <div className="pt-6 border-t space-y-4">
                    <h3 className="text-lg font-semibold">Screening & Background</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Application Status</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Application Date:</span>
                            <p className="text-sm">{formatDate(selectedTenant.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Credit Score:</span>
                            <p className="text-sm">
                              {selectedTenant.creditScore || "Not available"}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Income Verification:</span>
                            <Badge variant={selectedTenant.incomeVerified ? "default" : "secondary"}>
                              {selectedTenant.incomeVerified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Background Check</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Criminal Background:</span>
                            <Badge variant={selectedTenant.backgroundCheckStatus === "clear" ? "default" : "destructive"}>
                              {selectedTenant.backgroundCheckStatus || "Pending"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">References:</span>
                            <p className="text-sm">
                              {selectedTenant.referencesVerified ? "Verified" : "Pending verification"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Payment Overview</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: [`/api/billing-records/${selectedTenant.id}`] });
                          queryClient.invalidateQueries({ queryKey: [`/api/outstanding-balance/${selectedTenant.id}`] });
                          queryClient.invalidateQueries({ queryKey: ["/api/rent-payments"] });
                          queryClient.refetchQueries({ queryKey: [`/api/billing-records/${selectedTenant.id}`] });
                          queryClient.refetchQueries({ queryKey: [`/api/outstanding-balance/${selectedTenant.id}`] });
                          toast({ title: "Data refreshed" });
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          paymentForm.setValue("tenantId", selectedTenant.id);
                          paymentForm.setValue("unitId", selectedTenant.unitId || "");
                          paymentForm.setValue("amount", selectedTenant.monthlyRent || "");
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Add Payment
                      </Button>
                    </div>
                  </div>

                  {/* Payment Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      const tenantPayments = rentPayments?.filter((payment: any) => payment.tenantId === selectedTenant.id) || [];
                      const totalPaid = tenantPayments
                        .filter((payment: any) => payment.paidDate)
                        .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
                      
                      // Use outstanding balance from API
                      const outstandingBalance = tenantOutstandingBalance?.balance || 0;
                      
                      // Remove automatic overdue calculation - let users manage manually
                      const overdueAmount = 0;

                      console.log('Payment Summary Debug:', {
                        selectedTenantId: selectedTenant.id,
                        totalPaid,
                        outstandingBalance,
                        overdueAmount,
                        tenantOutstandingBalance,
                        tenantBillingRecords,
                        billingRecordsType: typeof tenantBillingRecords,
                        isArray: Array.isArray(tenantBillingRecords)
                      });

                      return (
                        <>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center">
                              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                              <div>
                                <p className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide">Total Paid</p>
                                <p className="text-xl font-bold text-green-800 dark:text-green-200">
                                  {formatCurrency(totalPaid.toString())}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {tenantPayments.filter((p: any) => p.paidDate).length} payments
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center">
                              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
                              <div>
                                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase tracking-wide">Outstanding</p>
                                <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                                  {formatCurrency(outstandingBalance.toString())}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                  {outstandingBalance > 0 ? "pending" : "0 pending"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center">
                              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
                              <div>
                                <p className="text-xs font-medium text-red-800 dark:text-red-200 uppercase tracking-wide">Overdue</p>
                                <p className="text-xl font-bold text-red-800 dark:text-red-200">
                                  {formatCurrency(overdueAmount.toString())}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  {overdueAmount > 0 ? "overdue bills" : "0 overdue"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Unified Payment & Bill History */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold">Payment & Bill History</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10">
                            <TableRow className="bg-gray-50 dark:bg-gray-800 border-b-2">
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Date</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Type</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Description</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Amount</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Method</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                              <TableHead className="font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Combine billing records and payments into a unified history
                              const billingRecords = (Array.isArray(tenantBillingRecords) ? tenantBillingRecords : []).map((record: any) => ({
                                ...record,
                                type: 'bill',
                                date: record.dueDate || record.createdAt,
                                description: `Monthly rent - ${record.billingPeriod || 'N/A'}`,
                                method: null
                              }));

                              const payments = (rentPayments?.filter((payment: any) => 
                                payment.tenantId === selectedTenant.id && payment.paidDate
                              ) || []).map((payment: any) => ({
                                ...payment,
                                type: 'payment',
                                date: payment.paidDate,
                                description: `Payment received`,
                                method: payment.paymentMethod,
                                status: 'paid'
                              }));

                              const allTransactions = [...billingRecords, ...payments]
                                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                              if (allTransactions.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                      No billing or payment history found.
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              return allTransactions.map((transaction: any, index: number) => (
                                <TableRow key={`${transaction.type}-${transaction.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <TableCell className="font-medium">
                                    {formatDate(transaction.date)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={transaction.type === 'bill' ? 'outline' : 'default'} 
                                           className={transaction.type === 'bill' ? 'border-blue-200 text-blue-700' : 'bg-green-100 text-green-800'}>
                                      {transaction.type === 'bill' ? 'Bill' : 'Payment'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">
                                      {transaction.description}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-semibold ${transaction.type === 'bill' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                      {transaction.type === 'bill' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="capitalize text-sm">
                                      {transaction.method?.toLowerCase() || (transaction.type === 'bill' ? 'N/A' : 'Not specified')}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      transaction.status === 'paid' ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" :
                                      transaction.status === 'overdue' ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" :
                                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
                                    }>
                                      {transaction.status === 'paid' ? "Paid" : 
                                       transaction.status === 'overdue' ? "Overdue" : "Pending"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {transaction.type === 'bill' ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditBillingRecord(transaction);
                                          billingRecordForm.setValue("amount", transaction.amount);
                                          billingRecordForm.setValue("dueDate", new Date(transaction.dueDate || transaction.date));
                                          billingRecordForm.setValue("billingPeriod", transaction.billingPeriod || "");
                                          billingRecordForm.setValue("status", transaction.status);
                                          billingRecordForm.setValue("notes", transaction.notes || "");
                                          setIsEditBillingDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPayment(transaction);
                                          editPaymentForm.setValue("tenantId", transaction.tenantId || "");
                                          editPaymentForm.setValue("unitId", transaction.unitId || "");
                                          editPaymentForm.setValue("amount", transaction.amount);
                                          editPaymentForm.setValue("paymentDate", new Date(transaction.paidDate || transaction.date));
                                          editPaymentForm.setValue("paymentMethod", transaction.paymentMethod || "CHECK");
                                          editPaymentForm.setValue("lateFeeAmount", transaction.lateFeeAmount || "");
                                          editPaymentForm.setValue("notes", transaction.notes || "");
                                          setIsEditPaymentDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ));
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="screening" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Background Screening</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Credit Check</h4>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        Pending
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Criminal Background</h4>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        Pending
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setIsBackgroundCheckDialogOpen(true)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Screening
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="communication" className="space-y-4">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No messages yet</p>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                {/* Tasks Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Tasks</h3>
                    <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Task
                    </Button>
                  </div>
                  
                  {(() => {
                    const tenantTasks = tasks?.filter(task => task.tenantId === selectedTenant.id) || [];
                    return tenantTasks.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No tasks assigned to this tenant yet</p>
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(true)}>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {tenantTasks.map((task) => (
                          <Card 
                            key={task.id} 
                            className="compact-task-card cursor-pointer"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskDetailOpen(true);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="grid grid-cols-3 gap-4">
                                {/* Main Task Info */}
                                <div className="col-span-2 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{task.title}</h4>
                                    <Badge className={`text-xs ${
                                      task.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
                                      task.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
                                      task.priority === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                      "bg-green-100 text-green-800 border-green-200"
                                    }`}>
                                      {task.priority}
                                    </Badge>
                                    <Badge className={`text-xs ${
                                      task.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                                      task.status === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                      task.status === "cancelled" ? "bg-gray-100 text-gray-800 border-gray-200" :
                                      "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    }`}>
                                      {task.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="font-medium">Category:</span>
                                      <span className="ml-1 capitalize">{task.category}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Communication:</span>
                                      <span className="ml-1 capitalize">{task.communicationMethod || 'None'}</span>
                                    </div>
                                    {task.dueDate && (
                                      <div>
                                        <span className="font-medium">Due Date:</span>
                                        <span className="ml-1">{formatDate(task.dueDate)}</span>
                                      </div>
                                    )}
                                    {task.assignedTo && (
                                      <div>
                                        <span className="font-medium">Assigned:</span>
                                        <span className="ml-1">{task.assignedTo}</span>
                                      </div>
                                    )}
                                    {task.isRecurring && (
                                      <div>
                                        <span className="font-medium">Recurring:</span>
                                        <span className="ml-1 capitalize">{task.recurrencePeriod || 'Yes'}</span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Created:</span>
                                      <span className="ml-1">{formatDate(task.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-col justify-between items-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTaskMutation.mutate(task.id);
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <div className="text-xs text-muted-foreground">
                                    Click to view details
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information, lease details, and view government ID documents.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 987-6543" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit: Unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {getPropertyName(unit.propertyId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              </div>

              {/* Lease Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Lease Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaseStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaseEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input placeholder="1200.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit</FormLabel>
                        <FormControl>
                          <Input placeholder="1200.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Government ID Documents Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Government ID Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Government ID (Front)</FormLabel>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                      <div className="space-y-1 text-center">
                        {selectedTenant?.idDocumentUrl ? (
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <img 
                                src={selectedTenant.idDocumentUrl} 
                                alt="Front ID" 
                                className="max-w-full max-h-48 object-contain rounded-md border"
                              />
                            </div>
                            <p className="text-sm text-green-600 font-medium">Front ID Document</p>
                          </div>
                        ) : (
                          <>
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <p className="text-sm text-gray-600">No front ID document available</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel>Government ID (Back)</FormLabel>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                      <div className="space-y-1 text-center">
                        {selectedTenant?.idDocumentBackUrl ? (
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <img 
                                src={selectedTenant.idDocumentBackUrl} 
                                alt="Back ID" 
                                className="max-w-full max-h-48 object-contain rounded-md border"
                              />
                            </div>
                            <p className="text-sm text-green-600 font-medium">Back ID Document</p>
                          </div>
                        ) : (
                          <>
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <p className="text-sm text-gray-600">No back ID document available</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending ? "Updating..." : "Update Tenant"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Background Check Dialog */}
      <Dialog open={isBackgroundCheckDialogOpen} onOpenChange={setIsBackgroundCheckDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Background Check - {selectedTenant?.firstName} {selectedTenant?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Background Check Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Credit Check</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
                    <span className="text-sm font-medium">--</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Criminal Background</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Clear:</span>
                    <span className="text-sm font-medium">--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Verification */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Employment Verification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employer</label>
                  <Input placeholder="Company name" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                  <Input placeholder="Job title" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Income</label>
                  <Input placeholder="$0.00" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employment Length</label>
                  <Input placeholder="2 years" className="mt-1" />
                </div>
              </div>
            </div>

            {/* References */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">References</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Landlord</label>
                    <Input placeholder="Name" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <Input placeholder="(555) 123-4567" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="unable_to_reach">Unable to Reach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Screening Notes</h4>
              <Textarea 
                placeholder="Add notes about the background check process, findings, or any special considerations..."
                className="min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Request Credit Report
                </Button>
                <Button variant="outline" size="sm">
                  Run Background Check
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBackgroundCheckDialogOpen(false)}
                >
                  Close
                </Button>
                <Button>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Tenant History Dialog */}
      <Dialog open={isTenantHistoryDialogOpen} onOpenChange={setIsTenantHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tenant History - Unit {selectedUnitForHistory?.unitNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {tenantHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Tenant History
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No historical tenant data is available for this unit.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Previous Tenants ({tenantHistory.length})
                </h4>
                <div className="grid gap-4">
                  {tenantHistory.map((history) => (
                    <Card key={history.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {history.tenantName}
                          </h5>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Move In: {formatDate(history.moveInDate)}
                              </span>
                              {history.moveOutDate && (
                                <span>
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  Move Out: {formatDate(history.moveOutDate)}
                                </span>
                              )}
                            </div>
                            {history.monthlyRent && (
                              <div>
                                <DollarSign className="h-4 w-4 inline mr-1" />
                                Monthly Rent: {formatCurrency(history.monthlyRent.toString())}
                              </div>
                            )}
                            {history.securityDeposit && (
                              <div>
                                Security Deposit: {formatCurrency(history.securityDeposit.toString())}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={
                              (history as any).moveOutReason === 'lease_expired' ? 'bg-green-100 text-green-800' :
                              (history as any).moveOutReason === 'eviction' ? 'bg-red-100 text-red-800' :
                              (history as any).moveOutReason === 'early_termination' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {(history as any).moveOutReason ? (history as any).moveOutReason.replace('_', ' ') : 'Current'}
                          </Badge>
                        </div>
                      </div>
                      {history.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Notes:</strong> {history.notes}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Tenant Status Edit Dialog */}
      <Dialog open={isTenantStatusDialogOpen} onOpenChange={setIsTenantStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tenant Status</DialogTitle>
          </DialogHeader>
          <Form {...tenantStatusForm}>
            <form onSubmit={tenantStatusForm.handleSubmit(onTenantStatusSubmit)} className="space-y-4">
              <FormField
                control={tenantStatusForm.control}
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="moved">Moved Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tenantStatusForm.watch("status") === "moved" && (
                <>
                  <FormField
                    control={tenantStatusForm.control}
                    name="moveOutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Move Out Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={tenantStatusForm.control}
                    name="moveOutReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Move Out Reason</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lease_expired">Lease Expired</SelectItem>
                            <SelectItem value="early_termination">Early Termination</SelectItem>
                            <SelectItem value="eviction">Eviction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTenantStatusDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantStatusMutation.isPending}>
                  {updateTenantStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <TaskDetails
              task={selectedTask}
              onBack={() => setIsTaskDetailOpen(false)}
              onTaskUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                setIsTaskDetailOpen(false);
              }}
              onTaskDeleted={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                setIsTaskDetailOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      {/* Edit Billing Record Dialog */}
      <Dialog open={isEditBillingDialogOpen} onOpenChange={setIsEditBillingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing Record</DialogTitle>
            <DialogDescription>
              Update billing record details
            </DialogDescription>
          </DialogHeader>
          <Form {...billingRecordForm}>
            <form onSubmit={billingRecordForm.handleSubmit((data) => {
              if (editBillingRecord) {
                updateBillingMutation.mutate({
                  id: editBillingRecord.id,
                  updates: {
                    ...data,
                    dueDate: data.dueDate.toISOString(),
                  }
                });
              }
            })} className="space-y-4">
              <FormField
                control={billingRecordForm.control}
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
                control={billingRecordForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingRecordForm.control}
                name="billingPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Period</FormLabel>
                    <FormControl>
                      <Input placeholder="YYYY-MM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingRecordForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingRecordForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditBillingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateBillingMutation.isPending}>
                  {updateBillingMutation.isPending ? "Updating..." : "Update Billing Record"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}