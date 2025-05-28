import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  totalUnits: integer("total_units").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  propertyType: text("property_type").notNull(), // apartment, condo, townhome, etc.
  status: text("status").notNull().default("active"), // active, maintenance, inactive
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  unitNumber: text("unit_number").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFootage: integer("square_footage"),
  rentAmount: decimal("rent_amount", { precision: 8, scale: 2 }).notNull(),
  status: text("status").notNull().default("vacant"), // vacant, occupied, maintenance
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  unitId: integer("unit_id"),
  leaseStart: timestamp("lease_start"),
  leaseEnd: timestamp("lease_end"),
  monthlyRent: decimal("monthly_rent", { precision: 8, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 8, scale: 2 }),
  status: text("status").notNull().default("active"), // active, inactive, moved_out
});

export const mortgages = pgTable("mortgages", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  lender: text("lender").notNull(),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 3 }).notNull(),
  monthlyPayment: decimal("monthly_payment", { precision: 8, scale: 2 }).notNull(),
  principalAmount: decimal("principal_amount", { precision: 8, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 8, scale: 2 }).notNull(),
  escrowAmount: decimal("escrow_amount", { precision: 8, scale: 2 }).default('0'),
  startDate: timestamp("start_date").notNull(),
  termYears: integer("term_years").notNull(),
  accountNumber: text("account_number"),
  notes: text("notes"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  unitId: integer("unit_id"),
  category: text("category").notNull(), // utilities, insurance, taxes, maintenance, management, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  vendorId: integer("vendor_id"),
  isRecurring: boolean("is_recurring").default(false),
  qboCategory: text("qbo_category"), // QuickBooks category mapping
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  serviceType: text("service_type").notNull(), // plumbing, electrical, hvac, landscaping, etc.
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"),
});

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  tenantId: integer("tenant_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, completed, cancelled
  submittedDate: timestamp("submitted_date").notNull(),
  completedDate: timestamp("completed_date"),
  vendorId: integer("vendor_id"),
  laborCost: decimal("labor_cost", { precision: 8, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 8, scale: 2 }),
  notes: text("notes"),
});

export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  unitId: integer("unit_id"),
  tenantId: integer("tenant_id"),
  type: text("type").notNull(), // rent, late_fee, security_deposit, etc.
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
});

export const mortgagePayments = pgTable("mortgage_payments", {
  id: serial("id").primaryKey(),
  mortgageId: integer("mortgage_id").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  totalPayment: decimal("total_payment", { precision: 8, scale: 2 }).notNull(),
  principalPaid: decimal("principal_paid", { precision: 8, scale: 2 }).notNull(),
  interestPaid: decimal("interest_paid", { precision: 8, scale: 2 }).notNull(),
  escrowPaid: decimal("escrow_paid", { precision: 8, scale: 2 }).default('0'),
  remainingBalance: decimal("remaining_balance", { precision: 12, scale: 2 }).notNull(),
  paymentNumber: integer("payment_number").notNull(),
});

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true }).extend({
  purchaseDate: z.coerce.date(),
});
export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true }).extend({
  leaseStart: z.coerce.date().optional().nullable(),
  leaseEnd: z.coerce.date().optional().nullable(),
});
export const insertMortgageSchema = createInsertSchema(mortgages).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true });
export const insertRevenueSchema = createInsertSchema(revenues).omit({ id: true });

// Types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Mortgage = typeof mortgages.$inferSelect;
export type InsertMortgage = z.infer<typeof insertMortgageSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;

// Dashboard types
export type DashboardKPIs = {
  totalRevenue: string;
  revenueChange: string;
  totalProperties: number;
  newProperties: number;
  occupancyRate: string;
  occupancyChange: string;
  maintenanceRequests: number;
  pendingRequests: number;
};

export type PropertyWithStats = Property & {
  occupancyRate: number;
  monthlyRevenue: number;
  occupiedUnits: number;
};

export type ExpenseByCategory = {
  category: string;
  amount: number;
  percentage: number;
};
