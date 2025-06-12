import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Chip,
  Surface,
  SegmentedButtons,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  rentPayments: RentPayment[];
  expenses: Expense[];
  monthlyTrends: MonthlyTrend[];
}

interface RentPayment {
  id: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
}

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  propertyName: string;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

const FinancialsScreen = ({ navigation }: any) => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    collectionRate: 0,
    rentPayments: [],
    expenses: [],
    monthlyTrends: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/api/financials/summary?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadFinancialData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return '#10b981';
      case 'overdue': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const MetricCard = ({ title, value, change, icon, color = '#2563eb' }: any) => (
    <Surface style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricContent}>
        <View style={styles.metricText}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
          {change && (
            <Text style={[styles.metricChange, { color: change > 0 ? '#10b981' : '#ef4444' }]}>
              {change > 0 ? '+' : ''}{change}%
            </Text>
          )}
        </View>
        <Ionicons name={icon} size={28} color={color} />
      </View>
    </Surface>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.pageTitle}>Financial Overview</Title>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={[
            { value: 'month', label: 'This Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
          style={styles.periodSelector}
        />
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(financialData.totalRevenue)}
            icon="trending-up"
            color="#10b981"
          />
          <MetricCard
            title="Total Expenses"
            value={formatCurrency(financialData.totalExpenses)}
            icon="trending-down"
            color="#ef4444"
          />
          <MetricCard
            title="Net Income"
            value={formatCurrency(financialData.netIncome)}
            icon="analytics"
            color="#2563eb"
          />
          <MetricCard
            title="Collection Rate"
            value={`${financialData.collectionRate.toFixed(1)}%`}
            icon="checkmark-circle"
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Recent Rent Payments */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Recent Rent Payments</Title>
        {financialData.rentPayments.slice(0, 5).map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <Card.Content style={styles.paymentContent}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTenant}>{payment.tenantName}</Text>
                <Text style={styles.paymentProperty}>
                  {payment.propertyName} - Unit {payment.unitNumber}
                </Text>
                <Text style={styles.paymentDate}>
                  Due: {formatDate(payment.dueDate)}
                  {payment.paidDate && ` | Paid: ${formatDate(payment.paidDate)}`}
                </Text>
              </View>
              <View style={styles.paymentAmount}>
                <Text style={styles.paymentValue}>{formatCurrency(payment.amount)}</Text>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: getPaymentStatusColor(payment.status) + '20' }
                  ]}
                  textStyle={{ color: getPaymentStatusColor(payment.status), fontSize: 12 }}
                >
                  {payment.status}
                </Chip>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Recent Expenses */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Recent Expenses</Title>
        {financialData.expenses.slice(0, 5).map((expense) => (
          <Card key={expense.id} style={styles.expenseCard}>
            <Card.Content style={styles.expenseContent}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseProperty}>{expense.propertyName}</Text>
                <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
              </View>
              <View style={styles.expenseAmount}>
                <Text style={styles.expenseValue}>-{formatCurrency(expense.amount)}</Text>
                <Chip
                  mode="flat"
                  style={styles.categoryChip}
                  textStyle={{ fontSize: 12 }}
                >
                  {expense.category}
                </Chip>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Monthly Trends */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Monthly Trends</Title>
        <Card style={styles.trendsCard}>
          <Card.Content>
            {financialData.monthlyTrends.map((trend, index) => (
              <View key={index} style={styles.trendRow}>
                <Text style={styles.trendMonth}>{trend.month}</Text>
                <View style={styles.trendValues}>
                  <Text style={[styles.trendValue, { color: '#10b981' }]}>
                    {formatCurrency(trend.revenue)}
                  </Text>
                  <Text style={[styles.trendValue, { color: '#ef4444' }]}>
                    -{formatCurrency(trend.expenses)}
                  </Text>
                  <Text style={[styles.trendValue, { color: '#2563eb', fontWeight: '600' }]}>
                    {formatCurrency(trend.netIncome)}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.trendLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Revenue</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Expenses</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.legendText}>Net Income</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  periodSelector: {
    backgroundColor: 'white',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    backgroundColor: 'white',
  },
  metricContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricText: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  metricTitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  metricChange: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  paymentCard: {
    marginBottom: 12,
    elevation: 1,
  },
  paymentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTenant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentProperty: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusChip: {
    height: 24,
  },
  expenseCard: {
    marginBottom: 12,
    elevation: 1,
  },
  expenseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  expenseProperty: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expenseValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  categoryChip: {
    height: 24,
    backgroundColor: '#f3f4f6',
  },
  trendsCard: {
    elevation: 2,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  trendMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 60,
  },
  trendValues: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 16,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default FinancialsScreen;