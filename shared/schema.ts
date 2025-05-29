
import { z } from "zod";

// Base schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "tenant"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const propertySchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  type: z.enum(["residential", "commercial", "mixed"]),
  units: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const unitSchema = z.object({
  id: z.number(),
  propertyId: z.number(),
  unitNumber: z.string(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number().nullable(),
  rent: z.number(),
  deposit: z.number(),
  status: z.enum(["vacant", "occupied", "maintenance"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const tenantSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  unitId: z.number().nullable(),
  leaseStart: z.date().nullable(),
  leaseEnd: z.date().nullable(),
  monthlyRent: z.number().nullable(),
  deposit: z.number().nullable(),
  status: z.enum(["active", "inactive", "pending"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const maintenanceRequestSchema = z.object({
  id: z.number(),
  unitId: z.number(),
  tenantId: z.number().nullable(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  submittedDate: z.date(),
  completedDate: z.date().nullable(),
  vendorId: z.number().nullable(),
  laborCost: z.number().nullable(),
  materialCost: z.number().nullable(),
  notes: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const vendorSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  specialty: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  rating: z.number().min(1).max(5).nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const rentPaymentSchema = z.object({
  id: z.number(),
  tenantId: z.number(),
  unitId: z.number(),
  amount: z.number(),
  dueDate: z.date(),
  paidDate: z.date().nullable(),
  status: z.enum(["pending", "paid", "overdue", "partial"]),
  paymentMethod: z.enum(["cash", "check", "bank_transfer", "credit_card"]),
  notes: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const mortgageSchema = z.object({
  id: z.number(),
  propertyId: z.number(),
  lender: z.string(),
  loanAmount: z.number(),
  interestRate: z.number(),
  termYears: z.number(),
  monthlyPayment: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  remainingBalance: z.number(),
  status: z.enum(["active", "paid_off", "refinanced"]),
  createdAt: z.date(),
  updatedAt: z.date(),
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

// TypeScript types
export type User = z.infer<typeof userSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type RentPayment = z.infer<typeof rentPaymentSchema>;
export type Mortgage = z.infer<typeof mortgageSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertRentPayment = z.infer<typeof insertRentPaymentSchema>;
export type InsertMortgage = z.infer<typeof insertMortgageSchema>;
