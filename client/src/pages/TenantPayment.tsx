import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, CreditCard, CheckCircle, ArrowLeft } from "lucide-react";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Monthly Rent Payment");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !amount) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant-portal`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Your rent payment has been processed successfully!",
        });
        onSuccess();
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Make Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Payment Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Payment description"
              rows={2}
            />
          </div>

          <div className="border rounded-lg p-4">
            <PaymentElement />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!stripe || isLoading}
              className="flex-1"
            >
              {isLoading ? "Processing..." : `Pay $${amount}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface TenantPaymentProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TenantPayment({ onSuccess, onCancel }: TenantPaymentProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Create a placeholder payment intent - will be updated when user enters amount
    createPaymentIntent(100); // Default $100
  }, []);

  const createPaymentIntent = async (amount: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('tenantToken');
      
      const response = await fetch('/api/tenant/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          description: "Rent Payment"
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to initialize payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating payment intent:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment system",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const token = localStorage.getItem('tenantToken');
      
      const response = await fetch('/api/tenant/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          amount: 100, // This should be the actual amount
          description: "Monthly Rent Payment"
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to confirm payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to initialize payment. Please try again.
          </p>
          <Button onClick={onCancel} className="w-full mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      <PaymentForm onSuccess={handlePaymentSuccess} onCancel={onCancel} />
    </Elements>
  );
}