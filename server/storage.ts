import { User, TenantSession, TenantLogin, CreateTenantMaintenanceRequest, Organization } from '../shared/schema';
import { db, organizations, users, properties, expenses, units, tenants, tenantSessions, tenantHistory, maintenanceRequests, vendors, rentPayments, billingRecords, mortgages, tasks, taskCommunications, taskHistory, sessions, passwordResets } from './db';
import { eq, sql, and, gt, desc, or, isNotNull } from 'drizzle-orm';
import * as crypto from "crypto";
import * as bcrypt from 'bcrypt';
import { Property, Expense, Unit, Tenant, TenantHistory, MaintenanceRequest, Vendor, RentPayment, Mortgage, Task, TaskCommunication, TaskHistory } from '../shared/schema';
import * as nodemailer from 'nodemailer';
import { withRetry, isRetryableError } from './db-retry';

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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.insert(sessions).values({
      token,
      userId: user.id,
      userData: user,
      createdAt: new Date(),
      expiresAt,
    });
  }

  async getSession(token: string): Promise<Session | null> {
    const result = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    if (!result[0]) return null;

    const session = result[0];
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.deleteSession(token);
      return null;
    }

    return {
      token: session.token,
      user: session.userData as User,
      createdAt: session.createdAt,
    };
  }

  async getSessionById(token: string): Promise<Session | null> {
    return this.getSession(token);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, sessionId));
  }

  // Password Reset methods
  async createPasswordResetToken(email: string): Promise<string> {
    return await withRetry(async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await db.insert(passwordResets).values({
        email,
        token,
        expiresAt,
        createdAt: new Date()
      });

      return token;
    });
  }

  async validatePasswordResetToken(token: string): Promise<{ email: string; id: number } | null> {
    return await withRetry(async () => {
      const resetResult = await db.select()
        .from(passwordResets)
        .where(eq(passwordResets.token, token))
        .limit(1);

      if (resetResult.length === 0) {
        return null;
      }

      const reset = resetResult[0];
      
      // Check if token is expired
      if (new Date(reset.expiresAt) < new Date()) {
        return null;
      }

      // Check if token was already used
      if (reset.usedAt) {
        return null;
      }

      return {
        email: reset.email,
        id: reset.id
      };
    });
  }

  async markPasswordResetTokenUsed(resetId: number): Promise<void> {
    await withRetry(async () => {
      await db.update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, resetId));
    });
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.email, email));
      
      return result.rowCount > 0;
    });
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
    return await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(properties).where(eq(properties.organizationId, organizationId));
      }
      return await db.select().from(properties);
    });
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
    return await withRetry(async () => {
      const [expense] = await db.insert(expenses).values({
        id: expenseData.id || crypto.randomUUID(),
        organizationId: expenseData.organizationId || "default-org",
        ...expenseData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return expense;
    });
  }

  async getAllExpenses(organizationId?: string): Promise<Expense[]> {
    return await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(expenses).where(eq(expenses.organizationId, organizationId));
      }
      return await db.select().from(expenses);
    });
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
    return await withRetry(async () => {
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
    });
  }

  async getAllUnits(organizationId?: string): Promise<Unit[]> {
    return await withRetry(async () => {
      if (organizationId) {
        // Join with properties to filter by organization
        const result = await db.select({
          id: units.id,
          propertyId: units.propertyId,
          unitNumber: units.unitNumber,
          bedrooms: units.bedrooms,
          bathrooms: units.bathrooms,
          rentAmount: units.rentAmount,
          squareFootage: units.squareFootage,
          status: units.status,
          createdAt: units.createdAt,
          updatedAt: units.updatedAt
        })
        .from(units)
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(eq(properties.organizationId, organizationId));

        return result.map(unit => ({
          ...unit,
          status: unit.status as "vacant" | "occupied" | "maintenance"
        }));
      }

      const result = await db.select().from(units);
      return result.map(unit => ({
        ...unit,
        status: unit.status as "vacant" | "occupied" | "maintenance"
      }));
    });
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
        organizationId: tenantData.organizationId || "default-org",
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

      // Generate initial billing record for active tenants with monthly rent
      if (tenant.status === 'active' && tenant.monthlyRent && parseFloat(tenant.monthlyRent) > 0) {
        console.log("Generating initial billing record for new active tenant:", tenant.id);
        await this.initiateMonthlyBilling(tenant);
      }

      return tenant;
    } catch (error) {
      console.error("Storage: Error creating tenant:", error);
      throw error;
    }
  }

  async getAllTenants(organizationId?: string): Promise<Tenant[]> {
    return await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(tenants).where(eq(tenants.organizationId, organizationId));
      }
      return await db.select().from(tenants);
    });
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
          organizationId: tenant.organizationId,
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

      if (!tenant.unitId) {
        console.log("No unit assigned to tenant, skipping payment generation");
        return;
      }

      const monthlyAmount = parseFloat(tenant.monthlyRent);
      const today = new Date();

      console.log("Generating current month rent payment for active tenant:", tenant.id);
      console.log("Monthly amount:", monthlyAmount);

      // Get existing payments to avoid duplicates
      const existingPayments = await db.select()
        .from(rentPayments)
        .where(eq(rentPayments.tenantId, tenant.id));

      // For new tenants, set due date to avoid immediate overdue status
      const dayOfMonth = today.getDate();
      let dueYear = today.getFullYear();
      let dueMonth = today.getMonth();
      
      if (dayOfMonth > 15) {
        // If we're past mid-month, set due date for next month
        dueMonth = today.getMonth() + 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear = today.getFullYear() + 1;
        }
      }
      
      const currentMonthDueDate = new Date(dueYear, dueMonth, 1);

      // Check if payment already exists for current month
      const currentMonthExists = existingPayments.some((payment: any) => {
        const paymentDue = new Date(payment.dueDate);
        return paymentDue.getMonth() === currentMonthDueDate.getMonth() && 
               paymentDue.getFullYear() === currentMonthDueDate.getFullYear();
      });

      if (!currentMonthExists) {
        const payment = {
          id: crypto.randomUUID(),
          organizationId: tenant.organizationId,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          amount: monthlyAmount.toString(),
          dueDate: currentMonthDueDate,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log("Creating current month rent payment record");
        await db.insert(rentPayments).values([payment]);
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

  async getAllMaintenanceRequests(organizationId?: string): Promise<MaintenanceRequest[]> {
    return await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.organizationId, organizationId));
      }
      return await db.select().from(maintenanceRequests);
    });
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
      
      // If payment is marked as paid, update corresponding billing records
      if (insertData.paidDate && insertData.status === 'paid') {
        await this.updateBillingRecordsForPayment(insertData.tenantId, parseFloat(insertData.amount));
      }
      
      return payment;
    } catch (error) {
      console.error("Error creating rent payment:", error);
      throw error;
    }
  }

  async updateBillingRecordsForPayment(tenantId: string, paymentAmount: number): Promise<void> {
    try {
      console.log(`Updating billing records for tenant ${tenantId} with payment amount ${paymentAmount}`);
      
      // Get unpaid billing records for this tenant, ordered by due date
      const unpaidBillings = await db.select()
        .from(billingRecords)
        .where(and(
          eq(billingRecords.tenantId, tenantId),
          eq(billingRecords.status, 'pending')
        ))
        .orderBy(billingRecords.dueDate);

      let remainingPayment = paymentAmount;
      
      for (const billing of unpaidBillings) {
        if (remainingPayment <= 0) break;
        
        const billingAmount = parseFloat(billing.amount || '0');
        
        if (remainingPayment >= billingAmount) {
          // Payment covers this billing record completely
          await db.update(billingRecords)
            .set({ 
              status: 'paid',
              paidDate: new Date(),
              updatedAt: new Date()
            })
            .where(eq(billingRecords.id, billing.id));
          
          remainingPayment -= billingAmount;
          console.log(`Marked billing record ${billing.id} as paid (${billingAmount})`);
        } else {
          // Partial payment - create a new billing record for remaining amount
          const remainingAmount = billingAmount - remainingPayment;
          
          // Mark original as paid with the payment amount
          await db.update(billingRecords)
            .set({ 
              status: 'paid',
              amount: remainingPayment.toString(),
              paidDate: new Date(),
              updatedAt: new Date()
            })
            .where(eq(billingRecords.id, billing.id));
          
          // Create new billing record for remaining amount
          await db.insert(billingRecords).values({
            id: crypto.randomUUID(),
            tenantId: billing.tenantId,
            amount: remainingAmount.toString(),
            dueDate: billing.dueDate,
            status: 'pending',
            description: billing.description,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          remainingPayment = 0;
          console.log(`Split billing record ${billing.id}: paid ${remainingPayment}, remaining ${remainingAmount}`);
        }
      }
      
      console.log(`Payment processing complete. Remaining payment amount: ${remainingPayment}`);
    } catch (error) {
      console.error("Error updating billing records for payment:", error);
      throw error;
    }
  }

  async getAllRentPayments(organizationId?: string): Promise<RentPayment[]> {
    return await withRetry(async () => {
      if (organizationId) {
        console.log("Fetching rent payments for organization:", organizationId);
        const payments = await db.select().from(rentPayments).where(eq(rentPayments.organizationId, organizationId));
        console.log("Found", payments.length, "rent payments for organization:", organizationId);
        return payments;
      }
      return await db.select().from(rentPayments);
    });
  }

  async getRentPaymentById(id: string): Promise<RentPayment | null> {
    const result = await db.select().from(rentPayments).where(eq(rentPayments.id, id)).limit(1);
    return result[0] || null;
  }

  async updateRentPayment(id: string, paymentData: any): Promise<RentPayment | null> {
    return await withRetry(async () => {
      try {
        console.log("Updating rent payment with data:", paymentData);

        // Get the original payment to check for amount changes
        const originalPayment = await db.select().from(rentPayments).where(eq(rentPayments.id, id)).limit(1);
        if (originalPayment.length === 0) {
          throw new Error("Payment not found");
        }
        
        const original = originalPayment[0];
        const originalAmount = parseFloat(original.amount || '0');
        const newAmount = parseFloat(paymentData.amount || '0');

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

        // If the amount changed and this is a paid payment, recalculate billing records
        if (originalAmount !== newAmount && payment.status === 'paid' && payment.paidDate) {
          console.log(`Payment amount changed from ${originalAmount} to ${newAmount}, recalculating billing records`);
          
          // Reset all paid billing records for this tenant back to pending
          await db.update(billingRecords)
            .set({ 
              status: 'pending',
              paidAmount: '0',
              paidDate: null,
              updatedAt: new Date()
            })
            .where(and(
              eq(billingRecords.tenantId, payment.tenantId),
              eq(billingRecords.status, 'paid')
            ));

          // Reapply all payments for this tenant
          const allTenantPayments = await db.select()
            .from(rentPayments)
            .where(and(
              eq(rentPayments.tenantId, payment.tenantId),
              eq(rentPayments.status, 'paid'),
              isNotNull(rentPayments.paidDate)
            ))
            .orderBy(rentPayments.paidDate);

          console.log(`Found ${allTenantPayments.length} paid payments to reapply`);
          
          for (const tenantPayment of allTenantPayments) {
            console.log(`Reapplying payment of ${tenantPayment.amount} for tenant ${tenantPayment.tenantId}`);
            await this.updateBillingRecordsForPayment(tenantPayment.tenantId, parseFloat(tenantPayment.amount || '0'));
          }
        } else if (payment.status === 'paid' && payment.paidDate) {
          // If this is a paid payment but amount didn't change, still update billing records
          console.log("Updating billing records for existing paid payment");
          await this.updateBillingRecordsForPayment(payment.tenantId, parseFloat(payment.amount || '0'));
        }

        return payment || null;
      } catch (error) {
        console.error("Error updating rent payment:", error);
        throw error;
      }
    });
  }

  async deleteRentPayment(id: string): Promise<boolean> {
    return await withRetry(async () => {
      // First, get the payment details to find related billing records
      const payment = await db.select().from(rentPayments).where(eq(rentPayments.id, id)).limit(1);
      
      if (payment.length === 0) {
        return false;
      }
      
      const paymentRecord = payment[0];
      
      // Find related billing records that were marked as paid due to this payment
      // Look for billing records for the same tenant, unit, and amount
      const relatedBillingRecords = await db.select()
        .from(billingRecords)
        .where(and(
          eq(billingRecords.tenantId, paymentRecord.tenantId),
          eq(billingRecords.status, 'paid'),
          eq(billingRecords.amount, paymentRecord.amount)
        ));
      
      // Revert billing records back to pending status
      for (const billingRecord of relatedBillingRecords) {
        await db.update(billingRecords)
          .set({ 
            status: 'pending',
            paidAmount: '0',
            paidDate: null,
            updatedAt: new Date()
          })
          .where(eq(billingRecords.id, billingRecord.id));
      }
      
      // Delete the payment record
      const result = await db.delete(rentPayments).where(eq(rentPayments.id, id));
      
      console.log(`Deleted payment ${id} and reverted ${relatedBillingRecords.length} billing records to pending status`);
      
      return result.rowCount > 0;
    });
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
    return await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(mortgages).where(eq(mortgages.organizationId, organizationId));
      }
      return await db.select().from(mortgages);
    });
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
      organizationId: taskData.organizationId || "default-org",
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return task;
  }

  async getAllTasks(organizationId?: string): Promise<Task[]> {
    return await withRetry(async () => {
      console.log('Fetching tasks for organization:', organizationId);
      
      // Use raw SQL query since the Drizzle schema is incomplete
      let query = 'SELECT * FROM tasks';
      const params: any[] = [];
      
      if (organizationId) {
        query += ' WHERE organization_id = $1';
        params.push(organizationId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      try {
        const result = organizationId 
          ? await db.execute(sql`SELECT * FROM tasks WHERE organization_id = ${organizationId} ORDER BY created_at DESC`)
          : await db.execute(sql`SELECT * FROM tasks ORDER BY created_at DESC`);
        
        console.log('Task query result type:', typeof result);
        console.log('Task query result keys:', Object.keys(result || {}));
        
        // Handle Neon database result format
        let rows: any[] = [];
        if (result && result.rows && Array.isArray(result.rows)) {
          rows = result.rows;
        } else if (Array.isArray(result)) {
          rows = result;
        } else {
          console.log('No tasks found or unexpected result format');
          return [];
        }
        
        console.log('Found', rows.length, 'tasks');
        
        return rows.map((task: any) => ({
          id: task.id,
          title: task.title || '',
          description: task.description || '',
          priority: task.priority as "low" | "medium" | "high" | "urgent" || "medium",
          status: task.status as "pending" | "in_progress" | "completed" | "cancelled" || "pending",
          dueDate: task.due_date,
          assignedTo: task.assigned_to,
          propertyId: task.property_id,
          unitId: task.unit_id,
          tenantId: task.tenant_id,
          vendorId: task.vendor_id,
          rentPaymentId: task.rent_payment_id,
          category: task.category || 'general',
          notes: task.notes,
          isRecurring: task.is_recurring || false,
          recurrencePeriod: task.recurrence_period,
          organizationId: task.organization_id,
          communicationMethod: task.communication_method,
          recipientEmail: task.recipient_email,
          recipientPhone: task.recipient_phone,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }));
      } catch (error) {
        console.error('Error executing tasks query:', error);
        throw error;
      }
    });
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0] || null;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await db.select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return result[0] || null;
  }

  async updateTask(id: string, taskData: any): Promise<Task | null> {
    // Convert date string to Date object if present
    const updateData: any = { ...taskData, updatedAt: new Date() };
    if (updateData.dueDate && typeof updateData.dueDate === 'string') {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    
    const [task] = await db.update(tasks)
      .set(updateData)
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

      console.log(`Found ${activeTenants.length} active tenants with units and monthly rent`);

      const today = new Date();
      const results = [];

      for (const tenant of activeTenants) {
        // Only generate payment for current month
        const currentMonthDueDate = new Date(today.getFullYear(), today.getMonth(), 1);

        // Check if payment already exists for current month
        const existingPayments = await this.getTenantRentPayments(tenant.id);
        const currentMonthExists = existingPayments.some((payment: any) => {
          const paymentDue = new Date(payment.dueDate);
          return paymentDue.getMonth() === currentMonthDueDate.getMonth() && 
                 paymentDue.getFullYear() === currentMonthDueDate.getFullYear();
        });

        if (!currentMonthExists) {
          console.log(`Generating current month payment for tenant: ${tenant.firstName} ${tenant.lastName}`);
          const rentPayment = await this.createRentPayment({
            tenantId: tenant.id,
            unitId: tenant.unitId,
            amount: tenant.monthlyRent,
            dueDate: currentMonthDueDate,
            status: "pending",
            paymentMethod: null,
            notes: `Monthly rent - ${currentMonthDueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          });
          results.push(rentPayment);
        } else {
          console.log(`Current month payment already exists for tenant: ${tenant.firstName} ${tenant.lastName}`);
        }
      }

      console.log(`Generated ${results.length} new payments`);
      return results;
    } catch (error) {
      console.error("Error generating monthly rent payments:", error);
      throw error;
    }
  }

  // Get payment summaries for dashboard
  async getPaymentSummaries(organizationId?: string): Promise<any> {
    try {
      const rentPayments = await this.getAllRentPayments(organizationId);
      const expenses = await this.getAllExpenses(organizationId);
      
      const totalRevenue = rentPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const currentMonthExpenses = expenses
        .filter(e => {
          const expenseDate = new Date(e.date);
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
      
      const lastMonthRevenue = rentPayments
        .filter(p => {
          if (p.status !== 'paid' || !p.paidDate) return false;
          const paidDate = new Date(p.paidDate);
          return paidDate.getMonth() === lastMonth && paidDate.getFullYear() === lastMonthYear;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const currentMonthRevenue = rentPayments
        .filter(p => {
          if (p.status !== 'paid' || !p.paidDate) return false;
          const paidDate = new Date(p.paidDate);
          return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const outstandingBalance = rentPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const overduePayments = rentPayments
        .filter(p => {
          if (p.status !== 'pending') return false;
          const dueDate = new Date(p.dueDate);
          return dueDate < new Date();
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const upcomingPayments = rentPayments
        .filter(p => {
          if (p.status !== 'pending') return false;
          const dueDate = new Date(p.dueDate);
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30);
          return dueDate > new Date() && dueDate <= futureDate;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      
      return {
        totalRevenue,
        currentMonthRevenue,
        currentMonthExpenses,
        lastMonthRevenue,
        outstandingBalance,
        overduePayments,
        upcomingPayments,
        totalPayments: rentPayments.length,
        paidPayments: rentPayments.filter(p => p.status === 'paid').length,
        pendingPayments: rentPayments.filter(p => p.status === 'pending').length,
        netIncome: totalRevenue - currentMonthExpenses
      };
    } catch (error) {
      console.error("Error getting payment summaries:", error);
      return {
        totalRevenue: 0,
        currentMonthRevenue: 0,
        currentMonthExpenses: 0,
        lastMonthRevenue: 0,
        outstandingBalance: 0,
        overduePayments: 0,
        upcomingPayments: 0,
        totalPayments: 0,
        paidPayments: 0,
        pendingPayments: 0,
        netIncome: 0
      };
    }
  }

  // Task Communication methods
  async createTaskCommunication(communicationData: any): Promise<TaskCommunication> {
    const communication = {
      id: crypto.randomUUID(),
      taskId: communicationData.taskId,
      type: communicationData.method, // Map method to type field
      recipient: communicationData.recipient,
      subject: communicationData.subject || null,
      message: communicationData.message,
      status: "sent" as const,
      sentAt: new Date(),
      createdAt: new Date()
    };

    await db.insert(taskCommunications).values(communication);
    
    // If it's an email, send it using the email service
    if (communicationData.method === "email") {
      try {
        const { emailService } = await import("./email");
        await emailService.sendEmail({
          to: communicationData.recipient,
          subject: communicationData.subject || "Task Communication",
          text: communicationData.message,
          html: `<p>${communicationData.message.replace(/\n/g, '<br>')}</p>`
        });
        
        // Update status to delivered (note: deliveredAt column may not exist in current schema)
        await db.update(taskCommunications)
          .set({ status: "delivered" })
          .where(eq(taskCommunications.id, communication.id));
      } catch (error) {
        console.error("Error sending email:", error);
        // Update status to failed
        await db.update(taskCommunications)
          .set({ status: "failed", errorMessage: error.message })
          .where(eq(taskCommunications.id, communication.id));
      }
    }
    
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

    // Billing Records methods
  async createBillingRecord(billingData: any): Promise<any> {
    return await withRetry(async () => {
      const [record] = await db.insert(billingRecords).values({
        id: crypto.randomUUID(),
        ...billingData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return record;
    });
  }

  async getBillingRecordsByTenant(tenantId: string): Promise<any[]> {
    return await withRetry(async () => {
      const records = await db.select().from(billingRecords).where(eq(billingRecords.tenantId, tenantId));
      return records;
    });
  }

  async updateBillingRecord(id: string, updates: any): Promise<any | null> {
    return await withRetry(async () => {
      const [record] = await db.update(billingRecords)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(billingRecords.id, id))
        .returning();
      return record || null;
    });
  }

  async calculateOutstandingBalance(tenantId: string): Promise<number> {
    return await withRetry(async () => {
      try {
        console.log("Calculating outstanding balance for tenant:", tenantId);

        // Get pending and partial billing records for the tenant
        const outstandingBillings = await db.select()
          .from(billingRecords)
          .where(and(
            eq(billingRecords.tenantId, tenantId),
            or(
              eq(billingRecords.status, 'pending'),
              eq(billingRecords.status, 'partial')
            )
          ));

        // Calculate total outstanding amount from pending and partial bills
        let outstandingBalance = 0;
        for (const billing of outstandingBillings) {
          const amount = parseFloat(billing.amount || '0');
          const paidAmount = parseFloat(billing.paidAmount || '0');
          const remainingAmount = amount - paidAmount;
          outstandingBalance += remainingAmount;
          console.log(`Billing record ${billing.status}: total ${amount}, paid ${paidAmount}, outstanding ${remainingAmount}`);
        }

        console.log("Final outstanding balance:", outstandingBalance);
        return Math.max(0, outstandingBalance);
      } catch (error) {
        console.error("Error calculating outstanding balance:", error);
        throw error;
      }
    });
  }

  async generateMonthlyBilling(): Promise<any[]> {
    return await withRetry(async () => {
      try {
        console.log("Generating monthly billing for all active tenants");
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
            billingPeriod: billingPeriod,
            dueDate: dueDate,
            status: 'pending',
            type: 'rent'
          };

          const newBilling = await this.createBillingRecord(billingData);
          generatedBillings.push(newBilling);

          console.log("Generated billing for tenant:", tenant.id, "Amount:", tenant.monthlyRent);
        }

        console.log("Total billings generated:", generatedBillings.length);
        return generatedBillings;
      } catch (error) {
        console.error("Error generating monthly billing:", error);
        throw error;
      }
    });
  }

  async initiateMonthlyBilling(tenant: any): Promise<void> {
    try {
      console.log("Initiating monthly billing for tenant:", tenant.id);

      if (!tenant.monthlyRent) {
        console.log("Missing monthly rent for billing");
        return;
      }

      if (!tenant.unitId) {
        console.log("No unit assigned to tenant, skipping billing generation");
        return;
      }

      const today = new Date();
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
        // For new tenants, set due date to next month to avoid immediate overdue status
        // If we're past the 15th of the month, use next month, otherwise use current month
        const dayOfMonth = today.getDate();
        let dueYear = currentYear;
        let dueMonth = currentMonth;
        
        if (dayOfMonth > 15) {
          // If we're past mid-month, bill for next month
          dueMonth = currentMonth + 1;
          if (dueMonth > 11) {
            dueMonth = 0;
            dueYear = currentYear + 1;
          }
        }
        
        // Set due date 30 days from today by default
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30);

        // Create billing record for current period
        const billingData = {
          tenantId: tenant.id,
          unitId: tenant.unitId,
          amount: tenant.monthlyRent,
          billingPeriod: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
          dueDate,
          status: 'pending',
          type: 'rent',
          organizationId: tenant.organizationId
        };

        await this.createBillingRecord(billingData);
        console.log("Created billing record for period:", billingPeriod);
      }
    } catch (error) {
      console.error("Error in initiateMonthlyBilling:", error);
    }
  }

  // Tenant History methods
  async createTenantHistory(historyData: any): Promise<any> {
    return await withRetry(async () => {
      const [history] = await db.insert(tenantHistory).values({
        id: crypto.randomUUID(),
        ...historyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return history;
    });
  }

  async getTenantHistoryByUnit(unitId: string): Promise<any[]> {
    return await withRetry(async () => {
      const history = await db.select().from(tenantHistory).where(eq(tenantHistory.unitId, unitId));
      return history;
    });
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

  // Billing Records Management
  async getBillingRecordsByTenant(tenantId: string): Promise<any[]> {
    return await withRetry(async () => {
      const records = await db.select().from(billingRecords).where(eq(billingRecords.tenantId, tenantId));
      return records;
    });
  }

  async createBillingRecord(billingData: any): Promise<any> {
    return await withRetry(async () => {
      const [record] = await db.insert(billingRecords).values({
        id: crypto.randomUUID(),
        ...billingData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return record;
    });
  }

  async updateBillingRecord(id: string, updates: any): Promise<any | null> {
    return await withRetry(async () => {
      const [record] = await db.update(billingRecords)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(billingRecords.id, id))
        .returning();
      return record || null;
    });
  }

  async calculateOutstandingBalance(tenantId: string): Promise<number> {
    return await withRetry(async () => {
      try {
        console.log("Calculating outstanding balance for tenant:", tenantId);
        
        const billings = await db.select()
          .from(billingRecords)
          .where(eq(billingRecords.tenantId, tenantId));
        
        let totalBilled = 0;
        for (const billing of billings) {
          const amount = parseFloat(billing.amount || '0');
          totalBilled += amount;
        }
        
        const payments = await db.select()
          .from(rentPayments)
          .where(eq(rentPayments.tenantId, tenantId));
        
        let totalPaid = 0;
        for (const payment of payments) {
          if (payment.status === 'paid' || payment.paidDate) {
            const amount = parseFloat(payment.amount || '0');
            totalPaid += amount;
          }
        }
        
        const outstandingBalance = totalBilled - totalPaid;
        return Math.max(0, outstandingBalance);
      } catch (error) {
        console.error("Error calculating outstanding balance:", error);
        throw error;
      }
    });
  }

  async generateMonthlyBilling(): Promise<any[]> {
    return await withRetry(async () => {
      try {
        console.log("Generating monthly billing for all active tenants");
        const today = new Date();
        const activeTenantsResult = await db.select()
          .from(tenants)
          .where(eq(tenants.status, 'active'));
        
        const generatedBillings = [];
        
        for (const tenant of activeTenantsResult) {
          if (!tenant.leaseStart || !tenant.monthlyRent) continue;
          
          const leaseStart = new Date(tenant.leaseStart);
          if (leaseStart > today) continue;
          
          // Generate billing for current month and any missing previous months since lease start
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          
          // Calculate months since lease started
          const leaseStartMonth = leaseStart.getMonth();
          const leaseStartYear = leaseStart.getFullYear();
          
          let monthsToGenerate = [];
          let workingDate = new Date(leaseStartYear, leaseStartMonth, 1);
          
          while (workingDate <= new Date(currentYear, currentMonth, 1)) {
            const billingPeriod = `${workingDate.getFullYear()}-${String(workingDate.getMonth() + 1).padStart(2, '0')}`;
            monthsToGenerate.push({
              year: workingDate.getFullYear(),
              month: workingDate.getMonth(),
              period: billingPeriod
            });
            workingDate.setMonth(workingDate.getMonth() + 1);
          }
          
          for (const monthData of monthsToGenerate) {
            const existingBilling = await db.select()
              .from(billingRecords)
              .where(
                and(
                  eq(billingRecords.tenantId, tenant.id),
                  eq(billingRecords.billingPeriod, monthData.period)
                )
              );
            
            if (existingBilling.length > 0) continue;
            
            // Set due date based on lease start day of month
            const dueDate = new Date(monthData.year, monthData.month, leaseStart.getDate());
            if (dueDate.getDate() !== leaseStart.getDate()) {
              // Handle edge case where lease start date doesn't exist in target month (e.g., Jan 31 -> Feb 28)
              dueDate.setDate(0); // Last day of previous month, then add 1
              dueDate.setDate(dueDate.getDate() + 1);
            }
            
            const billingData = {
              tenantId: tenant.id,
              unitId: tenant.unitId,
              amount: tenant.monthlyRent,
              billingPeriod: monthData.period,
              dueDate: dueDate,
              status: 'pending',
              type: 'rent',
              organizationId: tenant.organizationId
            };
            
            const newBilling = await this.createBillingRecord(billingData);
            generatedBillings.push(newBilling);
          }
        }
        
        return generatedBillings;
      } catch (error) {
        console.error("Error generating monthly billing:", error);
        throw error;
      }
    });
  }

  async updateOverdueStatuses(): Promise<any[]> {
    return await withRetry(async () => {
      try {
        console.log("Updating overdue statuses for billing records");
        const today = new Date();
        const gracePeriodDays = 5; // 5 days grace period before marking as overdue
        
        const pendingBillings = await db.select()
          .from(billingRecords)
          .where(eq(billingRecords.status, 'pending'));
        
        const updatedRecords = [];
        
        for (const billing of pendingBillings) {
          const dueDate = new Date(billing.dueDate);
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysPastDue > gracePeriodDays) {
            const updatedBilling = await this.updateBillingRecord(billing.id, {
              status: 'overdue',
              daysPastDue: daysPastDue
            });
            updatedRecords.push(updatedBilling);
          }
        }
        
        return updatedRecords;
      } catch (error) {
        console.error("Error updating overdue statuses:", error);
        throw error;
      }
    });
  }

  async generateAutomaticBilling(): Promise<{ generated: any[], updated: any[] }> {
    return await withRetry(async () => {
      try {
        console.log("Running automatic billing generation and overdue updates");
        
        // Generate new monthly billing records
        const generatedBillings = await this.generateMonthlyBilling();
        
        // Update overdue statuses
        const updatedOverdue = await this.updateOverdueStatuses();
        
        return {
          generated: generatedBillings,
          updated: updatedOverdue
        };
      } catch (error) {
        console.error("Error in automatic billing:", error);
        throw error;
      }
    });
  }

  async createTenantHistory(historyData: any): Promise<any> {
    return await withRetry(async () => {
      const [history] = await db.insert(tenantHistory).values({
        id: crypto.randomUUID(),
        ...historyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return history;
    });
  }

  async getTenantHistoryByUnit(unitId: string): Promise<any[]> {
    return await withRetry(async () => {
      const history = await db.select().from(tenantHistory).where(eq(tenantHistory.unitId, unitId));
      return history;
    });
  }

  async generateAutomaticBilling(): Promise<{ generated: any[], updated: any[] }> {
    return await withRetry(async () => {
      try {
        console.log("Running automatic billing process");
        
        // Generate new billing records
        const generated = await this.generateMonthlyBilling();
        
        // Update overdue statuses
        const updated = await this.updateOverdueStatuses();
        
        return { generated, updated };
      } catch (error) {
        console.error("Error in automatic billing process:", error);
        throw error;
      }
    });
  }

  async updateOverdueStatuses(): Promise<any[]> {
    return await withRetry(async () => {
      try {
        console.log("Updating overdue statuses for billing records");
        const today = new Date();
        const gracePeriod = 5; // 5 day grace period
        
        // Find pending billing records that are past due date + grace period
        const overdueRecords = await db.select()
          .from(billingRecords)
          .where(
            and(
              eq(billingRecords.status, 'pending'),
              lt(billingRecords.dueDate, new Date(today.getTime() - gracePeriod * 24 * 60 * 60 * 1000))
            )
          );
        
        const updatedRecords = [];
        
        for (const record of overdueRecords) {
          const dueDate = new Date(record.dueDate);
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
          
          if (daysPastDue > gracePeriod) {
            const [updatedRecord] = await db.update(billingRecords)
              .set({ 
                status: 'overdue',
                daysPastDue: daysPastDue,
                updatedAt: new Date()
              })
              .where(eq(billingRecords.id, record.id))
              .returning();
            
            updatedRecords.push(updatedRecord);
          }
        }
        
        console.log(`Updated ${updatedRecords.length} records to overdue status`);
        return updatedRecords;
      } catch (error) {
        console.error("Error updating overdue statuses:", error);
        throw error;
      }
    });
  }
}

export const emailService = new EmailService();
export const storage = new Storage();