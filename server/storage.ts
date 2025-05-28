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
} from "@shared/schema";

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

  // Mortgage Payments
  getMortgagePayments(mortgageId: number): Promise<MortgagePayment[]>;
  createMortgagePayment(payment: InsertMortgagePayment): Promise<MortgagePayment>;
  calculateAmortization(mortgageId: number): Promise<{ monthlyPrincipal: number; monthlyInterest: number; remainingBalance: number }>;

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

export class MemStorage implements IStorage {
  private properties: Map<number, Property> = new Map();
  private units: Map<number, Unit> = new Map();
  private tenants: Map<number, Tenant> = new Map();
  private mortgages: Map<number, Mortgage> = new Map();
  private mortgagePayments: Map<number, MortgagePayment> = new Map();
  private expenses: Map<number, Expense> = new Map();
  private vendors: Map<number, Vendor> = new Map();
  private maintenanceRequests: Map<number, MaintenanceRequest> = new Map();
  private revenues: Map<number, Revenue> = new Map();
  
  private propertyIdCounter = 1;
  private unitIdCounter = 1;
  private tenantIdCounter = 1;
  private mortgageIdCounter = 1;
  private expenseIdCounter = 1;
  private vendorIdCounter = 1;
  private maintenanceRequestIdCounter = 1;
  private revenueIdCounter = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Sample properties
    const property1: Property = {
      id: this.propertyIdCounter++,
      name: "Sunset Apartments",
      address: "123 Main St",
      city: "Downtown",
      state: "CA",
      zipCode: "90210",
      totalUnits: 24,
      purchasePrice: "850000.00",
      purchaseDate: new Date("2022-01-15"),
      propertyType: "apartment",
      status: "active",
    };

    const property2: Property = {
      id: this.propertyIdCounter++,
      name: "Oak Valley Condos",
      address: "456 Oak Ave",
      city: "Uptown",
      state: "CA",
      zipCode: "90211",
      totalUnits: 18,
      purchasePrice: "1200000.00",
      purchaseDate: new Date("2021-06-10"),
      propertyType: "condo",
      status: "active",
    };

    const property3: Property = {
      id: this.propertyIdCounter++,
      name: "Pine Ridge Townhomes",
      address: "789 Pine St",
      city: "Suburbs",
      state: "CA",
      zipCode: "90212",
      totalUnits: 12,
      purchasePrice: "950000.00",
      purchaseDate: new Date("2023-03-20"),
      propertyType: "townhome",
      status: "maintenance",
    };

    this.properties.set(property1.id, property1);
    this.properties.set(property2.id, property2);
    this.properties.set(property3.id, property3);

    // Sample units
    for (let i = 1; i <= 24; i++) {
      const unit: Unit = {
        id: this.unitIdCounter++,
        propertyId: property1.id,
        unitNumber: `${Math.floor((i - 1) / 8) + 1}${String.fromCharCode(65 + ((i - 1) % 8))}`,
        bedrooms: Math.floor(Math.random() * 3) + 1,
        bathrooms: Math.floor(Math.random() * 2) + 1,
        squareFootage: 800 + Math.floor(Math.random() * 400),
        rentAmount: "1200.00",
        status: Math.random() > 0.1 ? "occupied" : "vacant",
      };
      this.units.set(unit.id, unit);
    }

    // Sample vendors
    const vendor1: Vendor = {
      id: this.vendorIdCounter++,
      name: "Quick Fix Plumbing",
      contactPerson: "John Smith",
      email: "john@quickfixplumbing.com",
      phone: "(555) 123-4567",
      address: "123 Service St, City, CA 90210",
      serviceType: "plumbing",
      rating: 5,
      notes: "Reliable and professional service",
    };

    const vendor2: Vendor = {
      id: this.vendorIdCounter++,
      name: "Elite HVAC Services",
      contactPerson: "Sarah Johnson",
      email: "sarah@elitehvac.com",
      phone: "(555) 987-6543",
      address: "456 Industrial Blvd, City, CA 90211",
      serviceType: "hvac",
      rating: 4,
      notes: "Good pricing for commercial units",
    };

    this.vendors.set(vendor1.id, vendor1);
    this.vendors.set(vendor2.id, vendor2);

    // Sample maintenance requests
    const maintenance1: MaintenanceRequest = {
      id: this.maintenanceRequestIdCounter++,
      unitId: 1,
      tenantId: null,
      title: "HVAC System Failure",
      description: "Air conditioning unit not working properly",
      priority: "urgent",
      status: "open",
      submittedDate: new Date(),
      completedDate: null,
      vendorId: vendor2.id,
      laborCost: null,
      materialCost: null,
      notes: "Urgent repair needed",
    };

    this.maintenanceRequests.set(maintenance1.id, maintenance1);

    // Sample expenses
    const expense1: Expense = {
      id: this.expenseIdCounter++,
      propertyId: property1.id,
      unitId: null,
      category: "maintenance",
      description: "HVAC maintenance",
      amount: "3240.00",
      date: new Date(),
      vendorId: vendor2.id,
      isRecurring: false,
      qboCategory: "Repairs & Maintenance",
    };

    this.expenses.set(expense1.id, expense1);

    // Sample revenues
    const revenue1: Revenue = {
      id: this.revenueIdCounter++,
      propertyId: property1.id,
      unitId: 1,
      tenantId: 1,
      type: "rent",
      amount: "1200.00",
      date: new Date(),
      description: "Monthly rent payment",
    };

    this.revenues.set(revenue1.id, revenue1);
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = { ...property, id: this.propertyIdCounter++ };
    this.properties.set(newProperty.id, newProperty);
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const existing = this.properties.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...property };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: number): Promise<boolean> {
    return this.properties.delete(id);
  }

  // Units
  async getUnits(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }

  async getUnitsByProperty(propertyId: number): Promise<Unit[]> {
    return Array.from(this.units.values()).filter(unit => unit.propertyId === propertyId);
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    return this.units.get(id);
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const newUnit: Unit = { ...unit, id: this.unitIdCounter++ };
    this.units.set(newUnit.id, newUnit);
    return newUnit;
  }

  async updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined> {
    const existing = this.units.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...unit };
    this.units.set(id, updated);
    return updated;
  }

  async deleteUnit(id: number): Promise<boolean> {
    return this.units.delete(id);
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const newTenant: Tenant = { ...tenant, id: this.tenantIdCounter++ };
    this.tenants.set(newTenant.id, newTenant);
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const existing = this.tenants.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...tenant };
    this.tenants.set(id, updated);
    return updated;
  }

  async deleteTenant(id: number): Promise<boolean> {
    return this.tenants.delete(id);
  }

  // Mortgages
  async getMortgages(): Promise<Mortgage[]> {
    return Array.from(this.mortgages.values());
  }

  async getMortgagesByProperty(propertyId: number): Promise<Mortgage[]> {
    return Array.from(this.mortgages.values()).filter(mortgage => mortgage.propertyId === propertyId);
  }

  async getMortgage(id: number): Promise<Mortgage | undefined> {
    return this.mortgages.get(id);
  }

  async createMortgage(mortgage: InsertMortgage): Promise<Mortgage> {
    const newMortgage: Mortgage = { ...mortgage, id: this.mortgageIdCounter++ };
    this.mortgages.set(newMortgage.id, newMortgage);
    return newMortgage;
  }

  async updateMortgage(id: number, mortgage: Partial<InsertMortgage>): Promise<Mortgage | undefined> {
    const existing = this.mortgages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...mortgage };
    this.mortgages.set(id, updated);
    return updated;
  }

  async deleteMortgage(id: number): Promise<boolean> {
    console.log("Storage: attempting to delete mortgage with ID:", id);
    console.log("Storage: mortgages before deletion:", Array.from(this.mortgages.keys()));
    const result = this.mortgages.delete(id);
    console.log("Storage: deletion result:", result);
    console.log("Storage: mortgages after deletion:", Array.from(this.mortgages.keys()));
    return result;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpensesByProperty(propertyId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.propertyId === propertyId);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const newExpense: Expense = { ...expense, id: this.expenseIdCounter++ };
    this.expenses.set(newExpense.id, newExpense);
    return newExpense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existing = this.expenses.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...expense };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const newVendor: Vendor = { ...vendor, id: this.vendorIdCounter++ };
    this.vendors.set(newVendor.id, newVendor);
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const existing = this.vendors.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...vendor };
    this.vendors.set(id, updated);
    return updated;
  }

  async deleteVendor(id: number): Promise<boolean> {
    return this.vendors.delete(id);
  }

  // Maintenance Requests
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return Array.from(this.maintenanceRequests.values());
  }

  async getMaintenanceRequestsByProperty(propertyId: number): Promise<MaintenanceRequest[]> {
    const propertyUnits = await this.getUnitsByProperty(propertyId);
    const unitIds = propertyUnits.map(unit => unit.id);
    return Array.from(this.maintenanceRequests.values()).filter(request => 
      unitIds.includes(request.unitId)
    );
  }

  async getMaintenanceRequest(id: number): Promise<MaintenanceRequest | undefined> {
    return this.maintenanceRequests.get(id);
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const newRequest: MaintenanceRequest = { ...request, id: this.maintenanceRequestIdCounter++ };
    this.maintenanceRequests.set(newRequest.id, newRequest);
    return newRequest;
  }

  async updateMaintenanceRequest(id: number, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const existing = this.maintenanceRequests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...request };
    this.maintenanceRequests.set(id, updated);
    return updated;
  }

  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    return this.maintenanceRequests.delete(id);
  }

  // Revenues
  async getRevenues(): Promise<Revenue[]> {
    return Array.from(this.revenues.values());
  }

  async getRevenuesByProperty(propertyId: number): Promise<Revenue[]> {
    return Array.from(this.revenues.values()).filter(revenue => revenue.propertyId === propertyId);
  }

  async getRevenue(id: number): Promise<Revenue | undefined> {
    return this.revenues.get(id);
  }

  async createRevenue(revenue: InsertRevenue): Promise<Revenue> {
    const newRevenue: Revenue = { ...revenue, id: this.revenueIdCounter++ };
    this.revenues.set(newRevenue.id, newRevenue);
    return newRevenue;
  }

  async updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const existing = this.revenues.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...revenue };
    this.revenues.set(id, updated);
    return updated;
  }

  async deleteRevenue(id: number): Promise<boolean> {
    return this.revenues.delete(id);
  }

  // Dashboard and Analytics
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const revenues = await this.getRevenues();
    const totalRevenue = revenues.reduce((sum, rev) => sum + parseFloat(rev.amount), 0);
    
    const properties = await this.getProperties();
    const units = await this.getUnits();
    const occupiedUnits = units.filter(unit => unit.status === "occupied").length;
    const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

    const maintenanceRequests = await this.getMaintenanceRequests();
    const pendingRequests = maintenanceRequests.filter(req => req.status === "open").length;

    return {
      totalRevenue: `$${totalRevenue.toLocaleString()}`,
      revenueChange: "+12.5%",
      totalProperties: properties.length,
      newProperties: 2,
      occupancyRate: `${occupancyRate.toFixed(1)}%`,
      occupancyChange: "+3.1%",
      maintenanceRequests: maintenanceRequests.length,
      pendingRequests,
    };
  }

  async getPropertiesWithStats(): Promise<PropertyWithStats[]> {
    const properties = await this.getProperties();
    const result: PropertyWithStats[] = [];

    for (const property of properties) {
      const units = await this.getUnitsByProperty(property.id);
      const occupiedUnits = units.filter(unit => unit.status === "occupied").length;
      const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;
      
      const revenues = await this.getRevenuesByProperty(property.id);
      const monthlyRevenue = revenues
        .filter(rev => rev.date.getMonth() === new Date().getMonth())
        .reduce((sum, rev) => sum + parseFloat(rev.amount), 0);

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
    const expenses = await this.getExpenses();
    const categoryTotals = new Map<string, number>();
    let totalAmount = 0;

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount);
      categoryTotals.set(expense.category, (categoryTotals.get(expense.category) || 0) + amount);
      totalAmount += amount;
    });

    return Array.from(categoryTotals.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }));
  }

  async getMonthlyRevenueData(): Promise<{ month: string; revenue: number }[]> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      revenue: 15000 + Math.random() * 5000, // Mock data for now
    }));
  }
}

export const storage = new MemStorage();
