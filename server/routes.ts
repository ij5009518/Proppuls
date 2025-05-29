import express, { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export function registerRoutes(app: Express) {
  // Create HTTP server
  const server = createServer(app);

  // Add a basic API route for testing
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Add other API routes here as needed
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      console.log("Routes: Received property creation request:", req.body);
      const property = await storage.createProperty(req.body);
      console.log("Routes: Property created successfully:", property);
      res.json(property);
    } catch (error) {
      console.error("Routes: Error creating property:", error);
      console.error("Routes: Error details:", error.message);
      console.error("Routes: Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create property",
        error: error.message 
      });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const property = await storage.updateProperty(id, req.body);
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteProperty(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Units routes
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const unit = await storage.createUnit(req.body);
      res.json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.patch("/api/units/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const unit = await storage.updateUnit(id, req.body);
      res.json(unit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteUnit(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // Mortgages routes
  app.get("/api/mortgages", async (req, res) => {
    try {
      const mortgages = await storage.getAllMortgages();
      res.json(mortgages);
    } catch (error) {
      console.error("Error fetching mortgages:", error);
      res.status(500).json({ message: "Failed to fetch mortgages" });
    }
  });

  app.post("/api/mortgages", async (req, res) => {
    try {
      const mortgage = await storage.createMortgage(req.body);
      res.json(mortgage);
    } catch (error) {
      console.error("Error creating mortgage:", error);
      res.status(500).json({ message: "Failed to create mortgage" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const expense = await storage.updateExpense(id, req.body);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteExpense(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Tenants routes
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      console.log("Routes: Received tenant creation request:", req.body);
      const tenant = await storage.createTenant(req.body);
      console.log("Routes: Tenant created successfully:", tenant);
      res.json(tenant);
    } catch (error) {
      console.error("Routes: Error creating tenant:", error);
      console.error("Routes: Error details:", error.message);
      console.error("Routes: Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create tenant",
        error: error.message 
      });
    }
  });

  app.put("/api/tenants/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenant = await storage.updateTenant(id, req.body);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteTenant(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Rent Payments routes
  app.get("/api/rent-payments", async (req, res) => {
    try {
      const rentPayments = await storage.getAllRentPayments();
      res.json(rentPayments);
    } catch (error) {
      console.error("Error fetching rent payments:", error);
      res.status(500).json({ message: "Failed to fetch rent payments" });
    }
  });

  app.post("/api/rent-payments", async (req, res) => {
    try {
      const payment = await storage.createRentPayment(req.body);
      res.json(payment);
    } catch (error) {
      console.error("Error creating rent payment:", error);
      res.status(500).json({ message: "Failed to create rent payment" });
    }
  });

  app.put("/api/rent-payments/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const payment = await storage.updateRentPayment(id, req.body);
      res.json(payment);
    } catch (error) {
      console.error("Error updating rent payment:", error);
      res.status(500).json({ message: "Failed to update rent payment" });
    }
  });

  app.delete("/api/rent-payments/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteRentPayment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rent payment:", error);
      res.status(500).json({ message: "Failed to delete rent payment" });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Vendors routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Maintenance requests routes
  app.get("/api/maintenance-requests", async (req, res) => {
    try {
      const requests = await storage.getAllMaintenanceRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ message: "Failed to fetch maintenance requests" });
    }
  });

  app.post("/api/maintenance-requests", async (req, res) => {
    try {
      const request = await storage.createMaintenanceRequest(req.body);
      res.json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      res.status(500).json({ message: "Failed to create maintenance request" });
    }
  });

  // Dashboard KPIs route
  app.get("/api/dashboard/kpis", async (req, res) => {
    try {
      // Mock KPI data for now
      const kpis = {
        totalProperties: 0,
        totalUnits: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
        maintenanceRequests: 0,
        pendingRequests: 0
      };
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Properties with stats route
  app.get("/api/properties/with-stats", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties with stats:", error);
      res.status(500).json({ message: "Failed to fetch properties with stats" });
    }
  });

  // Monthly revenues route
  app.get("/api/revenues/monthly", async (req, res) => {
    try {
      // Mock monthly revenue data
      const monthlyRevenues = [];
      res.json(monthlyRevenues);
    } catch (error) {
      console.error("Error fetching monthly revenues:", error);
      res.status(500).json({ message: "Failed to fetch monthly revenues" });
    }
  });

  // Expenses by category route
  app.get("/api/expenses/by-category", async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses by category:", error);
      res.status(500).json({ message: "Failed to fetch expenses by category" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const task = await storage.updateTask(id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteTask(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'tenant',
        phone: phone || null,
      });

      // Create session token
      const token = crypto.randomBytes(32).toString('hex');
      await storage.createSession(token, user);

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session token
      const token = crypto.randomBytes(32).toString('hex');
      await storage.createSession(token, user);

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  return server;
}