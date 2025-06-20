import { Express } from "express";
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
      // Demo organization data
      const organization = {
        id: "demo-org-1",
        name: "Demo Organization",
        plan: "starter",
        monthlyPrice: 19,
        subscriptionStatus: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        stripeCustomerId: null
      };

      const subscription = {
        id: `sub_${organization.id}`,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        plan: organization.plan,
        amount: organization.monthlyPrice * 100,
      };

      res.json({
        organization,
        subscription,
        availablePlans: PRICING_PLANS,
      });
    } catch (error) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ message: "Failed to fetch billing information" });
    }
  });

  // Get billing history
  app.get("/api/billing/history", async (req: AuthenticatedRequest, res) => {
    try {
      // Mock billing history for demo
      const invoices = [
        {
          id: `inv_${Date.now()}`,
          amount: 1900,
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
          amount: 1900,
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

      res.json({ invoices });
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Update subscription
  app.post("/api/billing/update-subscription", async (req: AuthenticatedRequest, res) => {
    try {
      const { planId } = req.body;
      
      if (!PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
      
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