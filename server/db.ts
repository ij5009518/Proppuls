import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from "@neondatabase/serverless";
import { pgTable, text, integer, timestamp, boolean, decimal, jsonb, serial } from "drizzle-orm/pg-core";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Define database tables
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain'),
  plan: text('plan').notNull().default('starter'),
  status: text('status').notNull().default('active'),
  maxUsers: integer('max_users').default(10),
  maxProperties: integer('max_properties').default(50),
  monthlyPrice: integer('monthly_price').default(19),
  settings: jsonb('settings'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status').default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
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

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  userData: jsonb('user_data').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  totalUnits: integer("total_units").notNull(),
  purchasePrice: text("purchase_price"),
  purchaseDate: timestamp("purchase_date"),
  propertyType: text("property_type").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
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
  organizationId: text('organization_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  dateOfBirth: timestamp('date_of_birth'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  idDocumentUrl: text('id_document_url'),
  idDocumentName: text('id_document_name'),
  tenantType: text('tenant_type').notNull().default('primary'), // primary, spouse, child, other
  relationToPrimary: text('relation_to_primary'), // spouse, child, parent, other
  password: text('password'),
  isLoginEnabled: boolean('is_login_enabled').default(false),
  lastLogin: timestamp('last_login'),
  unitId: text('unit_id'),
  leaseStart: timestamp('lease_start'),
  leaseEnd: timestamp('lease_end'),
  monthlyRent: decimal('monthly_rent'),
  deposit: decimal('deposit'),
  leaseAgreementUrl: text('lease_agreement_url'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantSessions = pgTable('tenant_sessions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tenantHistory = pgTable('tenant_history', {
  id: text('id').primaryKey(),
  unitId: text('unit_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  leaseStart: timestamp('lease_start').notNull(),
  leaseEnd: timestamp('lease_end'),
  monthlyRent: decimal('monthly_rent'),
  deposit: decimal('deposit'),
  moveInDate: timestamp('move_in_date').notNull(),
  moveOutDate: timestamp('move_out_date'),
  reasonForLeaving: text('reason_for_leaving'),
  finalBalance: decimal('final_balance'),
  depositReturned: decimal('deposit_returned'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  propertyId: text('property_id').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount').notNull(),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').notNull().default(false),
  vendorName: text('vendor_name'),
  notes: text('notes'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  documentPath: text('document_path'),
  accountNumber: text('account_number'),
  policyEffectiveDate: timestamp('policy_effective_date'),
  policyExpirationDate: timestamp('policy_expiration_date'),
  meterReadingStart: text('meter_reading_start'),
  meterReadingEnd: text('meter_reading_end'),
  usageAmount: text('usage_amount'),
  attachmentUrl: text('attachment_url'),
  recurrencePeriod: text('recurrence_period'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
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
  organizationId: text('organization_id').notNull(),
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

export const billingRecords = pgTable('billing_records', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  unitId: text('unit_id').notNull(),
  amount: decimal('amount').notNull(),
  billingPeriod: text('billing_period').notNull(), // "2024-01" format
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('pending'), // pending, paid, overdue, partial
  paidAmount: decimal('paid_amount').notNull().default('0'),
  paidDate: timestamp('paid_date'),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const mortgages = pgTable('mortgages', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
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
  organizationId: text('organization_id').notNull(),
  // Communication settings
  communicationMethod: text('communication_method').default('none'), // 'none', 'email', 'sms', 'both'
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  // Document attachments (multiple files support)
  attachments: jsonb('attachments').default([]),
  // Legacy single attachment fields (for backward compatibility)
  attachmentUrl: text('attachment_url'),
  attachmentName: text('attachment_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskCommunications = pgTable('task_communications', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  method: text('method').notNull(), // 'email', 'sms'
  recipient: text('recipient').notNull(), // email address or phone number
  subject: text('subject'),
  message: text('message').notNull(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const taskHistory = pgTable('task_history', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  action: text('action').notNull(), // 'created', 'updated', 'status_changed', 'assigned', 'communication_sent'
  field: text('field'), // field that was changed (for updates)
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: text('user_id'), // who made the change
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 1. Lease Management System
export const leases = pgTable('leases', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  unitId: text('unit_id').notNull(),
  propertyId: text('property_id').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  monthlyRent: decimal('monthly_rent').notNull(),
  securityDeposit: decimal('security_deposit').notNull(),
  status: text('status').notNull().default('draft'),
  renewalDate: timestamp('renewal_date'),
  escalationRate: decimal('escalation_rate'),
  escalationFrequency: text('escalation_frequency'),
  lateFeePolicyId: text('late_fee_policy_id'),
  petDeposit: decimal('pet_deposit'),
  parkingFee: decimal('parking_fee'),
  utilitiesIncluded: jsonb('utilities_included').default([]),
  terms: text('terms').notNull(),
  signedDate: timestamp('signed_date'),
  isDigitallySigned: boolean('is_digitally_signed').default(false),
  documentPath: text('document_path'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const leaseRenewals = pgTable('lease_renewals', {
  id: text('id').primaryKey(),
  leaseId: text('lease_id').notNull(),
  proposedStartDate: timestamp('proposed_start_date').notNull(),
  proposedEndDate: timestamp('proposed_end_date').notNull(),
  proposedRent: decimal('proposed_rent').notNull(),
  status: text('status').notNull().default('pending'),
  sentDate: timestamp('sent_date').notNull(),
  responseDate: timestamp('response_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const securityDeposits = pgTable('security_deposits', {
  id: text('id').primaryKey(),
  leaseId: text('lease_id').notNull(),
  amount: decimal('amount').notNull(),
  dateReceived: timestamp('date_received').notNull(),
  dateReturned: timestamp('date_returned'),
  amountReturned: decimal('amount_returned'),
  deductions: jsonb('deductions').default([]),
  status: text('status').notNull().default('held'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 2. Document Management System
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  propertyId: text('property_id'),
  unitId: text('unit_id'),
  tenantId: text('tenant_id'),
  leaseId: text('lease_id'),
  maintenanceRequestId: text('maintenance_request_id'),
  uploadedBy: text('uploaded_by').notNull(),
  description: text('description'),
  expirationDate: timestamp('expiration_date'),
  isArchived: boolean('is_archived').default(false),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inspectionReports = pgTable('inspection_reports', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  unitId: text('unit_id'),
  inspectorId: text('inspector_id').notNull(),
  type: text('type').notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  completedDate: timestamp('completed_date'),
  status: text('status').notNull().default('scheduled'),
  overallCondition: text('overall_condition'),
  notes: text('notes'),
  items: jsonb('items').default([]),
  photos: jsonb('photos').default([]),
  documentPath: text('document_path'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insurancePolicies = pgTable('insurance_policies', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  policyNumber: text('policy_number').notNull(),
  provider: text('provider').notNull(),
  type: text('type').notNull(),
  coverageAmount: decimal('coverage_amount').notNull(),
  premium: decimal('premium').notNull(),
  deductible: decimal('deductible').notNull(),
  effectiveDate: timestamp('effective_date').notNull(),
  expirationDate: timestamp('expiration_date').notNull(),
  agentName: text('agent_name'),
  agentContact: text('agent_contact'),
  autoRenewal: boolean('auto_renewal').default(false),
  documentPath: text('document_path'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 3. Communication Hub
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  recipientId: text('recipient_id').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull().default('message'),
  priority: text('priority').notNull().default('normal'),
  status: text('status').notNull().default('sent'),
  propertyId: text('property_id'),
  unitId: text('unit_id'),
  maintenanceRequestId: text('maintenance_request_id'),
  attachments: jsonb('attachments').default([]),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  isRead: boolean('is_read').default(false),
  actionUrl: text('action_url'),
  propertyId: text('property_id'),
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const communicationTemplates = pgTable('communication_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  subject: text('subject'),
  content: text('content').notNull(),
  variables: jsonb('variables').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 4. Advanced Reporting & Analytics
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  generatedBy: text('generated_by').notNull(),
  parameters: jsonb('parameters').notNull(),
  dataRange: jsonb('data_range').notNull(),
  filePath: text('file_path').notNull(),
  status: text('status').notNull().default('generating'),
  propertyIds: jsonb('property_ids').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const marketAnalyses = pgTable('market_analyses', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  analysisDate: timestamp('analysis_date').notNull(),
  marketRent: decimal('market_rent').notNull(),
  currentRent: decimal('current_rent').notNull(),
  variance: decimal('variance').notNull(),
  confidenceLevel: text('confidence_level').notNull(),
  comparableProperties: jsonb('comparable_properties').default([]),
  recommendations: text('recommendations'),
  dataSource: text('data_source').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 5. Payment Processing & Integration
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  leaseId: text('lease_id').notNull(),
  amount: decimal('amount').notNull(),
  method: text('method').notNull(),
  status: text('status').notNull().default('pending'),
  type: text('type').notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  lateFee: decimal('late_fee'),
  reference: text('reference'),
  transactionId: text('transaction_id'),
  processorFee: decimal('processor_fee'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const integrations = pgTable('integrations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret'),
  webhookUrl: text('webhook_url'),
  settings: jsonb('settings'),
  isActive: boolean('is_active').default(true),
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 6. Background Checks & Credit Reports
export const backgroundChecks = pgTable('background_checks', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  applicationId: text('application_id'),
  provider: text('provider').notNull(),
  status: text('status').notNull().default('pending'),
  score: integer('score'),
  reportUrl: text('report_url'),
  criminalHistory: boolean('criminal_history'),
  evictionHistory: boolean('eviction_history'),
  creditScore: integer('credit_score'),
  monthlyIncome: decimal('monthly_income'),
  employmentVerified: boolean('employment_verified'),
  recommendation: text('recommendation'),
  expirationDate: timestamp('expiration_date'),
  cost: decimal('cost'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 7. Compliance & Legal
export const complianceItems = pgTable('compliance_items', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requirement: text('requirement').notNull(),
  status: text('status').notNull().default('pending_review'),
  dueDate: timestamp('due_date'),
  completedDate: timestamp('completed_date'),
  authority: text('authority').notNull(),
  documentPath: text('document_path'),
  cost: decimal('cost'),
  renewalFrequency: text('renewal_frequency'),
  nextRenewalDate: timestamp('next_renewal_date'),
  reminderDays: integer('reminder_days').default(30),
  assignedTo: text('assigned_to'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const evictionProcesses = pgTable('eviction_processes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  leaseId: text('lease_id').notNull(),
  reason: text('reason').notNull(),
  startDate: timestamp('start_date').notNull(),
  status: text('status').notNull().default('notice_served'),
  noticeType: text('notice_type').notNull(),
  noticeServedDate: timestamp('notice_served_date'),
  courtFilingDate: timestamp('court_filing_date'),
  hearingDate: timestamp('hearing_date'),
  judgmentDate: timestamp('judgment_date'),
  amountOwed: decimal('amount_owed'),
  legalFees: decimal('legal_fees'),
  attorney: text('attorney'),
  documents: jsonb('documents').default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const permits = pgTable('permits', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  type: text('type').notNull(),
  permitNumber: text('permit_number').notNull(),
  issuer: text('issuer').notNull(),
  description: text('description').notNull(),
  issueDate: timestamp('issue_date').notNull(),
  expirationDate: timestamp('expiration_date'),
  cost: decimal('cost').notNull(),
  status: text('status').notNull().default('pending'),
  renewalRequired: boolean('renewal_required').default(false),
  documentPath: text('document_path'),
  contactPerson: text('contact_person'),
  contactPhone: text('contact_phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripePriceId: text('stripe_price_id').notNull(),
  status: text('status').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  stripeInvoiceId: text('stripe_invoice_id').notNull().unique(),
  subscriptionId: text('subscription_id').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull(),
  paidAt: timestamp('paid_at'),
  dueDate: timestamp('due_date'),
  hostedInvoiceUrl: text('hosted_invoice_url'),
  invoicePdf: text('invoice_pdf'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    timeout: 60000, // 60 second timeout for Neon's cold starts
  },
  // Enable connection pooling for better reliability
  pooled: true,
});

// Add connection retry wrapper for database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error (Neon-specific patterns)
      const isRetryable = 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Control plane') ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        error.message?.includes('network') ||
        error.message?.includes('NeonDbError') ||
        error.name?.includes('NeonDbError') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT';
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`Database operation failed permanently after ${attempt} attempts:`, {
          message: error.message,
          name: error.name,
          code: error.code,
          stack: error.stack?.split('\n')[0]
        });
        throw error;
      }
      
      console.log(`Database operation failed, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Exponential backoff with jitter for Neon's cold start issues
      const jitter = Math.random() * 1000;
      const delay = delayMs * Math.pow(1.5, attempt - 1) + jitter;
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000))); // Cap at 10 seconds
    }
  }
  
  throw lastError!;
}

const schema = {
  organizations,
  users,
  sessions,
  properties,
  units,
  tenants,
  tenantSessions,
  tenantHistory,
  expenses,
  maintenanceRequests,
  vendors,
  rentPayments,
  billingRecords,
  mortgages,
  tasks,
  taskCommunications,
  taskHistory,
  // Advanced feature tables
  leases,
  leaseRenewals,
  securityDeposits,
  documents,
  inspectionReports,
  insurancePolicies,
  messages,
  notifications,
  communicationTemplates,
  reports,
  marketAnalyses,
  payments,
  integrations,
  backgroundChecks,
  complianceItems,
  evictionProcesses,
  permits,
  subscriptions,
  invoices,
};

const baseDb = drizzle(sql, { schema });

// Export the database instance directly with proper methods
export const db = baseDb;

// withDatabaseRetry is already exported above