import { Express } from "express";
import { db, organizations } from "./db";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "./auth";

// Pricing configuration
export const PRICING_PLANS = {
  starter: {
    name: "Starter",
    price: 19,
    features: ["Up to 10 users", "Up to 50 properties", "Basic support"],
    maxUsers: 10,
    maxProperties: 50,
  },
  professional: {
    name: "Professional", 
    price: 49,
    features: ["Up to 50 users", "Up to 200 properties", "Priority support", "Advanced analytics"],
    maxUsers: 50,
    maxProperties: 200,
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    features: ["Unlimited users", "Unlimited properties", "24/7 support", "Custom integrations"],
    maxUsers: -1,
    maxProperties: -1,
  },
};

export function registerBillingRoutes(app: Express) {
  
  // Get organization billing info
  app.get("/api/billing/info", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization not found" });
      }

      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Simulate subscription info based on organization data
      const subscription = {
        id: org.stripeSubscriptionId || `sub_${org.id}`,
        status: org.subscriptionStatus || 'active',
        currentPeriodStart: org.currentPeriodStart || new Date(),
        currentPeriodEnd: org.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: org.cancelAtPeriodEnd || false,
        plan: org.plan,
        amount: (org.monthlyPrice ?? 19) * 100, // Convert to cents
      };

      res.json({
        organization: org,
        subscription,
        availablePlans: PRICING_PLANS,
      });
    } catch (error) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ message: "Failed to fetch billing information" });
    }
  });

  // Get billing history (mock data for now)
  app.get("/api/billing/history", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization not found" });
      }

      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!org) {
        return res.json({ invoices: [] });
      }

      // Mock billing history - in production this would come from Stripe
      const mockInvoices = [
        {
          id: `inv_${Date.now()}`,
          amount: (org.monthlyPrice ?? 19) * 100,
          currency: 'usd',
          status: 'paid',
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          hostedInvoiceUrl: '#',
          invoicePdf: '#',
          periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          id: `inv_${Date.now() - 1}`,
          amount: (org.monthlyPrice ?? 19) * 100,
          currency: 'usd',
          status: 'paid',
          paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          hostedInvoiceUrl: '#',
          invoicePdf: '#',
          periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      ];

      res.json({ invoices: mockInvoices });
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Update subscription (upgrade/downgrade)
  app.post("/api/billing/update-subscription", async (req: AuthenticatedRequest, res) => {
    try {
      const { planId } = req.body;
      const user = req.user;
      
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization not found" });
      }

      if (!PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
      
      // Update organization with new plan
      await db.update(organizations)
        .set({
          plan: planId,
          monthlyPrice: plan.price,
          maxUsers: plan.maxUsers,
          maxProperties: plan.maxProperties,
        })
        .where(eq(organizations.id, org.id));

      res.json({
        success: true,
        message: `Successfully updated to ${plan.name} plan`,
        plan: planId,
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Cancel subscription
  app.post("/api/billing/cancel-subscription", async (req: AuthenticatedRequest, res) => {
    try {
      const { cancelAtPeriodEnd = true } = req.body;
      const user = req.user;
      
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization not found" });
      }

      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Update organization cancellation status
      await db.update(organizations)
        .set({
          cancelAtPeriodEnd: cancelAtPeriodEnd,
          subscriptionStatus: cancelAtPeriodEnd ? 'active' : 'canceled',
        })
        .where(eq(organizations.id, org.id));

      res.json({
        success: true,
        message: cancelAtPeriodEnd 
          ? "Subscription will be canceled at the end of the current period"
          : "Subscription canceled immediately",
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription
  app.post("/api/billing/reactivate-subscription", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization not found" });
      }

      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Reactivate subscription
      await db.update(organizations)
        .set({
          cancelAtPeriodEnd: false,
          subscriptionStatus: 'active',
        })
        .where(eq(organizations.id, org.id));

      res.json({
        success: true,
        message: "Subscription reactivated successfully",
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ message: "Failed to reactivate subscription" });
    }
  });
}