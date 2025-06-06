import { User } from '../shared/schema';
import { db, users, properties, expenses, units, tenants, maintenanceRequests, vendors, rentPayments, mortgages, tasks } from './db';
import { eq } from 'drizzle-orm';
import crypto from "crypto";
import { Property, Expense, Unit, Tenant, MaintenanceRequest, Vendor, RentPayment, Mortgage, Task } from '../shared/schema';
import nodemailer from 'nodemailer';

interface Session {
  token: string;
  user: User;
  createdAt: Date;
}

class Storage {
  private sessions: Map<string, Session> = new Map();

  // User methods
  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values({
      id: userData.id || crypto.randomUUID(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || null,
      role: userData.role || 'tenant',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const [user] = await db.update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async createSession(token: string, user: User): Promise<void> {
    this.sessions.set(token, {
      token,
      user,
      createdAt: new Date(),
    });
  }

  async getSession(token: string): Promise<Session | null> {
    return this.sessions.get(token) || null;
  }

  async getSessionById(token: string): Promise<Session | null> {
    return this.sessions.get(token) || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // Property methods
  async createProperty(propertyData: any): Promise<Property> {
    try {
      console.log("Storage: Creating property with data:", propertyData);
      const propertyId = crypto.randomUUID();

      const insertData = {
        id: propertyId,
        name: propertyData.name,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zipCode: propertyData.zipCode,
        totalUnits: propertyData.totalUnits,
        purchasePrice: propertyData.purchasePrice?.toString() || null,
        purchaseDate: propertyData.purchaseDate ? new Date(propertyData.purchaseDate) : null,
        propertyType: propertyData.propertyType,
        status: propertyData.status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Storage: Insert data:", insertData);

      const [property] = await db.insert(properties).values(insertData).returning();
      console.log("Storage: Property created successfully:", property);
      return property;
    } catch (error) {
      console.error("Storage: Error creating property:", error);
      throw error;
    }
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0] || null;
  }

  async updateProperty(id: string, propertyData: any): Promise<Property | null> {
    try {
      console.log("Storage: Updating property with data:", propertyData);
      
      // Convert date strings to Date objects
      const updateData = {
        ...propertyData,
        updatedAt: new Date()
      };
      
      // Handle purchaseDate conversion if it exists
      if (propertyData.purchaseDate) {
        updateData.purchaseDate = new Date(propertyData.purchaseDate);
      }
      
      console.log("Storage: Update data after conversion:", updateData);
      
      const [property] = await db.update(properties)
        .set(updateData)
        .where(eq(properties.id, id))
        .returning();
        
      console.log("Storage: Property updated successfully:", property);
      return property || null;
    } catch (error) {
      console.error("Storage: Error updating property:", error);
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return result.rowCount > 0;
  }

  // Expense methods
  async createExpense(expenseData: any): Promise<Expense> {
    const [expense] = await db.insert(expenses).values({
      id: expenseData.id || crypto.randomUUID(),
      ...expenseData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return expense;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0] || null;
  }

  async updateExpense(id: string, expenseData: any): Promise<Expense | null> {
    const [expense] = await db.update(expenses)
      .set({ ...expenseData, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return expense || null;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  // Unit methods
  async createUnit(unitData: any): Promise<Unit> {
    const [unit] = await db.insert(units).values({
      id: unitData.id || crypto.randomUUID(),
      ...unitData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return unit;
  }

  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async getUnitById(id: string): Promise<Unit | null> {
    const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
    return result[0] || null;
  }

  async updateUnit(id: string, unitData: any): Promise<Unit | null> {
    const [unit] = await db.update(units)
      .set({ ...unitData, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();
    return unit || null;
  }

  async deleteUnit(id: string): Promise<boolean> {
    const result = await db.delete(units).where(eq(units.id, id));
    return result.rowCount > 0;
  }

  // Tenant methods
  async createTenant(tenantData: any): Promise<Tenant> {
    try {
      console.log("Storage: Creating tenant with data:", tenantData);
      const tenantId = crypto.randomUUID();

      const insertData = {
        id: tenantId,
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        email: tenantData.email,
        phone: tenantData.phone,
        unitId: tenantData.unitId || null,
        leaseStart: tenantData.leaseStart ? new Date(tenantData.leaseStart) : null,
        leaseEnd: tenantData.leaseEnd ? new Date(tenantData.leaseEnd) : null,
        monthlyRent: tenantData.monthlyRent?.toString() || null,
        deposit: tenantData.deposit?.toString() || null,
        status: tenantData.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Storage: Insert data:", insertData);

      const [tenant] = await db.insert(tenants).values(insertData).returning();
      console.log("Storage: Tenant created successfully:", tenant);
      return tenant;
    } catch (error) {
      console.error("Storage: Error creating tenant:", error);
      throw error;
    }
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  }

  async updateTenant(id: string, tenantData: any): Promise<Tenant | null> {
    const [tenant] = await db.update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    // Auto-generate rent payment records if lease information is provided
    if (tenant && tenantData.leaseStart && tenantData.leaseEnd && tenantData.monthlyRent) {
      await this.generateRentPayments(tenant);
    }

    return tenant || null;
  }

  private async generateRentPayments(tenant: Tenant): Promise<void> {
    if (!tenant.leaseStart || !tenant.leaseEnd || !tenant.monthlyRent) return;

    try {
      const startDate = new Date(tenant.leaseStart);
      const endDate = new Date(tenant.leaseEnd);
      const monthlyAmount = parseFloat(tenant.monthlyRent);

      console.log("Generating rent payments for tenant:", tenant.id);
      console.log("Lease period:", startDate, "to", endDate);
      console.log("Monthly amount:", monthlyAmount);

      // Clear existing rent payments for this tenant
      await db.delete(rentPayments).where(eq(rentPayments.tenantId, tenant.id));

      const payments: any[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dueDate = new Date(currentDate);
        dueDate.setDate(1); // Set to first of month

        payments.push({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          unitId: tenant.unitId,
          amount: monthlyAmount.toString(),
          dueDate: dueDate,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      console.log("Creating", payments.length, "rent payment records");

      if (payments.length > 0) {
        await db.insert(rentPayments).values(payments);
        console.log("Rent payments created successfully");
      }
    } catch (error) {
      console.error("Error generating rent payments:", error);
    }
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return result.rowCount > 0;
  }

  // Tenant History methods
  async createTenantHistory(historyData: any): Promise<TenantHistory> {
    const [history] = await db.insert(tenantHistory).values({
      id: historyData.id || crypto.randomUUID(),
      unitId: historyData.unitId,
      tenantId: historyData.tenantId,
      tenantName: historyData.tenantName,
      tenantEmail: historyData.tenantEmail,
      tenantPhone: historyData.tenantPhone,
      leaseStart: historyData.leaseStart ? new Date(historyData.leaseStart) : new Date(),
      leaseEnd: historyData.leaseEnd ? new Date(historyData.leaseEnd) : null,
      monthlyRent: historyData.monthlyRent?.toString() || null,
      deposit: historyData.deposit?.toString() || null,
      moveInDate: historyData.moveInDate ? new Date(historyData.moveInDate) : null,
      moveOutDate: historyData.moveOutDate ? new Date(historyData.moveOutDate) : null,
      reasonForLeaving: historyData.reasonForLeaving || null,
      status: historyData.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return history;
  }

  async getTenantHistoryByUnitId(unitId: string): Promise<TenantHistory[]> {
    return await db.select().from(tenantHistory).where(eq(tenantHistory.unitId, unitId));
  }

  async getAllTenantHistory(): Promise<TenantHistory[]> {
    return await db.select().from(tenantHistory);
  }

  async updateTenantHistory(id: string, historyData: any): Promise<TenantHistory | null> {
    const [history] = await db.update(tenantHistory)
      .set({ ...historyData, updatedAt: new Date() })
      .where(eq(tenantHistory.id, id))
      .returning();
    return history || null;
  }

  async deleteTenantHistory(id: string): Promise<boolean> {
    const result = await db.delete(tenantHistory).where(eq(tenantHistory.id, id));
    return result.rowCount > 0;
  }

  // Maintenance Request methods
  async createMaintenanceRequest(requestData: any): Promise<MaintenanceRequest> {
    const [request] = await db.insert(maintenanceRequests).values({
      id: requestData.id || crypto.randomUUID(),
      ...requestData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return request;
  }

  async getAllMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return await db.select().from(maintenanceRequests);
  }

  async getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | null> {
    const result = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id)).limit(1);
    return result[0] || null;
  }

  async updateMaintenanceRequest(id: string, requestData: any): Promise<MaintenanceRequest | null> {
    const [request] = await db.update(maintenanceRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return request || null;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    const result = await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return result.rowCount > 0;
  }

  // Vendor methods
  async createVendor(vendorData: any): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values({
      id: vendorData.id || crypto.randomUUID(),
      ...vendorData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return vendor;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendorById(id: string): Promise<Vendor | null> {
    const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    return result[0] || null;
  }

  async updateVendor(id: string, vendorData: any): Promise<Vendor | null> {
    const [vendor] = await db.update(vendors)
      .set({ ...vendorData, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor || null;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  // Rent Payment methods
  async createRentPayment(paymentData: any): Promise<RentPayment> {
    try {
      console.log("Creating rent payment with data:", paymentData);

      const insertData = {
        id: paymentData.id || crypto.randomUUID(),
        tenantId: paymentData.tenantId?.toString() || "",
        unitId: paymentData.unitId?.toString() || "",
        amount: paymentData.amount?.toString() || "0",
        dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : new Date(),
        paidDate: paymentData.paidDate ? new Date(paymentData.paidDate) : null,
        status: paymentData.status || 'pending',
        paymentMethod: paymentData.paymentMethod || null,
        notes: paymentData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Formatted rent payment data:", insertData);

      const [payment] = await db.insert(rentPayments).values(insertData).returning();
      return payment;
    } catch (error) {
      console.error("Error creating rent payment:", error);
      throw error;
    }
  }

  async getAllRentPayments(): Promise<RentPayment[]> {
    return await db.select().from(rentPayments);
  }

  async getRentPaymentById(id: string): Promise<RentPayment | null> {
    const result = await db.select().from(rentPayments).where(eq(rentPayments.id, id)).limit(1);
    return result[0] || null;
  }

  async updateRentPayment(id: string, paymentData: any): Promise<RentPayment | null> {
    const [payment] = await db.update(rentPayments)
      .set({ ...paymentData, updatedAt: new Date() })
      .where(eq(rentPayments.id, id))
      .returning();
    return payment || null;
  }

  async deleteRentPayment(id: string): Promise<boolean> {
    const result = await db.delete(rentPayments).where(eq(rentPayments.id, id));
    return result.rowCount > 0;
  }

  // Mortgage methods
  async createMortgage(mortgageData: any): Promise<Mortgage> {
    try {
      console.log("Creating mortgage with data:", mortgageData);

      const insertData = {
        id: mortgageData.id || crypto.randomUUID(),
        propertyId: mortgageData.propertyId,
        lender: mortgageData.lender,
        originalAmount: mortgageData.originalAmount?.toString() || "0",
        currentBalance: mortgageData.currentBalance?.toString() || "0",
        interestRate: mortgageData.interestRate?.toString() || "0",
        monthlyPayment: mortgageData.monthlyPayment?.toString() || "0",
        startDate: mortgageData.startDate ? new Date(mortgageData.startDate) : new Date(),
        termYears: mortgageData.termYears || 30,
        principalAmount: mortgageData.principalAmount?.toString() || "0",
        interestAmount: mortgageData.interestAmount?.toString() || "0",
        escrowAmount: mortgageData.escrowAmount?.toString() || "0",
        accountNumber: mortgageData.accountNumber || null,
        notes: mortgageData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Formatted mortgage data:", insertData);

      const [mortgage] = await db.insert(mortgages).values(insertData).returning();
      return mortgage;
    } catch (error) {
      console.error("Error creating mortgage:", error);
      throw error;
    }
  }

  async getAllMortgages(): Promise<Mortgage[]> {
    return await db.select().from(mortgages);
  }

  async getMortgageById(id: string): Promise<Mortgage | null> {
    const result = await db.select().from(mortgages).where(eq(mortgages.id, id)).limit(1);
    return result[0] || null;
  }

  async updateMortgage(id: string, mortgageData: any): Promise<Mortgage | null> {
    const [mortgage] = await db.update(mortgages)
      .set({ ...mortgageData, updatedAt: new Date() })
      .where(eq(mortgages.id, id))
      .returning();
    return mortgage || null;
  }

  async deleteMortgage(id: string): Promise<boolean> {
    const result = await db.delete(mortgages).where(eq(mortgages.id, id));
    return result.rowCount > 0;
  }

  // Task methods
  async createTask(taskData: any): Promise<Task> {
    const [task] = await db.insert(tasks).values({
      id: taskData.id || crypto.randomUUID(),
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0] || null;
  }

  async updateTask(id: string, taskData: any): Promise<Task | null> {
    const [task] = await db.update(tasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task || null;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  }

  async getUnitById(id: string): Promise<Unit | null> {
    const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
    return result[0] || null;
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0] || null;
  }
}

// Email Service
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: to,
        subject: subject,
        html: html,
      });
      console.log("Message sent: %s", info.messageId);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
export const storage = new Storage();