import { User, TenantSession, TenantLogin, CreateTenantMaintenanceRequest, Organization } from '../shared/schema';
import { db, organizations, users, properties, units, tenants, tenantSessions, tenantHistory, expenses, maintenanceRequests, vendors, rentPayments, billingRecords, mortgages, tasks, taskCommunications, taskHistory, sessions, passwordResets, withDatabaseRetry } from "./db";
import { eq, and, desc, asc, sql, gte, lte, count, ne, isNull, isNotNull, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { withRetry } from "./db-retry";

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
      plan: organizationData.plan || 'starter',
      status: 'active',
      maxUsers: organizationData.maxUsers || 10,
      maxProperties: organizationData.maxProperties || 50,
      monthlyPrice: organizationData.monthlyPrice || 19,
      settings: organizationData.settings || {},
      stripeCustomerId: organizationData.stripeCustomerId || null,
      stripeSubscriptionId: organizationData.stripeSubscriptionId || null,
      subscriptionStatus: organizationData.subscriptionStatus || 'active',
      currentPeriodStart: organizationData.currentPeriodStart || null,
      currentPeriodEnd: organizationData.currentPeriodEnd || null,
      cancelAtPeriodEnd: organizationData.cancelAtPeriodEnd || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await withRetry(async () => {
      return await db.insert(organizations).values(organizationRecord);
    });

    return organizationRecord;
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const result = await withRetry(async () => {
      return await db.select().from(organizations).where(eq(organizations.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateOrganization(id: string, updateData: any): Promise<Organization | null> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.update(organizations)
        .set(updateRecord)
        .where(eq(organizations.id, id));
    });

    return await this.getOrganizationById(id);
  }

  async deleteOrganization(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(organizations).where(eq(organizations.id, id));
    });

    return true;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    const result = await withRetry(async () => {
      return await db.select().from(organizations);
    });

    return result;
  }

  // User management methods
  async createUser(userData: any): Promise<User> {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const userRecord = {
      id,
      organizationId: userData.organizationId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: hashedPassword,
      phone: userData.phone || null,
      role: userData.role || 'tenant',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(users).values(userRecord);
    });

    return userRecord;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await withRetry(async () => {
      return await db.select().from(users).where(eq(users.email, email));
    });

    return result.length > 0 ? result[0] : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await withRetry(async () => {
      return await db.select().from(users).where(eq(users.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateUser(id: string, updateData: any): Promise<User | null> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    if (updateData.password) {
      updateRecord.password = await bcrypt.hash(updateData.password, 10);
    }

    await withRetry(async () => {
      return await db.update(users)
        .set(updateRecord)
        .where(eq(users.id, id));
    });

    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(users).where(eq(users.id, id));
    });

    return true;
  }

  async getAllUsers(organizationId?: string): Promise<User[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(users).where(eq(users.organizationId, organizationId));
      } else {
        return await db.select().from(users);
      }
    });

    return result;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Session management
  async createSession(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const session: Session = {
      token,
      user,
      createdAt: new Date()
    };

    this.sessions.set(token, session);

    // Also store in database
    await withRetry(async () => {
      return await db.insert(sessions).values({
        token,
        userId,
        userData: user,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    });

    return token;
  }

  async getSession(token: string): Promise<Session | null> {
    const memorySession = this.sessions.get(token);
    if (memorySession) {
      return memorySession;
    }

    // Check database
    const result = await withRetry(async () => {
      return await db.select().from(sessions).where(eq(sessions.token, token));
    });

    if (result.length > 0) {
      const dbSession = result[0];
      const session: Session = {
        token: dbSession.token,
        user: dbSession.userData as User,
        createdAt: dbSession.createdAt
      };
      this.sessions.set(token, session);
      return session;
    }

    return null;
  }

  async deleteSession(token: string): Promise<boolean> {
    this.sessions.delete(token);
    
    await withRetry(async () => {
      return await db.delete(sessions).where(eq(sessions.token, token));
    });

    return true;
  }

  // Password reset methods
  async createPasswordReset(email: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await withRetry(async () => {
      return await db.insert(passwordResets).values({
        email,
        token,
        expiresAt,
        createdAt: new Date()
      });
    });

    return token;
  }

  async getPasswordReset(token: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select()
        .from(passwordResets)
        .where(and(
          eq(passwordResets.token, token),
          gte(passwordResets.expiresAt, new Date())
        ));
    });

    return result.length > 0 ? result[0] : null;
  }

  async deletePasswordReset(token: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(passwordResets).where(eq(passwordResets.token, token));
    });

    return true;
  }

  // Property management methods
  async createProperty(propertyData: any): Promise<any> {
    const id = crypto.randomUUID();
    const propertyRecord = {
      id,
      organizationId: propertyData.organizationId,
      name: propertyData.name,
      address: propertyData.address,
      type: propertyData.type,
      totalUnits: propertyData.totalUnits || 1,
      purchasePrice: propertyData.purchasePrice || '0',
      currentValue: propertyData.currentValue || '0',
      monthlyRent: propertyData.monthlyRent || '0',
      expenses: propertyData.expenses || '0',
      mortgageBalance: propertyData.mortgageBalance || '0',
      notes: propertyData.notes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(properties).values(propertyRecord);
    });

    return propertyRecord;
  }

  async getPropertyById(id: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select().from(properties).where(eq(properties.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateProperty(id: string, updateData: any): Promise<any> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.update(properties)
        .set(updateRecord)
        .where(eq(properties.id, id));
    });

    return await this.getPropertyById(id);
  }

  async deleteProperty(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(properties).where(eq(properties.id, id));
    });

    return true;
  }

  async getAllProperties(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(properties).where(eq(properties.organizationId, organizationId));
      } else {
        return await db.select().from(properties);
      }
    });

    return result;
  }

  async getPropertiesWithStats(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(properties).where(eq(properties.organizationId, organizationId));
      } else {
        return await db.select().from(properties);
      }
    });

    return result;
  }

  // Unit management methods
  async createUnit(unitData: any): Promise<any> {
    const id = crypto.randomUUID();
    const unitRecord = {
      id,
      propertyId: unitData.propertyId,
      unitNumber: unitData.unitNumber,
      bedrooms: unitData.bedrooms || 1,
      bathrooms: unitData.bathrooms || 1,
      squareFootage: unitData.squareFootage || 0,
      rent: unitData.rent || '0',
      deposit: unitData.deposit || '0',
      isOccupied: false,
      tenantId: null,
      leaseStart: null,
      leaseEnd: null,
      notes: unitData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(units).values(unitRecord);
    });

    return unitRecord;
  }

  async getUnitById(id: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select().from(units).where(eq(units.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateUnit(id: string, updateData: any): Promise<any> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.update(units)
        .set(updateRecord)
        .where(eq(units.id, id));
    });

    return await this.getUnitById(id);
  }

  async deleteUnit(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(units).where(eq(units.id, id));
    });

    return true;
  }

  async getAllUnits(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select({
          id: units.id,
          propertyId: units.propertyId,
          unitNumber: units.unitNumber,
          bedrooms: units.bedrooms,
          bathrooms: units.bathrooms,
          squareFootage: units.squareFootage,
          rent: units.rent,
          deposit: units.deposit,
          isOccupied: units.isOccupied,
          tenantId: units.tenantId,
          leaseStart: units.leaseStart,
          leaseEnd: units.leaseEnd,
          notes: units.notes,
          createdAt: units.createdAt,
          updatedAt: units.updatedAt
        })
        .from(units)
        .leftJoin(properties, eq(units.propertyId, properties.id))
        .where(eq(properties.organizationId, organizationId));
      } else {
        return await db.select().from(units);
      }
    });

    return result;
  }

  // Tenant methods
  async createTenant(tenantData: any): Promise<any> {
    const id = crypto.randomUUID();
    const tenantRecord = {
      id,
      organizationId: tenantData.organizationId,
      firstName: tenantData.firstName,
      lastName: tenantData.lastName,
      email: tenantData.email,
      phone: tenantData.phone || null,
      unitId: tenantData.unitId,
      leaseStart: tenantData.leaseStart ? new Date(tenantData.leaseStart) : null,
      leaseEnd: tenantData.leaseEnd ? new Date(tenantData.leaseEnd) : null,
      rent: tenantData.rent || '0',
      deposit: tenantData.deposit || '0',
      emergencyContact: tenantData.emergencyContact || null,
      notes: tenantData.notes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(tenants).values(tenantRecord);
    });

    // Update unit occupancy
    if (tenantData.unitId) {
      await withRetry(async () => {
        return await db.update(units)
          .set({ 
            isOccupied: true, 
            tenantId: id,
            leaseStart: tenantData.leaseStart ? new Date(tenantData.leaseStart) : null,
            leaseEnd: tenantData.leaseEnd ? new Date(tenantData.leaseEnd) : null
          })
          .where(eq(units.id, tenantData.unitId));
      });
    }

    return tenantRecord;
  }

  async getTenantById(id: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select().from(tenants).where(eq(tenants.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateTenant(id: string, updateData: any): Promise<any> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    if (updateData.leaseStart) {
      updateRecord.leaseStart = new Date(updateData.leaseStart);
    }
    if (updateData.leaseEnd) {
      updateRecord.leaseEnd = new Date(updateData.leaseEnd);
    }

    await withRetry(async () => {
      return await db.update(tenants)
        .set(updateRecord)
        .where(eq(tenants.id, id));
    });

    return await this.getTenantById(id);
  }

  async deleteTenant(id: string): Promise<boolean> {
    // Get tenant info first
    const tenant = await this.getTenantById(id);
    
    if (tenant && tenant.unitId) {
      // Update unit occupancy
      await withRetry(async () => {
        return await db.update(units)
          .set({ 
            isOccupied: false, 
            tenantId: null,
            leaseStart: null,
            leaseEnd: null
          })
          .where(eq(units.id, tenant.unitId));
      });
    }

    await withRetry(async () => {
      return await db.delete(tenants).where(eq(tenants.id, id));
    });

    return true;
  }

  async getAllTenants(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(tenants).where(eq(tenants.organizationId, organizationId));
      } else {
        return await db.select().from(tenants);
      }
    });

    return result;
  }

  // Dashboard methods
  async getDashboardKPIs(organizationId?: string): Promise<any> {
    const [propertiesResult, unitsResult, tenantsResult] = await Promise.all([
      this.getAllProperties(organizationId),
      this.getAllUnits(organizationId),
      this.getAllTenants(organizationId)
    ]);

    const totalProperties = propertiesResult.length;
    const totalUnits = unitsResult.length;
    const occupiedUnits = unitsResult.filter(unit => unit.isOccupied).length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      occupancyRate: parseFloat(occupancyRate.toFixed(1))
    };
  }

  async getPaymentSummaries(organizationId?: string): Promise<any> {
    const rentPaymentsResult = await withRetry(async () => {
      if (organizationId) {
        return await db.select({
          amount: rentPayments.amount,
          status: rentPayments.status,
          dueDate: rentPayments.dueDate,
          paidDate: rentPayments.paidDate
        })
        .from(rentPayments)
        .leftJoin(tenants, eq(rentPayments.tenantId, tenants.id))
        .where(eq(tenants.organizationId, organizationId));
      } else {
        return await db.select({
          amount: rentPayments.amount,
          status: rentPayments.status,
          dueDate: rentPayments.dueDate,
          paidDate: rentPayments.paidDate
        }).from(rentPayments);
      }
    });

    const totalRevenue = rentPaymentsResult
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthRevenue = rentPaymentsResult
      .filter(payment => {
        if (payment.status !== 'paid' || !payment.paidDate) return false;
        const paidDate = new Date(payment.paidDate);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const overduePayments = rentPaymentsResult
      .filter(payment => {
        if (payment.status === 'paid') return false;
        const dueDate = new Date(payment.dueDate);
        return dueDate < new Date();
      })
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    return {
      totalRevenue,
      currentMonthRevenue,
      overduePayments
    };
  }

  // Rent payment methods
  async createRentPayment(paymentData: any): Promise<any> {
    const id = crypto.randomUUID();
    const paymentRecord = {
      id,
      tenantId: paymentData.tenantId,
      unitId: paymentData.unitId,
      amount: paymentData.amount,
      dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : new Date(),
      paidDate: paymentData.paidDate ? new Date(paymentData.paidDate) : null,
      status: paymentData.status || 'pending',
      paymentMethod: paymentData.paymentMethod || null,
      notes: paymentData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(rentPayments).values(paymentRecord);
    });

    return paymentRecord;
  }

  async getRentPaymentById(id: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select().from(rentPayments).where(eq(rentPayments.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateRentPayment(id: string, updateData: any): Promise<any> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    if (updateData.dueDate) {
      updateRecord.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.paidDate) {
      updateRecord.paidDate = new Date(updateData.paidDate);
    }

    await withRetry(async () => {
      return await db.update(rentPayments)
        .set(updateRecord)
        .where(eq(rentPayments.id, id));
    });

    return await this.getRentPaymentById(id);
  }

  async deleteRentPayment(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(rentPayments).where(eq(rentPayments.id, id));
    });

    return true;
  }

  async getAllRentPayments(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select({
          id: rentPayments.id,
          tenantId: rentPayments.tenantId,
          unitId: rentPayments.unitId,
          amount: rentPayments.amount,
          dueDate: rentPayments.dueDate,
          paidDate: rentPayments.paidDate,
          status: rentPayments.status,
          paymentMethod: rentPayments.paymentMethod,
          notes: rentPayments.notes,
          createdAt: rentPayments.createdAt,
          updatedAt: rentPayments.updatedAt
        })
        .from(rentPayments)
        .leftJoin(tenants, eq(rentPayments.tenantId, tenants.id))
        .where(eq(tenants.organizationId, organizationId));
      } else {
        return await db.select().from(rentPayments);
      }
    });

    return result;
  }

  // Expense methods
  async createExpense(expenseData: any): Promise<any> {
    const id = crypto.randomUUID();
    const expenseRecord = {
      id,
      organizationId: expenseData.organizationId,
      propertyId: expenseData.propertyId,
      category: expenseData.category,
      amount: expenseData.amount,
      description: expenseData.description,
      date: expenseData.date ? new Date(expenseData.date) : new Date(),
      vendor: expenseData.vendor || null,
      isRecurring: expenseData.isRecurring || false,
      recurringFrequency: expenseData.recurringFrequency || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await withRetry(async () => {
      return await db.insert(expenses).values(expenseRecord);
    });

    return expenseRecord;
  }

  async getExpenseById(id: string): Promise<any> {
    const result = await withRetry(async () => {
      return await db.select().from(expenses).where(eq(expenses.id, id));
    });

    return result.length > 0 ? result[0] : null;
  }

  async updateExpense(id: string, updateData: any): Promise<any> {
    const updateRecord = {
      ...updateData,
      updatedAt: new Date()
    };

    if (updateData.date) {
      updateRecord.date = new Date(updateData.date);
    }

    await withRetry(async () => {
      return await db.update(expenses)
        .set(updateRecord)
        .where(eq(expenses.id, id));
    });

    return await this.getExpenseById(id);
  }

  async deleteExpense(id: string): Promise<boolean> {
    await withRetry(async () => {
      return await db.delete(expenses).where(eq(expenses.id, id));
    });

    return true;
  }

  async getAllExpenses(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select().from(expenses).where(eq(expenses.organizationId, organizationId));
      } else {
        return await db.select().from(expenses);
      }
    });

    return result;
  }

  async getExpensesByCategory(organizationId?: string): Promise<any[]> {
    const result = await withRetry(async () => {
      if (organizationId) {
        return await db.select({
          category: expenses.category,
          amount: sql`SUM(${expenses.amount})`.as('amount'),
          count: sql`COUNT(*)`.as('count')
        })
        .from(expenses)
        .where(eq(expenses.organizationId, organizationId))
        .groupBy(expenses.category);
      } else {
        return await db.select({
          category: expenses.category,
          amount: sql`SUM(${expenses.amount})`.as('amount'),
          count: sql`COUNT(*)`.as('count')
        })
        .from(expenses)
        .groupBy(expenses.category);
      }
    });

    // Calculate percentages
    const total = result.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    return result.map(item => ({
      category: item.category,
      amount: parseFloat(item.amount),
      count: parseInt(item.count),
      percentage: total > 0 ? (parseFloat(item.amount) / total) * 100 : 0
    }));
  }
}

export const storage = new Storage();