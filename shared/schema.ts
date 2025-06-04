import { z } from "zod";

// Base schemas
export const userSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["admin", "manager", "tenant"]),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const propertySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  totalUnits: z.number(),
  purchasePrice: z.string().nullable(),
  purchaseDate: z.date().nullable(),
  propertyType: z.string(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const unitSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  unitNumber: z.string(),
  bedrooms: z.number(),
  bathrooms: z.string(),
  rentAmount: z.string().nullable(),
  status: z.enum(["vacant", "occupied", "maintenance"]),
  squareFootage: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const tenantSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  unitId: z.string().nullable(),
  leaseStart: z.date().nullable(),
  leaseEnd: z.date().nullable(),
  monthlyRent: z.string().nullable(),
  deposit: z.string().nullable(),
  status: z.enum(["active", "inactive", "pending"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const maintenanceRequestSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  tenantId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  submittedDate: z.date(),
  completedDate: z.date().nullable(),
  vendorId: z.string().nullable(),
  laborCost: z.string().nullable(),
  materialCost: z.string().nullable(),
  notes: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  specialty: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  rating: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const rentPaymentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  unitId: z.string(),
  amount: z.string(),
  dueDate: z.date(),
  paidDate: z.date().nullable(),
  status: z.enum(["pending", "paid", "overdue", "partial"]),
  paymentMethod: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const mortgageSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  lender: z.string(),
  originalAmount: z.string(),
  currentBalance: z.string(),
  interestRate: z.string(),
  monthlyPayment: z.string(),
  principalAmount: z.string(),
  interestAmount: z.string(),
  escrowAmount: z.string().nullable(),
  startDate: z.date(),
  termYears: z.number(),
  accountNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const expenseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.string(),
  date: z.date(),
  isRecurring: z.boolean(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  documentPath: z.string().optional(),
  accountNumber: z.string().optional(),
  policyEffectiveDate: z.date().optional(),
  policyExpirationDate: z.date().optional(),
  attachmentUrl: z.string().optional(),
  recurrencePeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  dueDate: z.date().optional(),
  assignedTo: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  vendorId: z.string().optional(),
  rentPaymentId: z.string().optional(),
  category: z.string(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePeriod: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Insert schemas (for creating new records)
export const insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertySchema = propertySchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertUnitSchema = unitSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSchema = tenantSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaintenanceRequestSchema = maintenanceRequestSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorSchema = vendorSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertRentPaymentSchema = rentPaymentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMortgageSchema = mortgageSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = expenseSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true, updatedAt: true });

// TypeScript types
export type User = z.infer<typeof userSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type RentPayment = z.infer<typeof rentPaymentSchema>;
export type Mortgage = z.infer<typeof mortgageSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Task = z.infer<typeof taskSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertRentPayment = z.infer<typeof insertRentPaymentSchema>;
export type InsertMortgage = z.infer<typeof insertMortgageSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;