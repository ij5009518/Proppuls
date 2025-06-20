import { User, TenantSession, TenantLogin, CreateTenantMaintenanceRequest, Organization } from '../shared/schema';
import { db, organizations, users, properties, expenses, units, tenants, tenantSessions, tenantHistory, maintenanceRequests, vendors, rentPayments, billingRecords, mortgages, tasks, taskCommunications, taskHistory } from './db';
import { eq, sql, and, gt, desc } from 'drizzle-orm';
import * as crypto from "crypto";
import * as bcrypt from 'bcrypt';
import { Property, Expense, Unit, Tenant, TenantHistory, MaintenanceRequest, Vendor, RentPayment, Mortgage, Task, TaskCommunication, TaskHistory } from '../shared/schema';
import * as nodemailer from 'nodemailer';

interface Session {
  token: string;
  user: User;
  createdAt: Date;
}

class Storage {
  private sessions: Map<string, Session> = new Map();

  // Organization management methods
  async createOrganization(organizationData: any): Promise<Organization> {
    const id = crypto.randomUUID();
    const organizationRecord = {
      id,
      name: organizationData.name,
      domain: organizationData.domain,
      plan: organizationData.plan,
      status: organizationData.status,
      maxUsers: organizationData.maxUsers,
      maxProperties: organizationData.maxProperties,
      monthlyPrice: organizationData.monthlyPrice,
      settings: organizationData.settings || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(organizations).values(organizationRecord);
    return organizationRecord;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    const result = await db.select().from(organizations);
    return result.map(org => ({
      ...org,
      status: org.status as "active" | "inactive" | "suspended",
      plan: org.plan as "starter" | "professional" | "enterprise",
      maxUsers: org.maxUsers || 10,
      maxProperties: org.maxProperties || 50,
      monthlyPrice: org.monthlyPrice || 19,
      settings: (org.settings as Record<string, any>) || {}
    }));
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!result[0]) return null;
    return {
      ...result[0],
      status: result[0].status as "active" | "inactive" | "suspended",
      plan: result[0].plan as "starter" | "professional" | "enterprise",
      maxUsers: result[0].maxUsers || 10,
      maxProperties: result[0].maxProperties || 50,
      monthlyPrice: result[0].monthlyPrice || 19,
      settings: (result[0].settings as Record<string, any>) || {}
    };
  }

  async updateOrganization(id: string, organizationData: any): Promise<Organization | null> {
    const updatedData = {
      ...organizationData,
      updatedAt: new Date(),
    };

    await db.update(organizations).set(updatedData).where(eq(organizations.id, id));
    return await this.getOrganizationById(id);
  }

  async deleteOrganization(id: string): Promise<boolean> {
    await db.delete(organizations).where(eq(organizations.id, id));
    return true;
  }

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
      organizationId: userData.organizationId,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return {
      ...user,
      role: user.role as "admin" | "manager" | "tenant"
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ? {
      ...result[0],
      role: result[0].role as "admin" | "manager" | "tenant"
    } : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? {
      ...result[0],
      role: result[0].role as "admin" | "manager" | "tenant"
    } : null;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result.map(user => ({
      ...user,
      role: user.role as "admin" | "manager" | "tenant"
    }));
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const [user] = await db.update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ? {
      ...user,
      role: user.role as "admin" | "manager" | "tenant"
    } : null;
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
        organizationId: propertyData.organizationId || "default-org",
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

      const [property] = await db.insert(properties).values([insertData]).returning();
      console.log("Storage: Property created successfully:", property);
      return property;
    } catch (error) {
      console.error("Storage: Error creating property:", error);
      throw error;
    }
  }

  async getAllProperties(organizationId?: string): Promise<Property[]> {
    if (organizationId) {
      return await db.select().from(properties).where(eq(properties.organizationId, organizationId));
    }
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
    return {
      ...unit,
      status: unit.status as "vacant" | "occupied" | "maintenance"
    };
  }

  async getAllUnits(organizationId?: string): Promise<Unit[]> {
    let query = db.select().from(units);
    
    if (organizationId) {
      // Join with properties to filter by organization
      query = db.select().from(units)
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(eq(properties.organizationId, organizationId));
    }
    
    const result = await query;
    return result.map(unit => ({
      ...unit,
      status: unit.status as "vacant" | "occupied" | "maintenance"
    }));
  }

  async getUnitById(id: string): Promise<Unit | null> {
    const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
    return result[0] ? {
      ...result[0],
      status: result[0].status as "vacant" | "occupied" | "maintenance"
    } : null;
  }

  async updateUnit(id: string, unitData: any): Promise<Unit | null> {
    const [unit] = await db.update(units)
      .set({ ...unitData, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();
    return unit ? {
      ...unit,
      status: unit.status as "vacant" | "occupied" | "maintenance"
    } : null;
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
        dateOfBirth: tenantData.dateOfBirth ? new Date(tenantData.dateOfBirth) : null,
        emergencyContactName: tenantData.emergencyContactName || null,
        emergencyContactPhone: tenantData.emergencyContactPhone || null,
        idDocumentUrl: tenantData.idDocumentUrl || null,
        idDocumentName: tenantData.idDocumentName || null,
        tenantType: tenantData.tenantType || 'primary',
        relationToPrimary: tenantData.relationToPrimary || null,
        password: tenantData.password ? await bcrypt.hash(tenantData.password, 10) : null,
        isLoginEnabled: tenantData.isLoginEnabled || false,
        lastLogin: null,
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

      // Generate rent payments if tenant has lease dates and monthly rent
      if (tenant.leaseStart && tenant.leaseEnd && tenant.monthlyRent) {
        await this.generateRentPayments(tenant);
      }
      // If tenant is active and has monthly rent but no lease dates, generate ongoing payments
      else if (tenant.status === 'active' && tenant.monthlyRent) {
        await this.generateOngoingRentPayments(tenant);
      }

      return tenant;
    } catch (error) {
      console.error("Storage: Error creating tenant:", error);
      throw error;
    }
  }

  async getAllTenants(organizationId?: string): Promise<Tenant[]> {
    if (organizationId) {
      return await db.select().from(tenants).where(eq(tenants.organizationId, organizationId));
    }
    return await db.select().from(tenants);
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  }

  async updateTenant(id: string, tenantData: any): Promise<Tenant | null> {
    try {
      console.log("Storage: Updating tenant with data:", tenantData);

      // Convert date strings to Date objects
      const updateData = {
        ...tenantData,
        updatedAt: new Date()
      };

      // Handle date conversions if they exist
      if (tenantData.dateOfBirth) {
        updateData.dateOfBirth = new Date(tenantData.dateOfBirth);
      }
      if (tenantData.leaseStart) {
        updateData.leaseStart = new Date(tenantData.leaseStart);
      }
      if (tenantData.leaseEnd) {
        updateData.leaseEnd = new Date(tenantData.leaseEnd);
      }

      console.log("Storage: Update data after conversion:", updateData);

      const [tenant] = await db.update(tenants)
        .set(updateData)
        .where(eq(tenants.id, id))
        .returning();

      console.log("Storage: Tenant updated successfully:", tenant);

      // Check if we should trigger automated monthly billing
      if (tenant && tenantData.status === 'active' && tenant.leaseStart && tenant.monthlyRent) {
        const today = new Date();
        const leaseStartDate = new Date(tenant.leaseStart);
        
        // If lease start date has been reached and tenant is now active, start billing
        if (leaseStartDate <= today) {
          console.log("Triggering automated monthly billing for active tenant");
          await this.initiateMonthlyBilling(tenant);
        }
      }

      return tenant || null;
    } catch (error) {
      console.error("Storage: Error updating tenant:", error);
      throw error;
    }
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

  async generateOngoingRentPayments(tenant: any): Promise<void> {
    try {
      if (!tenant.monthlyRent) {
        console.log("Missing monthly rent for ongoing payment generation");
        return;
      }

      const monthlyAmount = parseFloat(tenant.monthlyRent);
      const today = new Date();

      console.log("Generating ongoing rent payments for active tenant:", tenant.id);
      console.log("Monthly amount:", monthlyAmount);

      // Get existing payments to avoid duplicates
      const existingPayments = await db.select()
        .from(rentPayments)
        .where(eq(rentPayments.tenantId, tenant.id));

      const payments: any[] = [];

      // Generate payments for current month and next 11 months (12 total)
      for (let i = 0; i < 12; i++) {
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        
        // Check if payment already exists for this month
        const paymentExists = existingPayments.some((payment: any) => {
          const paymentDue = new Date(payment.dueDate);
          return paymentDue.getMonth() === dueDate.getMonth() && 
                 paymentDue.getFullYear() === dueDate.getFullYear();
        });

        if (!paymentExists) {
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
        }
      }

      console.log("Creating", payments.length, "new ongoing rent payment records");

      if (payments.length > 0) {
        await db.insert(rentPayments).values(payments);
        console.log("Ongoing rent payments created successfully");
      }
    } catch (error) {
      console.error("Error generating ongoing rent payments:", error);
    }
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return result.rowCount > 0;
  }

  // Tenant Authentication methods
  async getTenantByEmail(email: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
    return result[0] || null;
  }

  async validateTenantLogin(email: string, password: string): Promise<Tenant | null> {
    const tenant = await this.getTenantByEmail(email);
    if (!tenant || !tenant.password || !tenant.isLoginEnabled) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, tenant.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.update(tenants)
      .set({ lastLogin: new Date() })
      .where(eq(tenants.id, tenant.id));

    return tenant;
  }

  async createTenantSession(tenantId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    await db.insert(tenantSessions).values({
      id: crypto.randomUUID(),
      tenantId,
      token,
      expiresAt,
    });

    return token;
  }

  async getTenantBySession(token: string): Promise<Tenant | null> {
    const sessionResult = await db.select()
      .from(tenantSessions)
      .where(and(eq(tenantSessions.token, token), gt(tenantSessions.expiresAt, new Date())))
      .limit(1);

    if (!sessionResult[0]) {
      return null;
    }

    return await this.getTenantById(sessionResult[0].tenantId);
  }

  async deleteTenantSession(token: string): Promise<void> {
    await db.delete(tenantSessions).where(eq(tenantSessions.token, token));
  }

  async createTenantMaintenanceRequest(tenantId: string, requestData: CreateTenantMaintenanceRequest): Promise<MaintenanceRequest> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant || !tenant.unitId) {
      throw new Error('Tenant not found or not assigned to a unit');
    }

    const maintenanceRequest = await this.createMaintenanceRequest({
      ...requestData,
      unitId: tenant.unitId,
      tenantId: tenantId,
      status: 'open',
      submittedDate: new Date(),
    });

    return maintenanceRequest;
  }

  async getTenantMaintenanceRequests(tenantId: string): Promise<MaintenanceRequest[]> {
    return await db.select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.tenantId, tenantId));
  }

  async getTenantRentPayments(tenantId: string): Promise<RentPayment[]> {
    return await db.select()
      .from(rentPayments)
      .where(eq(rentPayments.tenantId, tenantId));
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
        status: paymentData.paidDate ? 'paid' : (paymentData.status || 'pending'),
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
    try {
      console.log("Updating rent payment with data:", paymentData);
      
      const updateData = {
        ...paymentData,
        dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : undefined,
        paidDate: paymentData.paidDate ? new Date(paymentData.paidDate) : undefined,
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log("Formatted update data:", updateData);

      const [payment] = await db.update(rentPayments)
        .set(updateData)
        .where(eq(rentPayments.id, id))
        .returning();
      return payment || null;
    } catch (error) {
      console.error("Error updating rent payment:", error);
      throw error;
    }
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

  async getAllMortgages(organizationId?: string): Promise<Mortgage[]> {
    if (organizationId) {
      // Join with properties to filter by organization
      return await db.select().from(mortgages)
        .innerJoin(properties, eq(mortgages.propertyId, properties.id))
        .where(eq(properties.organizationId, organizationId));
    }
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

  async getAllTasks(organizationId?: string): Promise<Task[]> {
    if (organizationId) {
      // Join with properties to filter by organization
      return await db.select().from(tasks)
        .innerJoin(properties, eq(tasks.propertyId, properties.id))
        .where(eq(properties.organizationId, organizationId));
    }
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

  // Generate monthly rent payments for active tenants
  async generateMonthlyRentPayments() {
    try {
      const tenants = await this.getAllTenants();
      const activeTenants = tenants.filter(tenant => 
        tenant.status === 'active' && 
        tenant.unitId && 
        tenant.monthlyRent && 
        parseFloat(tenant.monthlyRent) > 0
      );

      const today = new Date();
      const results = [];

      for (const tenant of activeTenants) {
        // Generate payments for next 12 months
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          const dueDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

          // Check if payment already exists for this month
          const existingPayments = await this.getTenantRentPayments(tenant.id);
          const paymentExists = existingPayments.some((payment: any) => {
            const paymentDue = new Date(payment.dueDate);
            return paymentDue.getMonth() === dueDate.getMonth() && 
                   paymentDue.getFullYear() === dueDate.getFullYear();
          });

          if (!paymentExists) {
            const rentPayment = await this.createRentPayment({
              tenantId: tenant.id,
              unitId: tenant.unitId,
              amount: tenant.monthlyRent,
              dueDate,
              status: "pending",
              paymentMethod: null,
              notes: `Monthly rent - ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
            });
            results.push(rentPayment);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error generating monthly rent payments:", error);
      throw error;
    }
  }

  // Get payment summaries for dashboard
  async getPaymentSummaries() {
    try {
      const payments = await this.getAllRentPayments();
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      const totalRevenue = payments
        .filter((p: any) => p.paidDate)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      const currentMonthRevenue = payments
        .filter((p: any) => {
          const paidDate = p.paidDate ? new Date(p.paidDate) : null;
          return paidDate && paidDate >= currentMonth && paidDate < nextMonth;
        })
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      const outstandingBalance = payments
        .filter((p: any) => !p.paidDate && new Date(p.dueDate) <= today)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      const overduePayments = payments
        .filter((p: any) => !p.paidDate && new Date(p.dueDate) < today)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      const upcomingPayments = payments
        .filter((p: any) => {
          const dueDate = new Date(p.dueDate);
          const futureDate = new Date(today);
          futureDate.setDate(today.getDate() + 30);
          return !p.paidDate && dueDate > today && dueDate <= futureDate;
        })
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      return {
        totalRevenue,
        currentMonthRevenue,
        outstandingBalance,
        overduePayments,
        upcomingPayments,
        totalPayments: payments.length,
        paidPayments: payments.filter((p: any) => p.paidDate).length,
        pendingPayments: payments.filter((p: any) => !p.paidDate).length
      };
    } catch (error) {
      console.error("Error getting payment summaries:", error);
      throw error;
    }
  }

  // Task Communication methods
  async createTaskCommunication(communicationData: any): Promise<TaskCommunication> {
    const communication = {
      id: crypto.randomUUID(),
      taskId: communicationData.taskId,
      method: communicationData.method,
      recipient: communicationData.recipient,
      subject: communicationData.subject || null,
      message: communicationData.message,
      sentAt: new Date(),
      createdAt: new Date()
    };
    
    await db.insert(taskCommunications).values(communication);
    return communication;
  }

  async getTaskCommunications(taskId: string): Promise<TaskCommunication[]> {
    const result = await db.select()
      .from(taskCommunications)
      .where(eq(taskCommunications.taskId, taskId))
      .orderBy(desc(taskCommunications.createdAt));
    return result;
  }

  async updateTaskCommunication(id: string, updates: any): Promise<TaskCommunication | null> {
    const result = await db.update(taskCommunications)
      .set(updates)
      .where(eq(taskCommunications.id, id))
      .returning();
    return result[0] || null;
  }

  // Task History methods
  async createTaskHistory(historyData: any): Promise<TaskHistory> {
    const history = {
      id: crypto.randomUUID(),
      taskId: historyData.taskId,
      action: historyData.action,
      field: historyData.field,
      oldValue: historyData.oldValue,
      newValue: historyData.newValue,
      userId: historyData.userId,
      notes: historyData.notes,
      createdAt: new Date(),
      ...historyData
    };
    
    await db.insert(taskHistory).values(history);
    return history;
  }

  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const result = await db.select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.createdAt));
    return result;
  }

  // Enhanced task methods with communication and history tracking
  async sendTaskCommunication(task: Task, subject: string, message: string): Promise<void> {
    if (!task.communicationMethod || task.communicationMethod === 'none') return;

    const communications = [];

    if ((task.communicationMethod === 'email' || task.communicationMethod === 'both') && task.recipientEmail) {
      communications.push({
        taskId: task.id,
        method: 'email',
        recipient: task.recipientEmail,
        subject: subject,
        message: message
      });
    }

    if ((task.communicationMethod === 'sms' || task.communicationMethod === 'both') && task.recipientPhone) {
      communications.push({
        taskId: task.id,
        method: 'sms',
        recipient: task.recipientPhone,
        subject: null,
        message: message
      });
    }

    // Create communication records
    for (const comm of communications) {
      await this.createTaskCommunication(comm);
      
      // Create history entry
      await this.createTaskHistory({
        taskId: task.id,
        action: 'communication_sent',
        notes: `${comm.type.toUpperCase()} sent to ${comm.recipient}`
      });
    }
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

  // Tenant History methods
  async getTenantHistoryByUnit(unitId: string): Promise<TenantHistory[]> {
    console.log("Storage: getTenantHistoryByUnit called with unitId:", unitId);
    try {
      // Return sample data for demonstration purposes
      const sampleHistory: TenantHistory[] = [
        {
          id: "hist-1",
          unitId: unitId,
          tenantName: "John Smith",
          moveInDate: new Date("2022-01-15"),
          moveOutDate: new Date("2023-12-31"),
          monthlyRent: "1500",
          securityDeposit: "1500",
          moveOutReason: "lease_expired",
          notes: "Good tenant, always paid on time. Left unit in excellent condition.",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "hist-2", 
          unitId: unitId,
          tenantName: "Sarah Johnson",
          moveInDate: new Date("2020-06-01"),
          moveOutDate: new Date("2021-12-15"),
          monthlyRent: "1400",
          securityDeposit: "1400", 
          moveOutReason: "early_termination",
          notes: "Moved for job relocation. Gave proper 30-day notice.",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "hist-3", 
          unitId: unitId,
          tenantName: "Michael Davis",
          moveInDate: new Date("2018-03-01"),
          moveOutDate: new Date("2020-05-15"),
          monthlyRent: "1300",
          securityDeposit: "1300", 
          moveOutReason: "eviction",
          notes: "Multiple late payments and property damage. Required legal action.",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      console.log("Storage: Returning sample history with", sampleHistory.length, "records");
      return sampleHistory;
    } catch (error) {
      console.error("Error in getTenantHistoryByUnit:", error);
      return [];
    }
  }

  async createTenantHistory(historyData: any): Promise<TenantHistory> {
    const [history] = await db.insert(tenantHistory).values({
      id: crypto.randomUUID(),
      ...historyData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return history;
  }

  // Billing Records methods
  async createBillingRecord(billingData: any): Promise<any> {
    const [billing] = await db.insert(billingRecords).values({
      id: crypto.randomUUID(),
      ...billingData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return billing;
  }

  async getBillingRecordsByTenant(tenantId: string): Promise<any[]> {
    const result = await db.select()
      .from(billingRecords)
      .where(eq(billingRecords.tenantId, tenantId))
      .orderBy(desc(billingRecords.dueDate));
    return result;
  }

  async updateBillingRecord(id: string, updates: any): Promise<any | null> {
    const [result] = await db.update(billingRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(billingRecords.id, id))
      .returning();
    return result || null;
  }

  async calculateOutstandingBalance(tenantId: string): Promise<number> {
    try {
      console.log("Calculating outstanding balance for tenant:", tenantId);
      
      // Get all billing records for the tenant
      const billingRecordsResult = await db.select()
        .from(billingRecords)
        .where(eq(billingRecords.tenantId, tenantId));
      
      console.log("Billing records found:", billingRecordsResult.length);
      
      // Get all rent payments for the tenant
      const rentPaymentsResult = await db.select()
        .from(rentPayments)
        .where(eq(rentPayments.tenantId, tenantId));
      
      console.log("Rent payments found:", rentPaymentsResult.length);
      
      // Calculate total billed amount
      let totalBilled = 0;
      for (const record of billingRecordsResult) {
        const amount = parseFloat(record.amount || '0');
        totalBilled += amount;
        console.log("Billing record amount:", amount);
      }
      
      // Calculate total paid amount from rent payments
      let totalPaid = 0;
      for (const payment of rentPaymentsResult) {
        if (payment.status === 'paid' || payment.paidDate) {
          const amount = parseFloat(payment.amount || '0');
          totalPaid += amount;
          console.log("Payment amount:", amount, "Status:", payment.status);
        }
      }
      
      console.log("Total billed:", totalBilled, "Total paid:", totalPaid);
      
      // Outstanding balance = Total Billed - Total Paid
      const outstandingBalance = totalBilled - totalPaid;
      const finalBalance = Math.max(0, outstandingBalance);
      
      console.log("Final outstanding balance:", finalBalance);
      return finalBalance;
    } catch (error) {
      console.error("Error in calculateOutstandingBalance:", error);
      throw error;
    }
  }

  async initiateMonthlyBilling(tenant: any): Promise<void> {
    try {
      console.log("Initiating monthly billing for tenant:", tenant.id);
      
      if (!tenant.leaseStart || !tenant.monthlyRent) {
        console.log("Missing lease start or monthly rent for billing");
        return;
      }

      const today = new Date();
      const leaseStartDate = new Date(tenant.leaseStart);
      const monthlyAmount = parseFloat(tenant.monthlyRent);

      // Generate billing for current month if lease has started
      if (leaseStartDate <= today) {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const billingPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        // Check if billing already exists for this period
        const existingBilling = await db.select()
          .from(billingRecords)
          .where(
            and(
              eq(billingRecords.tenantId, tenant.id),
              eq(billingRecords.billingPeriod, billingPeriod)
            )
          );
        
        if (existingBilling.length === 0) {
          // Calculate due date (lease anniversary date)
          const dueDate = new Date(currentYear, currentMonth, leaseStartDate.getDate());
          
          // Create billing record for current month
          const billingData = {
            tenantId: tenant.id,
            unitId: tenant.unitId,
            amount: tenant.monthlyRent,
            billingPeriod,
            dueDate,
            status: 'unpaid',
            paidAmount: '0'
          };
          
          await this.createBillingRecord(billingData);
          console.log("Created billing record for period:", billingPeriod);
        }
      }
    } catch (error) {
      console.error("Error in initiateMonthlyBilling:", error);
    }
  }

  async generateMonthlyBilling(): Promise<any[]> {
    const today = new Date();
    const activeTenantsResult = await db.select()
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    
    const generatedBillings = [];
    
    for (const tenant of activeTenantsResult) {
      // Check if tenant has lease start date and is active
      if (!tenant.leaseStart || !tenant.monthlyRent) continue;
      
      const leaseStart = new Date(tenant.leaseStart);
      
      // Check if lease has started
      if (leaseStart > today) continue;
      
      // Calculate the current billing period
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const billingPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      
      // Check if billing already exists for this period
      const existingBilling = await db.select()
        .from(billingRecords)
        .where(
          and(
            eq(billingRecords.tenantId, tenant.id),
            eq(billingRecords.billingPeriod, billingPeriod)
          )
        );
      
      if (existingBilling.length > 0) continue;
      
      // Calculate due date (same day of month as lease start)
      const dueDate = new Date(currentYear, currentMonth, leaseStart.getDate());
      
      // Create billing record
      const billingData = {
        tenantId: tenant.id,
        unitId: tenant.unitId,
        amount: tenant.monthlyRent,
        billingPeriod,
        dueDate,
        status: 'unpaid',
        paidAmount: '0'
      };
      
      const newBilling = await this.createBillingRecord(billingData);
      generatedBillings.push(newBilling);
    }
    
    return generatedBillings;
  }
}

export const emailService = new EmailService();
export const storage = new Storage();