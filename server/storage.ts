import {
  type Property,
  type InsertProperty,
  type Unit,
  type InsertUnit,
  type Tenant,
  type InsertTenant,
  type Mortgage,
  type InsertMortgage,
  type Expense,
  type InsertExpense,
  type Vendor,
  type InsertVendor,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type Revenue,
  type InsertRevenue,
  type DashboardKPIs,
  type PropertyWithStats,
  type ExpenseByCategory,
  properties,
  units,
  tenants,
  mortgages,
  expenses,
  vendors,
  maintenanceRequests,
  revenues,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Units
  getUnits(): Promise<Unit[]>;
  getUnitsByProperty(propertyId: number): Promise<Unit[]>;
  getUnit(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<boolean>;

  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<boolean>;

  // Mortgages
  getMortgages(): Promise<Mortgage[]>;
  getMortgagesByProperty(propertyId: number): Promise<Mortgage[]>;
  getMortgage(id: number): Promise<Mortgage | undefined>;
  createMortgage(mortgage: InsertMortgage): Promise<Mortgage>;
  updateMortgage(id: number, mortgage: Partial<InsertMortgage>): Promise<Mortgage | undefined>;
  deleteMortgage(id: number): Promise<boolean>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpensesByProperty(propertyId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;

  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Maintenance Requests
  getMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  getMaintenanceRequestsByProperty(propertyId: number): Promise<MaintenanceRequest[]>;
  getMaintenanceRequest(id: number): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: number, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: number): Promise<boolean>;

  // Revenues
  getRevenues(): Promise<Revenue[]>;
  getRevenuesByProperty(propertyId: number): Promise<Revenue[]>;
  getRevenue(id: number): Promise<Revenue | undefined>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined>;
  deleteRevenue(id: number): Promise<boolean>;

  // Dashboard and Analytics
  getDashboardKPIs(): Promise<DashboardKPIs>;
  getPropertiesWithStats(): Promise<PropertyWithStats[]>;
  getExpensesByCategory(): Promise<ExpenseByCategory[]>;
  getMonthlyRevenueData(): Promise<{ month: string; revenue: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Properties
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set(property).where(eq(properties.id, id)).returning();
    return updated || undefined;
  }

  async deleteProperty(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return result.rowCount > 0;
  }

  // Units
  async getUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async getUnitsByProperty(propertyId: number): Promise<Unit[]> {
    return await db.select().from(units).where(eq(units.propertyId, propertyId));
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [newUnit] = await db.insert(units).values(unit).returning();
    return newUnit;
  }

  async updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [updated] = await db.update(units).set(unit).where(eq(units.id, id)).returning();
    return updated || undefined;
  }

  async deleteUnit(id: number): Promise<boolean> {
    const result = await db.delete(units).where(eq(units.id, id));
    return result.rowCount > 0;
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(tenant).where(eq(tenants.id, id)).returning();
    return updated || undefined;
  }

  async deleteTenant(id: number): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return result.rowCount > 0;
  }

  // Mortgages
  async getMortgages(): Promise<Mortgage[]> {
    return await db.select().from(mortgages);
  }

  async getMortgagesByProperty(propertyId: number): Promise<Mortgage[]> {
    return await db.select().from(mortgages).where(eq(mortgages.propertyId, propertyId));
  }

  async getMortgage(id: number): Promise<Mortgage | undefined> {
    const [mortgage] = await db.select().from(mortgages).where(eq(mortgages.id, id));
    return mortgage || undefined;
  }

  async createMortgage(mortgage: InsertMortgage): Promise<Mortgage> {
    const [newMortgage] = await db.insert(mortgages).values(mortgage).returning();
    return newMortgage;
  }

  async updateMortgage(id: number, mortgage: Partial<InsertMortgage>): Promise<Mortgage | undefined> {
    const [updated] = await db.update(mortgages).set(mortgage).where(eq(mortgages.id, id)).returning();
    return updated || undefined;
  }

  async deleteMortgage(id: number): Promise<boolean> {
    const result = await db.delete(mortgages).where(eq(mortgages.id, id));
    return result.rowCount > 0;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpensesByProperty(propertyId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.propertyId, propertyId));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
    return updated || undefined;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return updated || undefined;
  }

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  // Maintenance Requests
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return await db.select().from(maintenanceRequests);
  }

  async getMaintenanceRequestsByProperty(propertyId: number): Promise<MaintenanceRequest[]> {
    return await db.select().from(maintenanceRequests)
      .innerJoin(units, eq(maintenanceRequests.unitId, units.id))
      .where(eq(units.propertyId, propertyId));
  }

  async getMaintenanceRequest(id: number): Promise<MaintenanceRequest | undefined> {
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return request || undefined;
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const [newRequest] = await db.insert(maintenanceRequests).values(request).returning();
    return newRequest;
  }

  async updateMaintenanceRequest(id: number, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const [updated] = await db.update(maintenanceRequests).set(request).where(eq(maintenanceRequests.id, id)).returning();
    return updated || undefined;
  }

  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    const result = await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return result.rowCount > 0;
  }

  // Revenues
  async getRevenues(): Promise<Revenue[]> {
    return await db.select().from(revenues);
  }

  async getRevenuesByProperty(propertyId: number): Promise<Revenue[]> {
    return await db.select().from(revenues).where(eq(revenues.propertyId, propertyId));
  }

  async getRevenue(id: number): Promise<Revenue | undefined> {
    const [revenue] = await db.select().from(revenues).where(eq(revenues.id, id));
    return revenue || undefined;
  }

  async createRevenue(revenue: InsertRevenue): Promise<Revenue> {
    const [newRevenue] = await db.insert(revenues).values(revenue).returning();
    return newRevenue;
  }

  async updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const [updated] = await db.update(revenues).set(revenue).where(eq(revenues.id, id)).returning();
    return updated || undefined;
  }

  async deleteRevenue(id: number): Promise<boolean> {
    const result = await db.delete(revenues).where(eq(revenues.id, id));
    return result.rowCount > 0;
  }

  // Dashboard and Analytics
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const totalRevenueResult = await db.select({ 
      total: sql<number>`COALESCE(SUM(${revenues.amount}::numeric), 0)`
    }).from(revenues);
    
    const totalPropertiesResult = await db.select({ 
      count: sql<number>`COUNT(*)`
    }).from(properties);
    
    const totalUnitsResult = await db.select({ 
      count: sql<number>`COUNT(*)`
    }).from(units);
    
    const occupiedUnitsResult = await db.select({ 
      count: sql<number>`COUNT(*)`
    }).from(units).where(eq(units.status, 'occupied'));
    
    const pendingRequestsResult = await db.select({ 
      count: sql<number>`COUNT(*)`
    }).from(maintenanceRequests).where(eq(maintenanceRequests.status, 'open'));

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const totalProperties = totalPropertiesResult[0]?.count || 0;
    const totalUnits = totalUnitsResult[0]?.count || 0;
    const occupiedUnits = occupiedUnitsResult[0]?.count || 0;
    const pendingRequests = pendingRequestsResult[0]?.count || 0;

    const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0.0";

    return {
      totalRevenue: `$${totalRevenue.toLocaleString()}`,
      revenueChange: "+12%",
      totalProperties,
      newProperties: 2,
      occupancyRate: `${occupancyRate}%`,
      occupancyChange: "+5%",
      maintenanceRequests: pendingRequests,
      pendingRequests,
    };
  }

  async getPropertiesWithStats(): Promise<PropertyWithStats[]> {
    const propertiesList = await this.getProperties();
    const result: PropertyWithStats[] = [];

    for (const property of propertiesList) {
      const propertyUnits = await this.getUnitsByProperty(property.id);
      const occupiedUnits = propertyUnits.filter(unit => unit.status === 'occupied').length;
      const occupancyRate = propertyUnits.length > 0 ? 
        Math.round((occupiedUnits / propertyUnits.length) * 100) : 0;
      
      const propertyRevenues = await this.getRevenuesByProperty(property.id);
      const monthlyRevenue = propertyRevenues.reduce((sum, revenue) => {
        return sum + parseFloat(revenue.amount);
      }, 0);

      result.push({
        ...property,
        occupancyRate,
        monthlyRevenue,
        occupiedUnits,
      });
    }

    return result;
  }

  async getExpensesByCategory(): Promise<ExpenseByCategory[]> {
    const result = await db.select({
      category: expenses.category,
      total: sql<number>`SUM(${expenses.amount}::numeric)`
    }).from(expenses).groupBy(expenses.category);

    const totalExpenses = result.reduce((sum, row) => sum + row.total, 0);

    return result.map(row => ({
      category: row.category,
      amount: row.total,
      percentage: totalExpenses > 0 ? Math.round((row.total / totalExpenses) * 100) : 0,
    }));
  }

  async getMonthlyRevenueData(): Promise<{ month: string; revenue: number }[]> {
    const result = await db.select({
      month: sql<string>`TO_CHAR(${revenues.date}, 'Mon YYYY')`,
      revenue: sql<number>`SUM(${revenues.amount}::numeric)`
    }).from(revenues)
    .groupBy(sql`TO_CHAR(${revenues.date}, 'Mon YYYY')`)
    .orderBy(sql`MIN(${revenues.date})`);

    return result.map(row => ({
      month: row.month,
      revenue: row.revenue,
    }));
  }
}

export const storage = new DatabaseStorage();