import { z } from "zod";

// Enums for better type safety
export const PropertyTypeEnum = z.enum([
  "single_family", "multi_family", "apartment", "condo", "commercial", "mixed_use"
]);

export const PropertyStatusEnum = z.enum([
  "active", "inactive", "under_construction", "for_sale", "sold"
]);

export const UnitStatusEnum = z.enum([
  "vacant", "occupied", "maintenance", "renovating", "unavailable"
]);

export const LeaseStatusEnum = z.enum([
  "active", "expired", "pending", "terminated", "draft"
]);

export const MaintenanceStatusEnum = z.enum([
  "pending", "in_progress", "completed", "cancelled", "on_hold"
]);

export const MaintenancePriorityEnum = z.enum([
  "low", "medium", "high", "emergency"
]);

export const DocumentTypeEnum = z.enum([
  "lease", "inspection", "insurance", "warranty", "permit", "legal", "financial", "maintenance", "other"
]);

export const NotificationTypeEnum = z.enum([
  "email", "sms", "push", "in_app"
]);

export const PaymentMethodEnum = z.enum([
  "credit_card", "debit_card", "ach", "check", "cash", "money_order", "wire_transfer"
]);

export const PaymentStatusEnum = z.enum([
  "pending", "completed", "failed", "refunded", "cancelled"
]);

export const ComplianceStatusEnum = z.enum([
  "compliant", "non_compliant", "pending_review", "requires_action"
]);

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
  password: z.string().optional(),
  isLoginEnabled: z.boolean().default(false),
  lastLogin: z.date().nullable(),
  unitId: z.string().nullable(),
  leaseStart: z.date().nullable(),
  leaseEnd: z.date().nullable(),
  monthlyRent: z.string().nullable(),
  deposit: z.string().nullable(),
  status: z.enum(["active", "inactive", "pending"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const tenantHistorySchema = z.object({
  id: z.string(),
  unitId: z.string(),
  tenantId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  leaseStart: z.date(),
  leaseEnd: z.date().nullable(),
  monthlyRent: z.string().nullable(),
  deposit: z.string().nullable(),
  moveInDate: z.date(),
  moveOutDate: z.date().nullable(),
  reasonForLeaving: z.string().nullable(),
  finalBalance: z.string().nullable(),
  depositReturned: z.string().nullable(),
  notes: z.string().nullable(),
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
  meterReadingStart: z.string().optional(),
  meterReadingEnd: z.string().optional(),
  usageAmount: z.string().optional(),
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

// 1. Lease Management System
export const leaseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  unitId: z.string(),
  propertyId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  monthlyRent: z.string(),
  securityDeposit: z.string(),
  status: LeaseStatusEnum,
  renewalDate: z.date().nullable(),
  escalationRate: z.string().nullable(),
  escalationFrequency: z.enum(["yearly", "bi_yearly", "end_of_term"]).nullable(),
  lateFeePolicyId: z.string().nullable(),
  petDeposit: z.string().nullable(),
  parkingFee: z.string().nullable(),
  utilitiesIncluded: z.array(z.string()).default([]),
  terms: z.string(),
  signedDate: z.date().nullable(),
  isDigitallySigned: z.boolean().default(false),
  documentPath: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const leaseRenewalSchema = z.object({
  id: z.string(),
  leaseId: z.string(),
  proposedStartDate: z.date(),
  proposedEndDate: z.date(),
  proposedRent: z.string(),
  status: z.enum(["pending", "approved", "declined", "expired"]),
  sentDate: z.date(),
  responseDate: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const securityDepositSchema = z.object({
  id: z.string(),
  leaseId: z.string(),
  amount: z.string(),
  dateReceived: z.date(),
  dateReturned: z.date().nullable(),
  amountReturned: z.string().nullable(),
  deductions: z.array(z.object({
    description: z.string(),
    amount: z.string(),
  })).default([]),
  status: z.enum(["held", "returned", "partially_returned"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 2. Document Management System
export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DocumentTypeEnum,
  filePath: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  propertyId: z.string().nullable(),
  unitId: z.string().nullable(),
  tenantId: z.string().nullable(),
  leaseId: z.string().nullable(),
  maintenanceRequestId: z.string().nullable(),
  uploadedBy: z.string(),
  description: z.string().nullable(),
  expirationDate: z.date().nullable(),
  isArchived: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const inspectionReportSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  unitId: z.string().nullable(),
  inspectorId: z.string(),
  type: z.enum(["move_in", "move_out", "routine", "maintenance", "safety"]),
  scheduledDate: z.date(),
  completedDate: z.date().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  overallCondition: z.enum(["excellent", "good", "fair", "poor"]).nullable(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    category: z.string(),
    item: z.string(),
    condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
    photos: z.array(z.string()).default([]),
    notes: z.string().nullable(),
  })).default([]),
  photos: z.array(z.string()).default([]),
  documentPath: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insurancePolicySchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  policyNumber: z.string(),
  provider: z.string(),
  type: z.enum(["property", "liability", "umbrella", "flood", "earthquake"]),
  coverageAmount: z.string(),
  premium: z.string(),
  deductible: z.string(),
  effectiveDate: z.date(),
  expirationDate: z.date(),
  agentName: z.string().nullable(),
  agentContact: z.string().nullable(),
  autoRenewal: z.boolean().default(false),
  documentPath: z.string().nullable(),
  status: z.enum(["active", "expired", "cancelled", "pending"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 3. Communication Hub
export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  recipientId: z.string(),
  subject: z.string(),
  content: z.string(),
  type: z.enum(["message", "notification", "alert", "reminder"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  propertyId: z.string().nullable(),
  unitId: z.string().nullable(),
  maintenanceRequestId: z.string().nullable(),
  attachments: z.array(z.string()).default([]),
  readAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: NotificationTypeEnum,
  category: z.enum(["maintenance", "payment", "lease", "system", "marketing"]),
  isRead: z.boolean().default(false),
  actionUrl: z.string().nullable(),
  propertyId: z.string().nullable(),
  scheduledFor: z.date().nullable(),
  sentAt: z.date().nullable(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const communicationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["email", "sms", "letter"]),
  category: z.enum(["welcome", "reminder", "notice", "marketing", "maintenance"]),
  subject: z.string().nullable(),
  content: z.string(),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 4. Advanced Reporting & Analytics
export const reportSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["financial", "occupancy", "maintenance", "performance", "compliance"]),
  generatedBy: z.string(),
  parameters: z.record(z.any()),
  dataRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
  filePath: z.string(),
  status: z.enum(["generating", "completed", "failed"]),
  propertyIds: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const marketAnalysisSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  analysisDate: z.date(),
  marketRent: z.string(),
  currentRent: z.string(),
  variance: z.string(),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  comparableProperties: z.array(z.object({
    address: z.string(),
    rent: z.string(),
    size: z.string(),
    distance: z.string(),
  })).default([]),
  recommendations: z.string().nullable(),
  dataSource: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 5. Payment Processing & Integration
export const paymentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  leaseId: z.string(),
  amount: z.string(),
  method: PaymentMethodEnum,
  status: PaymentStatusEnum,
  type: z.enum(["rent", "deposit", "fee", "refund", "other"]),
  dueDate: z.date(),
  paidDate: z.date().nullable(),
  lateFee: z.string().nullable(),
  reference: z.string().nullable(),
  transactionId: z.string().nullable(),
  processorFee: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["accounting", "payment", "background_check", "credit_report", "marketing"]),
  provider: z.string(),
  apiKey: z.string(),
  apiSecret: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  settings: z.record(z.any()).nullable(),
  isActive: z.boolean().default(true),
  lastSync: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 6. Background Checks & Credit Reports
export const backgroundCheckSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  applicationId: z.string().nullable(),
  provider: z.string(),
  status: z.enum(["pending", "completed", "failed", "expired"]),
  score: z.number().nullable(),
  reportUrl: z.string().nullable(),
  criminalHistory: z.boolean().nullable(),
  evictionHistory: z.boolean().nullable(),
  creditScore: z.number().nullable(),
  monthlyIncome: z.string().nullable(),
  employmentVerified: z.boolean().nullable(),
  recommendation: z.enum(["approve", "conditional", "decline"]).nullable(),
  expirationDate: z.date().nullable(),
  cost: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 7. Compliance & Legal
export const complianceItemSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  type: z.enum(["permit", "license", "inspection", "regulation", "tax"]),
  title: z.string(),
  description: z.string(),
  requirement: z.string(),
  status: ComplianceStatusEnum,
  dueDate: z.date().nullable(),
  completedDate: z.date().nullable(),
  authority: z.string(),
  documentPath: z.string().nullable(),
  cost: z.string().nullable(),
  renewalFrequency: z.enum(["annual", "bi_annual", "one_time"]).nullable(),
  nextRenewalDate: z.date().nullable(),
  reminderDays: z.number().default(30),
  assignedTo: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const evictionProcessSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  leaseId: z.string(),
  reason: z.enum(["non_payment", "lease_violation", "property_damage", "illegal_activity", "other"]),
  startDate: z.date(),
  status: z.enum(["notice_served", "court_filed", "hearing_scheduled", "judgment", "completed", "cancelled"]),
  noticeType: z.string(),
  noticeServedDate: z.date().nullable(),
  courtFilingDate: z.date().nullable(),
  hearingDate: z.date().nullable(),
  judgmentDate: z.date().nullable(),
  amountOwed: z.string().nullable(),
  legalFees: z.string().nullable(),
  attorney: z.string().nullable(),
  documents: z.array(z.string()).default([]),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const permitSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  type: z.enum(["building", "occupancy", "fire_safety", "health", "zoning", "business"]),
  permitNumber: z.string(),
  issuer: z.string(),
  description: z.string(),
  issueDate: z.date(),
  expirationDate: z.date().nullable(),
  cost: z.string(),
  status: z.enum(["pending", "approved", "expired", "revoked"]),
  renewalRequired: z.boolean().default(false),
  documentPath: z.string().nullable(),
  contactPerson: z.string().nullable(),
  contactPhone: z.string().nullable(),
  notes: z.string().nullable(),
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
export const insertExpenseSchema = expenseSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true, updatedAt: true });

// New Insert schemas for advanced features
export const insertLeaseSchema = leaseSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaseRenewalSchema = leaseRenewalSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertSecurityDepositSchema = securityDepositSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = documentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertInspectionReportSchema = inspectionReportSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertInsurancePolicySchema = insurancePolicySchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = messageSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommunicationTemplateSchema = communicationTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportSchema = reportSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMarketAnalysisSchema = marketAnalysisSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = paymentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntegrationSchema = integrationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertBackgroundCheckSchema = backgroundCheckSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplianceItemSchema = complianceItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertEvictionProcessSchema = evictionProcessSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertPermitSchema = permitSchema.omit({ id: true, createdAt: true, updatedAt: true });

// TypeScript types
export type User = z.infer<typeof userSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type TenantHistory = z.infer<typeof tenantHistorySchema>;
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

// Advanced feature types
export type Lease = z.infer<typeof leaseSchema>;
export type LeaseRenewal = z.infer<typeof leaseRenewalSchema>;
export type SecurityDeposit = z.infer<typeof securityDepositSchema>;
export type Document = z.infer<typeof documentSchema>;
export type InspectionReport = z.infer<typeof inspectionReportSchema>;
export type InsurancePolicy = z.infer<typeof insurancePolicySchema>;
export type Message = z.infer<typeof messageSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type CommunicationTemplate = z.infer<typeof communicationTemplateSchema>;
export type Report = z.infer<typeof reportSchema>;
export type MarketAnalysis = z.infer<typeof marketAnalysisSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type BackgroundCheck = z.infer<typeof backgroundCheckSchema>;
export type ComplianceItem = z.infer<typeof complianceItemSchema>;
export type EvictionProcess = z.infer<typeof evictionProcessSchema>;
export type Permit = z.infer<typeof permitSchema>;

export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type InsertLeaseRenewal = z.infer<typeof insertLeaseRenewalSchema>;
export type InsertSecurityDeposit = z.infer<typeof insertSecurityDepositSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type InsertInsurancePolicy = z.infer<typeof insertInsurancePolicySchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertMarketAnalysis = z.infer<typeof insertMarketAnalysisSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type InsertBackgroundCheck = z.infer<typeof insertBackgroundCheckSchema>;
export type InsertComplianceItem = z.infer<typeof insertComplianceItemSchema>;
export type InsertEvictionProcess = z.infer<typeof insertEvictionProcessSchema>;
export type InsertPermit = z.infer<typeof insertPermitSchema>;