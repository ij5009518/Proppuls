import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Calendar, AlertTriangle, Check, ExternalLink, Crown, Zap, Building2 } from 'lucide-react';

const PRICING_PLANS = {
  STARTER: { name: 'Starter', price: 19, features: ['Up to 5 properties', 'Basic reporting', 'Email support'] },
  PROFESSIONAL: { name: 'Professional', price: 49, features: ['Up to 25 properties', 'Advanced analytics', 'Priority support', 'Tenant portal'] },
  ENTERPRISE: { name: 'Enterprise', price: 99, features: ['Unlimited properties', 'Custom integrations', '24/7 phone support', 'White-label solution'] }
};

interface BillingManagementProps {
  billingInfo: any;
  billingHistory: any;
  isLoadingBilling: boolean;
  isLoadingHistory: boolean;
  updateSubscriptionMutation: any;
  cancelSubscriptionMutation: any;
  reactivateSubscriptionMutation: any;
}

export default function BillingManagement({
  billingInfo,
  billingHistory,
  isLoadingBilling,
  isLoadingHistory,
  updateSubscriptionMutation,
  cancelSubscriptionMutation,
  reactivateSubscriptionMutation,
}: BillingManagementProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  if (isLoadingBilling) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading billing information...</div>
        </CardContent>
      </Card>
    );
  }

  const handlePlanUpgrade = async (planType: string) => {
    try {
      await updateSubscriptionMutation.mutateAsync({ plan: planType });
      setShowPlanDialog(false);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Starter': return <Zap className="h-4 w-4" />;
      case 'Professional': return <Building2 className="h-4 w-4" />;
      case 'Enterprise': return <Crown className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {billingInfo?.subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Plan</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default" className="text-sm">
                      {billingInfo.availablePlans?.[billingInfo.organization?.plan]?.name || billingInfo.organization?.plan || 'Starter'}
                    </Badge>
                    <span className="text-2xl font-bold">
                      ${billingInfo.organization?.monthlyPrice || 19}/month
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={billingInfo.subscription.status === 'active' ? 'default' : 'destructive'}>
                      {billingInfo.subscription.status}
                    </Badge>
                    {billingInfo.subscription.cancelAtPeriodEnd && (
                      <Badge variant="outline" className="ml-2">
                        Cancels at period end
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Period</Label>
                  <div className="mt-1 text-sm">
                    {new Date(billingInfo.subscription.currentPeriodStart).toLocaleDateString()} - {' '}
                    {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Next Billing Date</Label>
                  <div className="mt-1 text-sm">
                    {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {billingInfo?.subscription?.cancelAtPeriodEnd && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be canceled at the end of the current billing period on{' '}
                {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}.
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                >
                  Reactivate subscription
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Subscription Plans
          </CardTitle>
          <CardDescription>
            Choose the plan that best fits your property management needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PRICING_PLANS).map(([planKey, plan]) => {
              const isCurrentPlan = billingInfo?.organization?.plan === planKey || 
                                  (planKey === 'STARTER' && !billingInfo?.organization?.plan);
              return (
                <Card key={planKey} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
                  {isCurrentPlan && (
                    <Badge className="absolute -top-2 left-4 z-10">Current Plan</Badge>
                  )}
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">${plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {!isCurrentPlan && (
                      <Button 
                        onClick={() => handlePlanUpgrade(planKey)}
                        disabled={updateSubscriptionMutation.isPending}
                        className="w-full"
                      >
                        {updateSubscriptionMutation.isPending ? 'Updating...' : 
                         (billingInfo?.organization?.plan && plan.price > (PRICING_PLANS as any)[billingInfo.organization.plan]?.price) 
                           ? 'Upgrade' : 'Switch Plan'}
                      </Button>
                    )}
                    {isCurrentPlan && (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View your past invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="text-center py-4">Loading billing history...</div>
          ) : billingHistory?.invoices && billingHistory.invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {invoice.periodStart && invoice.periodEnd ? (
                        `${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}`
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {invoice.hostedInvoiceUrl && invoice.hostedInvoiceUrl !== '#' && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No billing history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellation */}
      {billingInfo?.subscription && !billingInfo.subscription.cancelAtPeriodEnd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Cancel your subscription or manage account closure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">Cancel Subscription</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Subscription</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel your subscription? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You can choose to cancel immediately or at the end of your current billing period.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => cancelSubscriptionMutation.mutate(true)}
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      Cancel at Period End
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => cancelSubscriptionMutation.mutate(false)}
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      Cancel Immediately
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </>
  );
}