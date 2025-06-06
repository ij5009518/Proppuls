import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface RentPayment {
  id: string;
  amount: string;
  dueDate: string;
  status: string;
  paidDate?: string;
  month: string;
  year: string;
}

export default function PaymentsScreen() {
  const { tenant } = useAuth();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const response = await apiService.get('/api/tenant/rent-payments');
      setPayments(response);
    } catch (error) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const handleMakePayment = async (paymentId: string, amount: string) => {
    Alert.alert(
      'Make Payment',
      `Pay $${parseFloat(amount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              // This would integrate with Stripe payment processing
              const response = await apiService.post('/api/tenant/create-payment-intent', {
                amount: parseFloat(amount),
                description: `Rent payment for ${new Date().toLocaleDateString()}`,
                paymentId,
              });

              if (response.clientSecret) {
                // In a real app, you would integrate Stripe React Native SDK here
                Alert.alert(
                  'Payment Integration',
                  'This would open Stripe payment processing. For demo purposes, payment is simulated.',
                  [
                    {
                      text: 'Simulate Success',
                      onPress: () => {
                        Alert.alert('Success', 'Payment processed successfully!');
                        loadPayments();
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Payment error:', error);
              Alert.alert('Error', 'Failed to process payment');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'overdue':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getPendingPayments = () => {
    return payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  };

  const getPaidPayments = () => {
    return payments.filter(p => p.status === 'paid');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const pendingPayments = getPendingPayments();
  const paidPayments = getPaidPayments();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rent Payments</Text>
        <Text style={styles.subtitle}>Unit {tenant?.unitId}</Text>
      </View>

      {pendingPayments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Payments</Text>
          {pendingPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>
                    {payment.month} {payment.year}
                  </Text>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={styles.cardDue}>
                    Due: {formatDate(payment.dueDate)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(payment.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {payment.status.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handleMakePayment(payment.id, payment.amount)}
                  >
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paidPayments.length > 0 ? (
          paidPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>
                    {payment.month} {payment.year}
                  </Text>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={styles.cardDue}>
                    {payment.paidDate 
                      ? `Paid: ${formatDate(payment.paidDate)}`
                      : `Due: ${formatDate(payment.dueDate)}`
                    }
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(payment.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {payment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payment history available</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Payments are processed securely through Stripe
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  cardDue: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  payButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});