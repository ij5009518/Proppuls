import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, requireRole, optionalAuth, type AuthenticatedRequest } from "./auth";
import { insertPropertySchema, insertUnitSchema, insertTenantSchema, insertMortgageSchema, insertExpenseSchema, insertVendorSchema, insertMaintenanceRequestSchema, insertRevenueSchema, insertUserSchema, loginSchema, insertRentPaymentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    console.log("=== POST /api/auth/register endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      // Validate the input data (password will be transformed to passwordHash in storage)
      const inputData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(inputData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
      }
      
      const user = await storage.createUser(inputData);
      const session = await storage.createSession(user.id);
      
      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      
      res.status(201).json({
        user: userResponse,
        token: session.id,
      });
    } catch (error: any) {
      console.error("=== ERROR in user registration ===");
      console.error("Error details:", error);
      res.status(400).json({ 
        message: "Invalid user data", 
        error: error?.message || String(error),
        details: error?.issues || error
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    console.log("=== POST /api/auth/login endpoint hit ===");
    console.log("Request body:", JSON.stringify({ email: req.body.email }, null, 2));
    
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.validateUser(credentials);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const session = await storage.createSession(user.id);
      
      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      
      res.json({
        user: userResponse,
        token: session.id,
      });
    } catch (error: any) {
      console.error("=== ERROR in user login ===");
      console.error("Error details:", error);
      res.status(400).json({ 
        message: "Invalid login data", 
        error: error?.message || String(error)
      });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session) {
        await storage.deleteSession(req.session.id);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { passwordHash, ...userResponse } = req.user;
      res.json({ user: userResponse });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // Users management (admin only)
  app.get("/api/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersResponse = users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Apply authentication middleware to all protected routes
  app.use("/api/properties", authenticateToken);
  app.use("/api/units", authenticateToken);
  app.use("/api/tenants", authenticateToken);
  app.use("/api/mortgages", authenticateToken);
  app.use("/api/expenses", authenticateToken);
  app.use("/api/vendors", authenticateToken);
  app.use("/api/maintenance-requests", authenticateToken);
  app.use("/api/revenues", authenticateToken);
  app.use("/api/dashboard", authenticateToken);
  app.use("/api/export", authenticateToken);

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/with-stats", async (req, res) => {
    try {
      const properties = await storage.getPropertiesWithStats();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties with stats" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    console.log("=== POST /api/properties endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      console.log("Schema validation passed:", propertyData);
      const property = await storage.createProperty(propertyData);
      console.log("Property created successfully:", property);
      res.status(201).json(property);
    } catch (error: any) {
      console.error("=== ERROR in property creation ===");
      console.error("Error details:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      res.status(400).json({ 
        message: "Invalid property data", 
        error: error?.message || String(error),
        details: error?.issues || error
      });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, propertyData);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProperty(id);
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Units
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.get("/api/properties/:propertyId/units", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const units = await storage.getUnitsByProperty(propertyId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.post("/api/units", async (req, res) => {
    console.log("=== POST /api/units endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const unitData = insertUnitSchema.parse(req.body);
      console.log("Unit schema validation passed:", unitData);
      const unit = await storage.createUnit(unitData);
      console.log("Unit created successfully:", unit);
      res.status(201).json(unit);
    } catch (error: any) {
      console.error("=== ERROR in unit creation ===");
      console.error("Error details:", error);
      console.error("Error message:", error?.message);
      res.status(400).json({ 
        message: "Invalid unit data", 
        error: error?.message || String(error),
        details: error?.issues || error
      });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const unitData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(id, unitData);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(400).json({ message: "Invalid unit data" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    console.log("=== DELETE /api/units/:id endpoint hit ===");
    console.log("Unit ID to delete:", req.params.id);
    
    try {
      const id = parseInt(req.params.id);
      console.log("Deleting unit with ID:", id);
      const deleted = await storage.deleteUnit(id);
      console.log("Delete result:", deleted);
      
      if (!deleted) {
        console.log("Unit not found for deletion");
        return res.status(404).json({ message: "Unit not found" });
      }
      
      console.log("Unit deleted successfully");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // Tenants
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    console.log("=== POST /api/tenants endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      console.log("Tenant schema validation passed:", tenantData);
      const tenant = await storage.createTenant(tenantData);
      console.log("Tenant created successfully:", tenant);
      res.status(201).json(tenant);
    } catch (error: any) {
      console.error("=== ERROR in tenant creation ===");
      console.error("Error details:", error);
      console.error("Error message:", error?.message);
      res.status(400).json({ 
        message: "Invalid tenant data", 
        error: error?.message || String(error),
        details: error?.issues || error
      });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTenant(id);
      if (!deleted) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Rent Payments
  app.get("/api/rent-payments", async (req, res) => {
    try {
      const payments = await storage.getRentPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rent payments" });
    }
  });

  app.get("/api/rent-payments/tenant/:tenantId", async (req, res) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const payments = await storage.getRentPaymentsByTenant(tenantId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenant payments" });
    }
  });

  app.get("/api/rent-payments/overdue", async (req, res) => {
    try {
      const overduePayments = await storage.getOverdueRentPayments();
      res.json(overduePayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue payments" });
    }
  });

  app.post("/api/rent-payments", async (req, res) => {
    console.log("=== POST /api/rent-payments endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const paymentData = insertRentPaymentSchema.parse(req.body);
      console.log("Payment schema validation passed:", paymentData);
      const payment = await storage.createRentPayment(paymentData);
      console.log("Payment created successfully:", payment);
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("=== ERROR in payment creation ===");
      console.error("Error details:", error);
      res.status(400).json({ 
        message: "Invalid payment data", 
        error: error?.message || String(error),
        details: error?.issues || error
      });
    }
  });

  app.put("/api/rent-payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paymentData = insertRentPaymentSchema.partial().parse(req.body);
      const payment = await storage.updateRentPayment(id, paymentData);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  app.delete("/api/rent-payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRentPayment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // Mortgages
  app.get("/api/mortgages", async (req, res) => {
    try {
      const mortgages = await storage.getMortgages();
      res.json(mortgages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mortgages" });
    }
  });

  app.post("/api/mortgages", async (req, res) => {
    console.log("=== POST /api/mortgages endpoint hit ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const mortgageData = insertMortgageSchema.parse(req.body);
      console.log("Schema validation passed:", mortgageData);
      const mortgage = await storage.createMortgage(mortgageData);
      console.log("Mortgage created successfully:", mortgage);
      res.status(201).json(mortgage);
    } catch (error: any) {
      console.error("=== ERROR in mortgage creation ===");
      console.error("Error details:", error);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ message: "Invalid mortgage data", error: error.message });
    }
  });

  app.delete("/api/mortgages/:id", async (req, res) => {
    console.log("=== DELETE /api/mortgages/:id endpoint hit ===");
    console.log("Mortgage ID to delete:", req.params.id);
    
    try {
      const id = parseInt(req.params.id);
      console.log("Deleting mortgage with ID:", id);
      const deleted = await storage.deleteMortgage(id);
      console.log("Delete result:", deleted);
      
      if (!deleted) {
        console.log("Mortgage not found");
        return res.status(404).json({ message: "Mortgage not found" });
      }
      
      console.log("Mortgage deleted successfully");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mortgage:", error);
      res.status(500).json({ message: "Failed to delete mortgage" });
    }
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/by-category", async (req, res) => {
    try {
      const expensesByCategory = await storage.getExpensesByCategory();
      res.json(expensesByCategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses by category" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  // Vendors
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ message: "Invalid vendor data" });
    }
  });

  // Maintenance Requests
  app.get("/api/maintenance-requests", async (req, res) => {
    try {
      const requests = await storage.getMaintenanceRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance requests" });
    }
  });

  app.post("/api/maintenance-requests", async (req, res) => {
    try {
      console.log("Maintenance request data received:", req.body);
      const requestData = insertMaintenanceRequestSchema.parse(req.body);
      const request = await storage.createMaintenanceRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      console.log("Validation error:", error);
      res.status(400).json({ message: "Invalid maintenance request data" });
    }
  });

  // Revenues
  app.get("/api/revenues", async (req, res) => {
    try {
      const revenues = await storage.getRevenues();
      res.json(revenues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenues" });
    }
  });

  app.get("/api/revenues/monthly", async (req, res) => {
    try {
      const monthlyData = await storage.getMonthlyRevenueData();
      res.json(monthlyData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly revenue data" });
    }
  });

  app.post("/api/revenues", async (req, res) => {
    try {
      const revenueData = insertRevenueSchema.parse(req.body);
      const revenue = await storage.createRevenue(revenueData);
      res.status(201).json(revenue);
    } catch (error) {
      res.status(400).json({ message: "Invalid revenue data" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/kpis", async (req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard KPIs" });
    }
  });

  // Export functionality
  app.get("/api/export/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      const csvData = expenses.map(expense => ({
        Date: expense.date.toISOString().split('T')[0],
        Category: expense.category,
        Description: expense.description,
        Amount: expense.amount,
        'QBO Category': expense.qboCategory || '',
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
      
      const csvHeader = Object.keys(csvData[0]).join(',') + '\n';
      const csvRows = csvData.map(row => Object.values(row).join(',')).join('\n');
      res.send(csvHeader + csvRows);
    } catch (error) {
      res.status(500).json({ message: "Failed to export expenses" });
    }
  });

  app.get("/api/export/revenues", async (req, res) => {
    try {
      const revenues = await storage.getRevenues();
      const csvData = revenues.map(revenue => ({
        Date: revenue.date.toISOString().split('T')[0],
        Type: revenue.type,
        Description: revenue.description || '',
        Amount: revenue.amount,
        'Property ID': revenue.propertyId,
        'Unit ID': revenue.unitId || '',
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=revenues.csv');
      
      const csvHeader = Object.keys(csvData[0]).join(',') + '\n';
      const csvRows = csvData.map(row => Object.values(row).join(',')).join('\n');
      res.send(csvHeader + csvRows);
    } catch (error) {
      res.status(500).json({ message: "Failed to export revenues" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
