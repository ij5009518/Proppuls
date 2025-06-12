import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Chip,
  Surface,
  IconButton,
  Button,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface DashboardData {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  monthlyRevenue: number;
  pendingMaintenance: number;
  overduePayments: number;
  recentActivity: any[];
}

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    pendingMaintenance: 0,
    overduePayments: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/api/dashboard/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadDashboardData();
  };

  const occupancyRate = dashboardData.totalUnits > 0 
    ? (dashboardData.occupiedUnits / dashboardData.totalUnits * 100).toFixed(1)
    : '0';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, icon, color = '#2563eb', onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Surface style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={styles.statContent}>
          <View style={styles.statText}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
          </View>
          <Ionicons name={icon} size={32} color={color} />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, icon, onPress, color = '#2563eb' }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.quickAction}>
      <Surface style={styles.quickActionSurface}>
        <Ionicons name={icon} size={28} color={color} />
        <Text style={styles.quickActionText}>{title}</Text>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Title style={styles.welcomeTitle}>Welcome back, {user?.firstName}!</Title>
          <Paragraph style={styles.welcomeSubtitle}>Here's your portfolio overview</Paragraph>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Surface style={styles.profileButton}>
            <Ionicons name="person" size={24} color="#2563eb" />
          </Surface>
        </TouchableOpacity>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Portfolio Overview</Title>
        <View style={styles.statsGrid}>
          <StatCard
            title="Properties"
            value={dashboardData.totalProperties}
            icon="business"
            onPress={() => navigation.navigate('Properties')}
          />
          <StatCard
            title="Total Units"
            value={dashboardData.totalUnits}
            subtitle={`${occupancyRate}% occupied`}
            icon="home"
            color="#10b981"
            onPress={() => navigation.navigate('Properties')}
          />
          <StatCard
            title="Active Tenants"
            value={dashboardData.totalTenants}
            icon="people"
            color="#8b5cf6"
            onPress={() => navigation.navigate('Tenants')}
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(dashboardData.monthlyRevenue)}
            icon="card"
            color="#f59e0b"
            onPress={() => navigation.navigate('Financials')}
          />
        </View>
      </View>

      {/* Alerts */}
      {(dashboardData.pendingMaintenance > 0 || dashboardData.overduePayments > 0) && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Attention Required</Title>
          {dashboardData.pendingMaintenance > 0 && (
            <Card style={[styles.alertCard, styles.warningAlert]}>
              <Card.Content style={styles.alertContent}>
                <Ionicons name="construct" size={24} color="#f59e0b" />
                <View style={styles.alertText}>
                  <Text style={styles.alertTitle}>Pending Maintenance</Text>
                  <Text style={styles.alertDescription}>
                    {dashboardData.pendingMaintenance} requests need attention
                  </Text>
                </View>
                <IconButton
                  icon="chevron-forward"
                  onPress={() => navigation.navigate('Maintenance')}
                />
              </Card.Content>
            </Card>
          )}
          {dashboardData.overduePayments > 0 && (
            <Card style={[styles.alertCard, styles.errorAlert]}>
              <Card.Content style={styles.alertContent}>
                <Ionicons name="alert-circle" size={24} color="#ef4444" />
                <View style={styles.alertText}>
                  <Text style={styles.alertTitle}>Overdue Payments</Text>
                  <Text style={styles.alertDescription}>
                    {dashboardData.overduePayments} payments are overdue
                  </Text>
                </View>
                <IconButton
                  icon="chevron-forward"
                  onPress={() => navigation.navigate('Financials')}
                />
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Add Property"
            icon="add-circle"
            onPress={() => navigation.navigate('AddProperty')}
          />
          <QuickActionCard
            title="Add Tenant"
            icon="person-add"
            color="#10b981"
            onPress={() => navigation.navigate('AddTenant')}
          />
          <QuickActionCard
            title="View Reports"
            icon="analytics"
            color="#8b5cf6"
            onPress={() => navigation.navigate('Financials')}
          />
          <QuickActionCard
            title="Maintenance"
            icon="construct"
            color="#f59e0b"
            onPress={() => navigation.navigate('Maintenance')}
          />
        </View>
      </View>

      {/* Occupancy Overview */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Unit Status</Title>
        <Card style={styles.occupancyCard}>
          <Card.Content>
            <View style={styles.occupancyHeader}>
              <Text style={styles.occupancyRate}>{occupancyRate}%</Text>
              <Text style={styles.occupancyLabel}>Occupancy Rate</Text>
            </View>
            <View style={styles.occupancyStats}>
              <View style={styles.occupancyStat}>
                <Chip mode="flat" style={styles.occupiedChip}>
                  Occupied: {dashboardData.occupiedUnits}
                </Chip>
              </View>
              <View style={styles.occupancyStat}>
                <Chip mode="flat" style={styles.vacantChip}>
                  Vacant: {dashboardData.vacantUnits}
                </Chip>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  welcomeSubtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    backgroundColor: 'white',
  },
  statContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statTitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  alertCard: {
    marginBottom: 12,
    elevation: 2,
  },
  warningAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  errorAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  alertDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - 60) / 2,
    marginBottom: 12,
  },
  quickActionSurface: {
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  occupancyCard: {
    elevation: 2,
  },
  occupancyHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  occupancyRate: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
  occupancyLabel: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  occupancyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  occupancyStat: {
    alignItems: 'center',
  },
  occupiedChip: {
    backgroundColor: '#dcfce7',
  },
  vacantChip: {
    backgroundColor: '#fee2e2',
  },
});

export default DashboardScreen;