import express, { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { emailService } from "./email";
import Stripe from "stripe";
import { AuthenticatedRequest, authenticateToken } from "./auth";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export function registerRoutes(app: Express) {
  
  // User authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Try to authenticate with registered users first
      const user = await storage.getUserByEmail(email);
      if (user && user.password && await bcrypt.compare(password, user.password)) {
        const token = crypto.randomBytes(32).toString('hex');
        await storage.createSession(token, user);
        
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId
          }
        });
        return;
      }

      // Always use demo-org-1 for demo login
      if (email === "admin@propertyflow.com" && password === "admin123") {
        const defaultUser = {
          id: "demo-user-1",
          email: "admin@propertyflow.com",
          firstName: "Admin",
          lastName: "User",
          role: "admin" as const,
          organizationId: "demo-org-1",
          phone: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const token = crypto.randomBytes(32).toString('hex');
        await storage.createSession(token, defaultUser);
        
        console.log("Demo login successful for organization:", defaultUser.organizationId);
        
        res.json({
          success: true,
          token,
          user: {
            id: defaultUser.id,
            email: defaultUser.email,
            firstName: defaultUser.firstName,
            lastName: defaultUser.lastName,
            role: defaultUser.role,
            organizationId: defaultUser.organizationId
          }
        });
      } else {
        res.status(401).json({ message: "Invalid email or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Forgot Password Route
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log("Password reset requested for:", email);

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, we've sent a password reset link." 
        });
      }

      // Create password reset token
      const resetToken = await storage.createPasswordResetToken(email);
      
      // Send reset email
      console.log("Attempting to send password reset email to:", email);
      const emailSent = await emailService.sendPasswordResetEmail(
        email, 
        user.firstName, 
        resetToken
      );

      if (!emailSent) {
        console.error("Failed to send password reset email to:", email);
        return res.status(500).json({ message: "Failed to send reset email. Please check your email configuration." });
      }

      console.log("Password reset email sent successfully to:", email);

      res.json({ 
        success: true, 
        message: "If an account with that email exists, we've sent a password reset link." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset Password Route
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Validate reset token
      const resetData = await storage.validatePasswordResetToken(token);
      if (!resetData) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      const updated = await storage.updateUserPassword(resetData.email, hashedPassword);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetData.id);

      // Get user info for confirmation email
      const user = await storage.getUserByEmail(resetData.email);
      if (user) {
        // Send confirmation email
        await emailService.sendPasswordResetConfirmation(resetData.email, user.firstName);
      }

      console.log("Password successfully reset for:", resetData.email);

      res.json({ 
        success: true, 
        message: "Password has been reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate Reset Token Route
  app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const resetData = await storage.validatePasswordResetToken(token);
      if (!resetData) {
        return res.status(400).json({ 
          valid: false, 
          message: "Invalid or expired reset token" 
        });
      }

      res.json({ 
        valid: true, 
        email: resetData.email 
      });
    } catch (error) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    // Set 15 second timeout for registration
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ 
          message: "Registration timeout - please try again", 
          error: "Database connection timeout" 
        });
      }
    }, 15000);

    try {
      const { email, password, firstName, lastName, role, phone } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        clearTimeout(timeoutId);
        return res.status(400).json({ message: "Required fields missing" });
      }

      // Check if user already exists with timeout
      const existingUser = await Promise.race([
        storage.getUserByEmail(email),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 10000)
        )
      ]);
      
      if (existingUser) {
        clearTimeout(timeoutId);
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new organization for this user
      const organizationName = `${firstName} ${lastName}'s Organization`;
      const organization = await storage.createOrganization({
        name: organizationName,
        domain: null,
        plan: 'starter',
        status: 'active',
        maxUsers: 10,
        maxProperties: 50,
        monthlyPrice: 19,
        settings: {}
      });

      // Create user with new organization - with all required fields
      const userId = crypto.randomUUID();
      const user = await storage.createUser({
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        phone: phone || null,
        organizationId: organization.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send welcome email
      try {
        const { emailService } = await import('./email');
        await emailService.sendWelcomeEmail(
          email, 
          `${firstName} ${lastName}`, 
          organizationName,
          'New Account'
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail registration if email fails
      }

      // Create session token
      const token = crypto.randomBytes(32).toString('hex');
      await storage.createSession(token, user);

      clearTimeout(timeoutId);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role,
          organizationId: user.organizationId
        } 
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Registration error:", error);
      
      if (!res.headersSent) {
        const message = error.message?.includes('timeout') || error.message?.includes('Control plane') 
          ? "Registration timeout - please try again in a few moments" 
          : "Registration failed";
        
        res.status(500).json({ 
          message, 
          error: error.message 
        });
      }
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });
  // Create HTTP server
  const server = createServer(app);

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for ID document photos
  });

  // Add a basic API route for testing
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Email routes
  app.post("/api/emails/send-rent-reminder", async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!tenant.unitId) {
        return res.status(400).json({ message: "Tenant must be assigned to a unit before sending rent reminders" });
      }

      const unit = await storage.getUnitById(tenant.unitId);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      const property = await storage.getPropertyById(unit.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const emailData = {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitNumber: unit.name,
        propertyName: property.name,
        amount: parseFloat(tenant.monthlyRent || "0"),
        dueDate: new Date().toLocaleDateString()
      };

      const success = await emailService.sendRentReminder(tenant.email, emailData);
      
      if (success) {
        res.json({ message: "Rent reminder sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending rent reminder:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/emails/send-welcome", async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!tenant.unitId) {
        return res.status(400).json({ message: "Tenant must be assigned to a unit before sending welcome emails" });
      }

      const unit = await storage.getUnitById(tenant.unitId);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      const property = await storage.getPropertyById(unit.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const success = await emailService.sendWelcomeEmail(
        tenant.email,
        `${tenant.firstName} ${tenant.lastName}`,
        property.name,
        unit.name
      );
      
      if (success) {
        res.json({ message: "Welcome email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/emails/send-maintenance-notification", async (req, res) => {
    try {
      const { tenantId, description, status } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const unit = await storage.getUnitById(tenant.unitId);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      const property = await storage.getPropertyById(unit.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const emailData = {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitNumber: unit.name,
        propertyName: property.name,
        description,
        status
      };

      const success = await emailService.sendMaintenanceNotification(tenant.email, emailData);
      
      if (success) {
        res.json({ message: "Maintenance notification sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending maintenance notification:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/emails/test", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      
      const success = await emailService.sendEmail({
        to,
        subject,
        html: `<p>${message}</p>`,
        text: message
      });
      
      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // File upload route for ID documents
  app.post("/api/upload/id-document", upload.single("idDocument"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Only JPEG, PNG, and PDF files are allowed" });
      }

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `id-document-${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
      
      // Convert file to base64 for storage (in a real app, you'd store this in a file system or cloud storage)
      const base64Data = file.buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

      res.json({
        success: true,
        fileName: fileName,
        originalName: file.originalname,
        url: dataUrl,
        size: file.size
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Tenant Authentication routes
  app.post("/api/tenant/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const tenant = await storage.validateTenantLogin(email, password);
      if (!tenant) {
        return res.status(401).json({ message: "Invalid credentials or login not enabled" });
      }

      const token = await storage.createTenantSession(tenant.id);
      
      res.json({
        success: true,
        tenant: {
          id: tenant.id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          unitId: tenant.unitId,
        },
        token,
      });
    } catch (error) {
      console.error("Tenant login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/tenant/logout", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.deleteTenantSession(token);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Tenant logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Tenant middleware for authentication
  const authenticateTenant = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tenant = await storage.getTenantBySession(token);
      if (!tenant) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      req.tenant = tenant;
      next();
    } catch (error) {
      console.error("Tenant authentication error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  };

  // Tenant portal routes
  app.get("/api/tenant/profile", authenticateTenant, async (req: any, res) => {
    try {
      const tenant = req.tenant;
      res.json({
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        unitId: tenant.unitId,
        leaseStart: tenant.leaseStart,
        leaseEnd: tenant.leaseEnd,
        monthlyRent: tenant.monthlyRent,
      });
    } catch (error) {
      console.error("Error fetching tenant profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/tenant/maintenance-requests", authenticateTenant, async (req: any, res) => {
    try {
      const requests = await storage.getTenantMaintenanceRequests(req.tenant.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching tenant maintenance requests:", error);
      res.status(500).json({ message: "Failed to fetch maintenance requests" });
    }
  });

  app.post("/api/tenant/maintenance-requests", authenticateTenant, async (req: any, res) => {
    try {
      const request = await storage.createTenantMaintenanceRequest(req.tenant.id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error creating tenant maintenance request:", error);
      res.status(500).json({ message: "Failed to create maintenance request" });
    }
  });

  app.get("/api/tenant/rent-payments", authenticateTenant, async (req: any, res) => {
    try {
      const payments = await storage.getTenantRentPayments(req.tenant.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching tenant rent payments:", error);
      res.status(500).json({ message: "Failed to fetch rent payments" });
    }
  });

  // Stripe payment routes for tenants
  app.post("/api/tenant/create-payment-intent", authenticateTenant, async (req: any, res) => {
    try {
      const { amount, description } = req.body;
      const tenant = req.tenant;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
          tenantId: tenant.id,
          tenantEmail: tenant.email,
          description: description || "Rent Payment",
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      
      // Provide specific guidance for Stripe configuration issues
      if (error.code === 'parameter_invalid_empty' || error.message?.includes('payment method types')) {
        res.status(400).json({ 
          message: "Card payments need to be enabled in your Stripe dashboard. Please go to https://dashboard.stripe.com/settings/payment_methods and enable card payments.",
          setupRequired: true
        });
      } else {
        res.status(500).json({ message: "Failed to create payment intent" });
      }
    }
  });

  app.post("/api/tenant/confirm-payment", authenticateTenant, async (req: any, res) => {
    try {
      const { paymentIntentId, amount, description } = req.body;
      const tenant = req.tenant;

      // Verify the payment intent was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === "succeeded") {
        // Create a rent payment record
        const rentPayment = await storage.createRentPayment({
          tenantId: tenant.id,
          unitId: tenant.unitId,
          amount: amount.toString(),
          dueDate: new Date(),
          paidDate: new Date(),
          status: "paid",
          paymentMethod: "stripe",
          stripePaymentId: paymentIntentId,
          notes: description || "Online rent payment via Stripe"
        });

        res.json({ 
          success: true, 
          payment: rentPayment,
          message: "Payment successful"
        });
      } else {
        res.status(400).json({ message: "Payment was not successful" });
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Billing Records API Routes
  app.get("/api/billing-records/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const billingRecords = await storage.getBillingRecordsByTenant(tenantId);
      res.json(billingRecords);
    } catch (error) {
      console.error("Error fetching billing records:", error);
      res.status(500).json({ error: "Failed to fetch billing records" });
    }
  });

  app.post("/api/billing-records", async (req, res) => {
    try {
      const billingRecord = await storage.createBillingRecord(req.body);
      res.json(billingRecord);
    } catch (error) {
      console.error("Error creating billing record:", error);
      res.status(500).json({ error: "Failed to create billing record" });
    }
  });

  app.get("/api/outstanding-balance/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const balance = await storage.calculateOutstandingBalance(tenantId);
      res.json({ balance });
    } catch (error) {
      console.error("Error calculating outstanding balance:", error);
      res.status(500).json({ error: "Failed to calculate outstanding balance" });
    }
  });

  app.get("/api/billing-records/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const billingRecords = await storage.getBillingRecordsByTenant(tenantId);
      res.json(billingRecords);
    } catch (error) {
      console.error("Error fetching billing records:", error);
      res.status(500).json({ error: "Failed to fetch billing records" });
    }
  });

  app.post("/api/billing-records/generate-monthly", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const billingRecords = await storage.generateMonthlyBilling();
      res.json({ success: true, generated: billingRecords.length, billingRecords });
    } catch (error) {
      console.error("Error generating monthly billing:", error);
      res.status(500).json({ error: "Failed to generate monthly billing" });
    }
  });

  app.put("/api/billing-records/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedRecord = await storage.updateBillingRecord(id, updates);
      if (!updatedRecord) {
        return res.status(404).json({ error: "Billing record not found" });
      }
      res.json(updatedRecord);
    } catch (error) {
      console.error("Error updating billing record:", error);
      res.status(500).json({ error: "Failed to update billing record" });
    }
  });

  app.post("/api/billing-records/run-automatic", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await storage.generateAutomaticBilling();
      res.json({ 
        success: true, 
        generated: result.generated.length, 
        updated: result.updated.length,
        generatedRecords: result.generated,
        updatedRecords: result.updated
      });
    } catch (error) {
      console.error("Error running automatic billing:", error);
      res.status(500).json({ error: "Failed to run automatic billing" });
    }
  });

  app.post("/api/billing-records/update-overdue", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const updatedRecords = await storage.updateOverdueStatuses();
      res.json({ success: true, updated: updatedRecords.length, records: updatedRecords });
    } catch (error) {
      console.error("Error updating overdue statuses:", error);
      res.status(500).json({ error: "Failed to update overdue statuses" });
    }
  });

  // Add other API routes here as needed
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // Properties routes
  app.get("/api/properties", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const properties = await storage.getAllProperties(req.user.organizationId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const propertyData = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      const property = await storage.updateProperty(id, req.body);
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      await storage.deleteProperty(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Units routes
  app.get("/api/units", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const units = await storage.getAllUnits(req.user.organizationId);
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.post("/api/units", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const unitData = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      const unit = await storage.createUnit(unitData);
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
  app.get("/api/mortgages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const mortgages = await storage.getAllMortgages(req.user.organizationId);
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
  app.get("/api/expenses", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const expenses = await storage.getAllExpenses(req.user.organizationId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const expenseData = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      const expense = await storage.updateExpense(id, req.body);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      await storage.deleteExpense(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Tenants routes
  app.get("/api/tenants", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const tenants = await storage.getAllTenants(req.user.organizationId);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      
      // Validate required fields
      const { firstName, lastName, email, phone } = req.body;
      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({ 
          message: "Missing required fields: firstName, lastName, email, and phone are required" 
        });
      }

      const tenantData = {
        ...req.body,
        organizationId: req.user.organizationId
      };

      const tenant = await storage.createTenant(tenantData);
      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.put("/api/tenants/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id;
      console.log("=== API MIDDLEWARE HIT FOR", req.url, "===");
      console.log("Method:", req.method);
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      // Convert date strings to Date objects if they exist
      const data = { ...req.body };
      if (data.leaseStart && typeof data.leaseStart === 'string') {
        data.leaseStart = new Date(data.leaseStart);
      }
      if (data.leaseEnd && typeof data.leaseEnd === 'string') {
        data.leaseEnd = new Date(data.leaseEnd);
      }
      
      const tenant = await storage.updateTenant(id, data);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const id = req.params.id;
      console.log("=== API MIDDLEWARE HIT FOR", req.url, "===");
      console.log("Method:", req.method);
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      // Convert date strings to Date objects if they exist
      const data = { ...req.body };
      if (data.leaseStart && typeof data.leaseStart === 'string') {
        data.leaseStart = new Date(data.leaseStart);
      }
      if (data.leaseEnd && typeof data.leaseEnd === 'string') {
        data.leaseEnd = new Date(data.leaseEnd);
      }
      
      const tenant = await storage.updateTenant(id, data);
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

  // Tenant History routes
  app.get("/api/tenant-history/:unitId", async (req, res) => {
    try {
      const unitId = req.params.unitId;
      console.log("Route: Fetching tenant history for unit:", unitId);
      
      // Return sample data directly in the route for now
      const sampleHistory = [
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
      
      console.log("Route: Returning sample history with", sampleHistory.length, "records");
      res.json(sampleHistory);
    } catch (error) {
      console.error("Error fetching tenant history:", error);
      res.json([]);
    }
  });

  app.post("/api/tenant-history", async (req, res) => {
    try {
      const history = await storage.createTenantHistory(req.body);
      res.json(history);
    } catch (error) {
      console.error("Error creating tenant history:", error);
      res.status(500).json({ message: "Failed to create tenant history" });
    }
  });

  app.patch("/api/tenants/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status, moveOutDate, moveOutReason } = req.body;

      const tenant = await storage.getTenantById(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // If status is changing to "moved", create historical record and update tenant
      if (status === "moved" && tenant.status !== "moved") {
        // Create tenant history record
        const historyData = {
          unitId: tenant.unitId,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          moveInDate: tenant.leaseStart || new Date(),
          moveOutDate: moveOutDate ? new Date(moveOutDate) : new Date(),
          monthlyRent: tenant.monthlyRent || "0",
          securityDeposit: tenant.securityDeposit || "0",
          moveOutReason: moveOutReason || "tenant_moved",
          notes: `Tenant moved out on ${moveOutDate || new Date().toISOString().split('T')[0]}`
        };

        await storage.createTenantHistory(historyData);

        // Update tenant status and clear unit assignment
        const updatedTenant = await storage.updateTenant(id, {
          status,
          unitId: null, // Remove unit assignment
          leaseEnd: moveOutDate ? new Date(moveOutDate) : new Date()
        });

        res.json(updatedTenant);
      } else {
        // Regular status update
        const updatedTenant = await storage.updateTenant(id, { status });
        res.json(updatedTenant);
      }
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  // Rent Payments routes
  app.get("/api/rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const rentPayments = await storage.getAllRentPayments(req.user.organizationId);
      res.json(rentPayments);
    } catch (error) {
      console.error("Error fetching rent payments:", error);
      res.status(500).json({ message: "Failed to fetch rent payments" });
    }
  });

  app.post("/api/rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const paymentData = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      const payment = await storage.createRentPayment(paymentData);
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
  app.get("/api/maintenance-requests", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const requests = await storage.getAllMaintenanceRequests(req.user.organizationId);
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
  app.get("/api/dashboard/kpis", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const properties = await storage.getAllProperties(req.user.organizationId);
      const units = await storage.getAllUnits(req.user.organizationId);
      const tenants = await storage.getAllTenants(req.user.organizationId);
      const maintenanceRequests = await storage.getAllMaintenanceRequests(req.user.organizationId);
      const paymentSummaries = await storage.getPaymentSummaries(req.user.organizationId);

      const occupiedUnits = tenants.filter(t => t.status === 'active' && t.unitId).length;
      const occupancyRate = units.length > 0 ? ((occupiedUnits / units.length) * 100) : 0;

      const openMaintenance = maintenanceRequests.filter(m => m.status === 'open').length;
      const totalMaintenance = maintenanceRequests.length;

      const currentRevenue = paymentSummaries.totalRevenue || 0;
      const currentExpenses = paymentSummaries.currentMonthExpenses || 0;
      
      // Calculate actual revenue change based on data
      const lastMonthRevenue = paymentSummaries.lastMonthRevenue || 0;
      const revenueChange = lastMonthRevenue > 0 ? 
        (((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : "0";
      
      // Count properties created this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newPropertiesThisMonth = properties.filter(p => {
        const createdDate = new Date(p.createdAt);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      }).length;

      const kpis = {
        totalProperties: properties.length,
        totalUnits: units.length,
        occupancyRate: `${occupancyRate.toFixed(1)}%`,
        totalRevenue: `$${currentRevenue.toLocaleString()}`,
        revenueChange: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
        newProperties: newPropertiesThisMonth,
        openMaintenanceRequests: openMaintenance,
        totalMaintenanceRequests: totalMaintenance,
        activeTenantsCount: occupiedUnits,
        totalTenantsCount: tenants.length
      };
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Payment summaries route
  app.get("/api/dashboard/payment-summaries", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const summaries = await storage.getPaymentSummaries(req.user.organizationId);
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching payment summaries:", error);
      res.status(500).json({ message: "Failed to fetch payment summaries" });
    }
  });

  // Generate monthly rent payments route
  app.post("/api/rent-payments/generate-monthly", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const generatedPayments = await storage.generateMonthlyRentPayments();
      res.json({ 
        success: true, 
        generated: generatedPayments.length,
        payments: generatedPayments 
      });
    } catch (error) {
      console.error("Error generating monthly rent payments:", error);
      res.status(500).json({ message: "Failed to generate monthly rent payments" });
    }
  });

  

  // Properties with stats route
  app.get("/api/properties/with-stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const properties = await storage.getAllProperties(req.user.organizationId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties with stats:", error);
      res.status(500).json({ message: "Failed to fetch properties with stats" });
    }
  });

  // Monthly revenues route
  app.get("/api/revenues/monthly", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      // Mock monthly revenue data
      const monthlyRevenues = [];
      res.json(monthlyRevenues);
    } catch (error) {
      console.error("Error fetching monthly revenues:", error);
      res.status(500).json({ message: "Failed to fetch monthly revenues" });
    }
  });

  // Expenses by category route
  app.get("/api/expenses/by-category", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const expenses = await storage.getAllExpenses(req.user.organizationId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses by category:", error);
      res.status(500).json({ message: "Failed to fetch expenses by category" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const tasks = await storage.getAllTasks(req.user.organizationId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", authenticateToken, upload.array('attachments', 5), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      
      // Convert date string to Date object if present
      const taskData = { 
        ...req.body,
        organizationId: req.user.organizationId
      };
      if (taskData.dueDate) {
        taskData.dueDate = new Date(taskData.dueDate);
      }
      
      // Handle multiple file attachments if present
      const attachments = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const { mkdirSync, existsSync } = await import('node:fs');
        const { join, extname } = await import('node:path');
        const { writeFile } = await import('node:fs/promises');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
          mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Process each uploaded file
        for (const file of req.files) {
          const fileExtension = extname(file.originalname);
          const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
          const filePath = join(uploadsDir, uniqueFilename);
          
          // Save file to disk
          await writeFile(filePath, file.buffer);
          
          // Add to attachments array
          attachments.push({
            url: `/uploads/${uniqueFilename}`,
            name: file.originalname,
            size: file.size,
            uploadedAt: new Date()
          });
        }
        
        // Set attachments data
        taskData.attachments = attachments;
        
        // For backward compatibility, set first attachment as legacy fields
        if (attachments.length > 0) {
          taskData.attachmentUrl = attachments[0].url;
          taskData.attachmentName = attachments[0].name;
        }
      }
      
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const { join } = await import('node:path');
      const { existsSync } = await import('node:fs');
      
      const filename = req.params.filename;
      const filePath = join(process.cwd(), 'uploads', filename);
      
      // Check if file exists
      if (!existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Send the file
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      
      // Get the original task to track changes
      const originalTask = await storage.getTaskById(id);
      
      const task = await storage.updateTask(id, req.body);
      
      // Create history entry for significant changes
      if (originalTask) {
        const changes = [];
        if (req.body.status && req.body.status !== originalTask.status) {
          changes.push(`Status changed from ${originalTask.status} to ${req.body.status}`);
        }
        if (req.body.priority && req.body.priority !== originalTask.priority) {
          changes.push(`Priority changed from ${originalTask.priority} to ${req.body.priority}`);
        }
        if (req.body.description && req.body.description !== originalTask.description) {
          changes.push(`Description updated`);
        }
        if (req.body.assignedTo && req.body.assignedTo !== originalTask.assignedTo) {
          changes.push(`Assigned to changed`);
        }
        
        if (changes.length > 0) {
          await storage.createTaskHistory({
            taskId: id,
            action: 'task_updated',
            notes: changes.join('; ')
          });
        }
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      const id = req.params.id;
      
      // Get the original task to track changes
      const originalTask = await storage.getTaskById(id);
      
      const task = await storage.updateTask(id, req.body);
      
      // Create history entry for significant changes
      if (originalTask) {
        const changes = [];
        if (req.body.status && req.body.status !== originalTask.status) {
          changes.push(`Status changed from ${originalTask.status} to ${req.body.status}`);
        }
        if (req.body.priority && req.body.priority !== originalTask.priority) {
          changes.push(`Priority changed from ${originalTask.priority} to ${req.body.priority}`);
        }
        if (req.body.description && req.body.description !== originalTask.description) {
          changes.push(`Description updated`);
        }
        if (req.body.assignedTo && req.body.assignedTo !== originalTask.assignedTo) {
          changes.push(`Assigned to changed`);
        }
        
        if (changes.length > 0) {
          await storage.createTaskHistory({
            taskId: id,
            action: 'task_updated',
            notes: changes.join('; ')
          });
        }
      }
      
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

  // Task Communication routes
  app.get("/api/tasks/:taskId/communications", async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const communications = await storage.getTaskCommunications(taskId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching task communications:", error);
      res.status(500).json({ message: "Failed to fetch task communications" });
    }
  });

  app.post("/api/tasks/:taskId/communications", async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const { method, subject, message, recipient } = req.body;
      
      // Create communication record
      const communicationData = { 
        taskId, 
        method, 
        subject, 
        message, 
        recipient,
        status: 'pending'
      };
      
      const communication = await storage.createTaskCommunication(communicationData);
      
      // Send the communication
      if (method === 'email') {
        try {
          const { emailService } = require('./email');
          await emailService.sendEmail({
            to: recipient,
            subject: subject,
            html: message,
            text: message
          });
          
          // Update status to delivered
          await storage.updateTaskCommunication(communication.id, { status: 'delivered' });
          communication.status = 'delivered';
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Update status to failed with error message
          await storage.updateTaskCommunication(communication.id, { 
            status: 'failed',
            errorMessage: emailError instanceof Error ? emailError.message : 'Email sending failed'
          });
          communication.status = 'failed';
          communication.errorMessage = emailError instanceof Error ? emailError.message : 'Email sending failed';
        }
      }
      
      res.json(communication);
    } catch (error) {
      console.error("Error creating task communication:", error);
      res.status(500).json({ message: "Failed to create task communication" });
    }
  });

  // Task History routes
  app.get("/api/tasks/:taskId/history", async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const history = await storage.getTaskHistory(taskId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  // Add attachment to existing task
  app.post("/api/tasks/:taskId/attachments", authenticateToken, upload.single('attachment'), async (req: AuthenticatedRequest, res) => {
    try {
      const taskId = req.params.taskId;
      const task = await storage.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Handle file upload
      const { mkdirSync, existsSync } = await import('node:fs');
      const { join, extname } = await import('node:path');
      const { writeFile } = await import('node:fs/promises');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileExtension = extname(req.file.originalname);
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      const filePath = join(uploadsDir, uniqueFilename);
      
      // Save file to disk
      await writeFile(filePath, req.file.buffer);
      
      // Update task with new attachment
      const updatedTaskData = {
        attachmentUrl: `/uploads/${uniqueFilename}`,
        attachmentName: req.file.originalname,
        updatedAt: new Date()
      };
      
      const updatedTask = await storage.updateTask(taskId, updatedTaskData);
      
      // Create task history entry
      await storage.createTaskHistory({
        taskId,
        action: 'updated',
        field: 'attachment',
        newValue: req.file.originalname,
        notes: `Attachment uploaded: ${req.file.originalname}`,
        userId: req.user?.id
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  });

  app.post("/api/tasks/:taskId/send-communication", async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const { subject, message } = req.body;
      const task = await storage.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await storage.sendTaskCommunication(task, subject, message);
      res.json({ success: true, message: "Communication sent successfully" });
    } catch (error) {
      console.error("Error sending task communication:", error);
      res.status(500).json({ message: "Failed to send task communication" });
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

      // Create a new organization for this user
      const organizationName = `${firstName} ${lastName}'s Organization`;
      const organization = await storage.createOrganization({
        name: organizationName,
        domain: null,
        plan: 'starter',
        status: 'active',
        maxUsers: 10,
        maxProperties: 50,
        monthlyPrice: 19,
        settings: {}
      });

      // Create user with new organization
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin', // Make them admin of their own organization
        phone: phone || null,
        organizationId: organization.id,
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
          role: user.role,
          organizationId: user.organizationId
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

  // Email routes
  app.post("/api/email/rent-reminder", async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      // Get tenant details
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Get unit and property details
      const unit = await storage.getUnitById(tenant.unitId);
      const property = await storage.getPropertyById(unit.propertyId);
      
      const success = await emailService.sendRentReminder(tenant.email, {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitNumber: unit.unitNumber,
        propertyName: property.name,
        amount: tenant.monthlyRent,
        dueDate: new Date().toLocaleDateString(),
      });
      
      if (success) {
        res.json({ message: "Rent reminder sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending rent reminder:", error);
      res.status(500).json({ message: "Failed to send rent reminder" });
    }
  });

  app.post("/api/email/maintenance-notification", async (req, res) => {
    try {
      const { tenantId, description, status } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const unit = await storage.getUnitById(tenant.unitId);
      const property = await storage.getPropertyById(unit.propertyId);
      
      const success = await emailService.sendMaintenanceNotification(tenant.email, {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitNumber: unit.unitNumber,
        propertyName: property.name,
        description,
        status,
      });
      
      if (success) {
        res.json({ message: "Maintenance notification sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending maintenance notification:", error);
      res.status(500).json({ message: "Failed to send maintenance notification" });
    }
  });

  app.post("/api/email/welcome", async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const unit = await storage.getUnitById(tenant.unitId);
      const property = await storage.getPropertyById(unit.propertyId);
      
      const success = await emailService.sendWelcomeEmail(
        tenant.email,
        `${tenant.firstName} ${tenant.lastName}`,
        property.name,
        unit.unitNumber
      );
      
      if (success) {
        res.json({ message: "Welcome email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  app.post("/api/email/bulk-rent-reminders", async (req, res) => {
    try {
      const { propertyId } = req.body;
      
      let tenants;
      if (propertyId) {
        // Get tenants for specific property
        const units = await storage.getAllUnits();
        const propertyUnits = units.filter(unit => unit.propertyId === propertyId);
        const allTenants = await storage.getAllTenants();
        tenants = allTenants.filter(tenant => 
          propertyUnits.some(unit => unit.id === tenant.unitId)
        );
      } else {
        // Get all tenants
        tenants = await storage.getAllTenants();
      }
      
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };
      
      for (const tenant of tenants) {
        try {
          const unit = await storage.getUnitById(tenant.unitId);
          const property = await storage.getPropertyById(unit.propertyId);
          
          const success = await emailService.sendRentReminder(tenant.email, {
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            unitNumber: unit.unitNumber,
            propertyName: property.name,
            amount: tenant.monthlyRent,
            dueDate: new Date().toLocaleDateString(),
          });
          
          if (success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send to ${tenant.email}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error processing ${tenant.email}: ${error.message}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error sending bulk rent reminders:", error);
      res.status(500).json({ message: "Failed to send bulk rent reminders" });
    }
  });

  // Bulk upload endpoint
  app.post("/api/bulk-upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf8');
      
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const results = {
        successCount: 0,
        errorCount: 0,
        propertiesCreated: 0,
        unitsCreated: 0,
        tenantsCreated: 0,
        expensesCreated: 0,
        errors: []
      };

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          switch (record.type?.toLowerCase()) {
            case 'property':
              await storage.createProperty({
                name: record.name,
                address: record.address,
                city: record.city,
                state: record.state,
                zipCode: record.zipCode,
                totalUnits: parseInt(record.totalUnits) || 1,
                propertyType: record.propertyType || 'apartment',
                purchasePrice: parseFloat(record.purchasePrice) || 0,
                currentValue: parseFloat(record.currentValue) || 0,
                status: record.status || 'active'
              });
              results.propertiesCreated++;
              break;

            case 'unit':
              // Find property by name
              const properties = await storage.getAllProperties();
              const property = properties.find(p => p.name === record.propertyName);
              if (!property) {
                throw new Error(`Property "${record.propertyName}" not found`);
              }
              
              await storage.createUnit({
                propertyId: property.id,
                unitNumber: record.unitNumber,
                bedrooms: parseInt(record.bedrooms) || 0,
                bathrooms: parseFloat(record.bathrooms) || 0,
                squareFootage: parseInt(record.squareFootage) || 0,
                monthlyRent: parseFloat(record.monthlyRent) || 0,
                isOccupied: false
              });
              results.unitsCreated++;
              break;

            case 'tenant':
              // Find property and unit
              const allProperties = await storage.getAllProperties();
              const tenantProperty = allProperties.find(p => p.name === record.propertyName);
              if (!tenantProperty) {
                throw new Error(`Property "${record.propertyName}" not found`);
              }
              
              const units = await storage.getAllUnits();
              const unit = units.find(u => u.propertyId === tenantProperty.id && u.unitNumber === record.unitNumber);
              if (!unit) {
                throw new Error(`Unit "${record.unitNumber}" not found in property "${record.propertyName}"`);
              }

              await storage.createTenant({
                firstName: record.firstName,
                lastName: record.lastName,
                email: record.email,
                phone: record.phone,
                unitId: unit.id,
                leaseStart: new Date(record.leaseStart),
                leaseEnd: new Date(record.leaseEnd),
                monthlyRent: parseFloat(record.monthlyRent) || 0,
                securityDeposit: parseFloat(record.securityDeposit) || 0
              });
              results.tenantsCreated++;
              break;

            case 'expense':
              // Find property
              const expenseProperties = await storage.getAllProperties();
              const expenseProperty = expenseProperties.find(p => p.name === record.propertyName);
              if (!expenseProperty) {
                throw new Error(`Property "${record.propertyName}" not found`);
              }

              await storage.createExpense({
                propertyId: expenseProperty.id,
                category: record.category,
                amount: parseFloat(record.amount) || 0,
                description: record.description,
                date: new Date(record.date),
                vendor: record.vendor
              });
              results.expensesCreated++;
              break;

            case 'task':
              // Find property
              const taskProperties = await storage.getAllProperties();
              const taskProperty = taskProperties.find(p => p.name === record.propertyName);
              if (!taskProperty) {
                throw new Error(`Property "${record.propertyName}" not found`);
              }

              await storage.createTask({
                propertyId: taskProperty.id,
                title: record.title,
                description: record.description,
                category: record.category,
                priority: record.priority,
                status: record.status || 'pending',
                dueDate: record.dueDate ? new Date(record.dueDate) : undefined
              });
              results.tasksCreated = (results.tasksCreated || 0) + 1;
              break;

            case 'mortgage':
              // Find property
              const mortgageProperties = await storage.getAllProperties();
              const mortgageProperty = mortgageProperties.find(p => p.name === record.propertyName);
              if (!mortgageProperty) {
                throw new Error(`Property "${record.propertyName}" not found`);
              }

              await storage.createMortgage({
                propertyId: mortgageProperty.id,
                lenderName: record.lenderName,
                loanAmount: parseFloat(record.loanAmount) || 0,
                interestRate: parseFloat(record.interestRate) || 0,
                termYears: parseInt(record.termYears) || 30,
                monthlyPayment: parseFloat(record.monthlyPayment) || 0,
                startDate: new Date(record.startDate)
              });
              results.mortgagesCreated = (results.mortgagesCreated || 0) + 1;
              break;

            default:
              throw new Error(`Unknown record type: ${record.type}`);
          }
          
          results.successCount++;
        } catch (error) {
          results.errorCount++;
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ 
        message: "Bulk upload failed",
        error: error.message 
      });
    }
  });

  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in user record (you'd typically store this in a separate table)
      await storage.updateUser(user.id, {
        resetToken,
        resetExpires
      });

      // Send password reset email
      try {
        const { emailService } = await import('./email');
        await emailService.sendPasswordResetEmail(
          email,
          `${user.firstName} ${user.lastName}`,
          resetToken
        );
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user with valid reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => 
        u.resetToken === token && 
        u.resetExpires && 
        new Date(u.resetExpires) > new Date()
      );

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null
      });

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  return server;
}