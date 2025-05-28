import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Mortgage, Property } from "@shared/schema";

export default function Mortgages() {
  const { data: mortgages = [] } = useQuery<Mortgage[]>({
    queryKey: ["/api/mortgages"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const getPropertyName = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mortgages</h1>
          <p className="text-muted-foreground">
            Manage mortgage details and payment tracking across all properties
          </p>
        </div>
      </div>

      {mortgages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mortgages found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add mortgages to your properties to track payment details and amortization schedules.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to Properties → View Property → Mortgage tab to add mortgage details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mortgages.map((mortgage) => (
            <Card key={mortgage.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{mortgage.lender}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getPropertyName(mortgage.propertyId)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatPercent(parseFloat(mortgage.interestRate))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-semibold">{formatCurrency(mortgage.originalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Balance</p>
                    <p className="font-semibold">{formatCurrency(mortgage.currentBalance)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Monthly Payment Breakdown</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <p className="text-blue-600 dark:text-blue-400">Principal</p>
                      <p className="font-semibold">{formatCurrency(mortgage.principalAmount)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <p className="text-red-600 dark:text-red-400">Interest</p>
                      <p className="font-semibold">{formatCurrency(mortgage.interestAmount)}</p>
                    </div>
                    {mortgage.escrowAmount && parseFloat(mortgage.escrowAmount) > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <p className="text-green-600 dark:text-green-400">Escrow</p>
                        <p className="font-semibold">{formatCurrency(mortgage.escrowAmount)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Monthly</p>
                      <p className="font-bold text-lg">{formatCurrency(mortgage.monthlyPayment)}</p>
                    </div>
                    <Badge variant="secondary">
                      {mortgage.termYears} years
                    </Badge>
                  </div>
                </div>

                {mortgage.accountNumber && (
                  <div className="text-xs text-muted-foreground">
                    Account: {mortgage.accountNumber}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}