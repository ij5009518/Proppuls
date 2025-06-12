import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Chip,
  SearchBar,
  FAB,
  Avatar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  unitId: string;
  unitNumber: string;
  propertyName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  paymentStatus: string;
}

const TenantsScreen = ({ navigation }: any) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchQuery, tenants]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/api/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTenants = () => {
    if (!searchQuery) {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(tenant =>
        `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTenants(filtered);
    }
  };

  const onRefresh = () => {
    loadTenants();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'moved': return '#6b7280';
      default: return '#2563eb';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'current': return '#10b981';
      case 'late': return '#ef4444';
      case 'partial': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const TenantCard = ({ tenant }: { tenant: Tenant }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TenantDetails', { tenantId: tenant.id })}
    >
      <Card style={styles.tenantCard}>
        <Card.Content>
          <View style={styles.tenantHeader}>
            <View style={styles.tenantInfo}>
              <Avatar.Text
                size={48}
                label={getInitials(tenant.firstName, tenant.lastName)}
                style={[styles.avatar, { backgroundColor: getStatusColor(tenant.status) + '20' }]}
                labelStyle={{ color: getStatusColor(tenant.status) }}
              />
              <View style={styles.tenantDetails}>
                <Title style={styles.tenantName}>
                  {tenant.firstName} {tenant.lastName}
                </Title>
                <Paragraph style={styles.tenantEmail}>{tenant.email}</Paragraph>
                <Paragraph style={styles.tenantPhone}>{tenant.phone}</Paragraph>
              </View>
            </View>
            <View style={styles.statusChips}>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusColor(tenant.status) + '20' }]}
                textStyle={{ color: getStatusColor(tenant.status), fontSize: 12 }}
              >
                {tenant.status}
              </Chip>
              <Chip
                mode="flat"
                style={[styles.paymentChip, { backgroundColor: getPaymentStatusColor(tenant.paymentStatus) + '20' }]}
                textStyle={{ color: getPaymentStatusColor(tenant.paymentStatus), fontSize: 12 }}
              >
                {tenant.paymentStatus}
              </Chip>
            </View>
          </View>

          <View style={styles.propertyInfo}>
            <View style={styles.propertyDetail}>
              <Ionicons name="business" size={16} color="#64748b" />
              <Text style={styles.propertyText}>{tenant.propertyName}</Text>
            </View>
            <View style={styles.propertyDetail}>
              <Ionicons name="home" size={16} color="#64748b" />
              <Text style={styles.propertyText}>Unit {tenant.unitNumber}</Text>
            </View>
          </View>

          <View style={styles.leaseInfo}>
            <View style={styles.leaseDetail}>
              <Text style={styles.leaseLabel}>Monthly Rent</Text>
              <Text style={styles.leaseValue}>{formatCurrency(tenant.monthlyRent)}</Text>
            </View>
            <View style={styles.leaseDetail}>
              <Text style={styles.leaseLabel}>Lease Period</Text>
              <Text style={styles.leaseValue}>
                {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          placeholder="Search tenants..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <FlatList
        data={filteredTenants}
        renderItem={({ item }) => <TenantCard tenant={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Tenants Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first tenant to get started'}
            </Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddTenant')}
        label="Add Tenant"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  tenantCard: {
    marginBottom: 16,
    elevation: 2,
  },
  tenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tenantInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  tenantDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tenantEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  tenantPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  statusChips: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 28,
    marginBottom: 4,
  },
  paymentChip: {
    height: 28,
  },
  propertyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  propertyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  leaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leaseDetail: {
    flex: 1,
  },
  leaseLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  leaseValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default TenantsScreen;