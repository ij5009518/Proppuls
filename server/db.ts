import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import { pgTable, text, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Define database tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('tenant'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  totalUnits: integer('total_units').notNull(),
  purchasePrice: decimal('purchase_price'),
  purchaseDate: timestamp('purchase_date'),
  propertyType: text('property_type').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  unitNumber: text('unit_number').notNull(),
  bedrooms: integer('bedrooms').notNull(),
  bathrooms: decimal('bathrooms').notNull(),
  rentAmount: decimal('rent_amount'),
  status: text('status').notNull().default('vacant'),
  squareFootage: integer('square_footage'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  unitId: text('unit_id'),
  leaseStart: timestamp('lease_start'),
  leaseEnd: timestamp('lease_end'),
  monthlyRent: decimal('monthly_rent'),
  deposit: decimal('deposit'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount').notNull(),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: text('id').primaryKey(),
  unitId: text('unit_id').notNull(),
  tenantId: text('tenant_id'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('open'),
  submittedDate: timestamp('submitted_date').notNull().defaultNow(),
  completedDate: timestamp('completed_date'),
  vendorId: text('vendor_id'),
  laborCost: decimal('labor_cost'),
  materialCost: decimal('material_cost'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const vendors = pgTable('vendors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  specialty: text('specialty').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  rating: decimal('rating'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rentPayments = pgTable('rent_payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  unitId: text('unit_id').notNull(),
  amount: decimal('amount').notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  status: text('status').notNull().default('pending'),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const mortgages = pgTable('mortgages', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  lender: text('lender').notNull(),
  originalAmount: decimal('original_amount').notNull(),
  currentBalance: decimal('current_balance').notNull(),
  interestRate: decimal('interest_rate').notNull(),
  monthlyPayment: decimal('monthly_payment').notNull(),
  principalAmount: decimal('principal_amount').notNull(),
  interestAmount: decimal('interest_amount').notNull(),
  escrowAmount: decimal('escrow_amount'),
  startDate: timestamp('start_date').notNull(),
  termYears: integer('term_years').notNull(),
  accountNumber: text('account_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('pending'),
  dueDate: timestamp('due_date'),
  assignedTo: text('assigned_to'),
  propertyId: text('property_id'),
  unitId: text('unit_id'),
  tenantId: text('tenant_id'),
  vendorId: text('vendor_id'),
  rentPaymentId: text('rent_payment_id'),
  category: text('category').notNull(),
  notes: text('notes'),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePeriod: text('recurrence_period'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });