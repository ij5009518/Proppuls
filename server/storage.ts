import { User } from '../shared/schema';
import { db, users, properties, expenses, units, tenants, maintenanceRequests, vendors, rentPayments, mortgages, tasks } from './db';
import { eq } from 'drizzle-orm';
import { Property, Expense, Unit, Tenant, MaintenanceRequest, Vendor, RentPayment, Mortgage, Task } from '../shared/schema';

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
    const [property] = await db.insert(properties).values({
      id: propertyData.id || crypto.randomUUID(),
      ...propertyData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return property;
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0] || null;
  }

  async updateProperty(id: string, propertyData: any): Promise<Property | null> {
    const [property] = await db.update(properties)
      .set({ ...propertyData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property || null;
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
    const [tenant] = await db.insert(tenants).values({
      id: tenantData.id || crypto.randomUUID(),
      ...tenantData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return tenant;
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
    return tenant || null;
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
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
    const [payment] = await db.insert(rentPayments).values({
      id: paymentData.id || crypto.randomUUID(),
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return payment;
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
    const [mortgage] = await db.insert(mortgages).values({
      id: mortgageData.id || crypto.randomUUID(),
      ...mortgageData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return mortgage;
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

  // Tenant methods
  async createTenant(tenantData: any): Promise<any> {
    const [tenant] = await db.insert(tenants).values({
      id: tenantData.id || crypto.randomUUID(),
      ...tenantData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return tenant;
  }

  async getAllTenants(): Promise<any[]> {
    return await db.select().from(tenants);
  }

  async getTenantById(id: string): Promise<any | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  }

  async updateTenant(id: string, tenantData: any): Promise<any | null> {
    const [tenant] = await db.update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant || null;
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new Storage();