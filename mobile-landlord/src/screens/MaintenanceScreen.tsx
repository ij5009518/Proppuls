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
  IconButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  createdAt: string;
  assignedVendor?: string;
  estimatedCost?: number;
}

const MaintenanceScreen = ({ navigation }: any) => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadMaintenanceRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchQuery, requests, filterStatus]);

  const loadMaintenanceRequests = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/api/maintenance-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const onRefresh = () => {
    loadMaintenanceRequests();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#6b7280';
      default: return '#2563eb';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const MaintenanceCard = ({ request }: { request: MaintenanceRequest }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('MaintenanceDetails', { requestId: request.id })}
    >
      <Card style={styles.requestCard}>
        <Card.Content>
          <View style={styles.requestHeader}>
            <View style={styles.requestInfo}>
              <Title style={styles.requestTitle}>{request.title}</Title>
              <Paragraph style={styles.requestDescription} numberOfLines={2}>
                {request.description}
              </Paragraph>
            </View>
            <View style={styles.statusChips}>
              <Chip
                mode="flat"
                style={[styles.priorityChip, { backgroundColor: getPriorityColor(request.priority) + '20' }]}
                textStyle={{ color: getPriorityColor(request.priority), fontSize: 12 }}
              >
                {request.priority}
              </Chip>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusColor(request.status) + '20' }]}
                textStyle={{ color: getStatusColor(request.status), fontSize: 12 }}
              >
                {request.status.replace('_', ' ')}
              </Chip>
            </View>
          </View>

          <View style={styles.requestDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={16} color="#64748b" />
              <Text style={styles.detailText}>{request.tenantName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="business" size={16} color="#64748b" />
              <Text style={styles.detailText}>{request.propertyName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="home" size={16} color="#64748b" />
              <Text style={styles.detailText}>Unit {request.unitNumber}</Text>
            </View>
          </View>

          <View style={styles.requestMeta}>
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag" size={14} color="#2563eb" />
              <Text style={styles.categoryText}>{request.category}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>
          </View>

          {request.assignedVendor && (
            <View style={styles.vendorInfo}>
              <Ionicons name="hammer" size={16} color="#10b981" />
              <Text style={styles.vendorText}>Assigned to: {request.assignedVendor}</Text>
            </View>
          )}

          {request.estimatedCost && (
            <View style={styles.costInfo}>
              <Text style={styles.costLabel}>Estimated Cost:</Text>
              <Text style={styles.costValue}>{formatCurrency(request.estimatedCost)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const FilterChips = () => (
    <View style={styles.filterContainer}>
      {['all', 'pending', 'in_progress', 'completed'].map((status) => (
        <Chip
          key={status}
          mode={filterStatus === status ? 'flat' : 'outlined'}
          onPress={() => setFilterStatus(status)}
          style={[
            styles.filterChip,
            filterStatus === status && { backgroundColor: '#2563eb20' }
          ]}
          textStyle={filterStatus === status ? { color: '#2563eb' } : {}}
        >
          {status === 'all' ? 'All' : status.replace('_', ' ')}
        </Chip>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          placeholder="Search maintenance requests..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <FilterChips />
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={({ item }) => <MaintenanceCard request={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Maintenance Requests</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'All maintenance requests will appear here'}
            </Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddMaintenanceRequest')}
        label="Add Request"
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
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  requestCard: {
    marginBottom: 16,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  statusChips: {
    alignItems: 'flex-end',
  },
  priorityChip: {
    height: 28,
    marginBottom: 4,
  },
  statusChip: {
    height: 28,
  },
  requestDetails: {
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 6,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vendorText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 6,
    fontWeight: '500',
  },
  costInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  costLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  costValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: 'bold',
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

export default MaintenanceScreen;