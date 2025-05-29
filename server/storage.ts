
import { User } from '../shared/schema';

interface Session {
  token: string;
  user: User;
  createdAt: Date;
}

class Storage {
  private users: User[] = [];
  private sessions: Map<string, Session> = new Map();
  private properties: any[] = [];
  private units: any[] = [];
  private mortgages: any[] = [];
  private expenses: any[] = [];
  private tenants: any[] = [];
  private rentPayments: any[] = [];
  private nextUserId = 1;
  private nextPropertyId = 1;
  private nextUnitId = 1;
  private nextMortgageId = 1;
  private nextExpenseId = 1;
  private nextTenantId = 1;
  private nextRentPaymentId = 1;

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.nextUserId++,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
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

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // Properties
  async getProperties(): Promise<any[]> {
    return this.properties;
  }

  async createProperty(propertyData: any): Promise<any> {
    const property = {
      ...propertyData,
      id: this.nextPropertyId++,
      createdAt: new Date(),
    };
    this.properties.push(property);
    return property;
  }

  async updateProperty(id: number, updateData: any): Promise<any> {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Property not found');
    
    this.properties[index] = { ...this.properties[index], ...updateData };
    return this.properties[index];
  }

  async deleteProperty(id: number): Promise<void> {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Property not found');
    
    this.properties.splice(index, 1);
  }

  // Units
  async getUnits(): Promise<any[]> {
    return this.units;
  }

  async createUnit(unitData: any): Promise<any> {
    const unit = {
      ...unitData,
      id: this.nextUnitId++,
      createdAt: new Date(),
    };
    this.units.push(unit);
    return unit;
  }

  async updateUnit(id: number, updateData: any): Promise<any> {
    const index = this.units.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Unit not found');
    
    this.units[index] = { ...this.units[index], ...updateData };
    return this.units[index];
  }

  async deleteUnit(id: number): Promise<void> {
    const index = this.units.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Unit not found');
    
    this.units.splice(index, 1);
  }

  // Mortgages
  async getMortgages(): Promise<any[]> {
    return this.mortgages;
  }

  async createMortgage(mortgageData: any): Promise<any> {
    const mortgage = {
      ...mortgageData,
      id: this.nextMortgageId++,
      createdAt: new Date(),
    };
    this.mortgages.push(mortgage);
    return mortgage;
  }

  // Expenses
  async getExpenses(): Promise<any[]> {
    return this.expenses;
  }

  async createExpense(expenseData: any): Promise<any> {
    const expense = {
      ...expenseData,
      id: this.nextExpenseId++,
      createdAt: new Date(),
    };
    this.expenses.push(expense);
    return expense;
  }

  // Tenants
  async getTenants(): Promise<any[]> {
    return this.tenants;
  }

  async createTenant(tenantData: any): Promise<any> {
    const tenant = {
      ...tenantData,
      id: this.nextTenantId++,
      createdAt: new Date(),
    };
    this.tenants.push(tenant);
    return tenant;
  }

  // Rent Payments
  async getRentPayments(): Promise<any[]> {
    return this.rentPayments;
  }

  async createRentPayment(paymentData: any): Promise<any> {
    const payment = {
      ...paymentData,
      id: this.nextRentPaymentId++,
      createdAt: new Date(),
    };
    this.rentPayments.push(payment);
    return payment;
  }

  async updateRentPayment(id: number, updateData: any): Promise<any> {
    const index = this.rentPayments.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Rent payment not found');
    
    this.rentPayments[index] = { ...this.rentPayments[index], ...updateData };
    return this.rentPayments[index];
  }

  async deleteRentPayment(id: number): Promise<void> {
    const index = this.rentPayments.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Rent payment not found');
    
    this.rentPayments.splice(index, 1);
  }
}

export const storage = new Storage();
