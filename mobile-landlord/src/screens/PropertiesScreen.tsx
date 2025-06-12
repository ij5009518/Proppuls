import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Chip,
  Surface,
  SearchBar,
  FAB,
  IconButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyRevenue: number;
  propertyType: string;
  status: string;
}

const PropertiesScreen = ({ navigation }: any) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [searchQuery, properties]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/api/properties', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    if (!searchQuery) {
      setFilteredProperties(properties);
    } else {
      const filtered = properties.filter(property =>
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProperties(filtered);
    }
  };

  const onRefresh = () => {
    loadProperties();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getOccupancyRate = (property: Property) => {
    if (property.totalUnits === 0) return 0;
    return Math.round((property.occupiedUnits / property.totalUnits) * 100);
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return '#10b981';
    if (rate >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#10b981';
      case 'maintenance': return '#f59e0b';
      case 'inactive': return '#6b7280';
      default: return '#2563eb';
    }
  };

  const PropertyCard = ({ property }: { property: Property }) => {
    const occupancyRate = getOccupancyRate(property);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PropertyDetails', { propertyId: property.id })}
      >
        <Card style={styles.propertyCard}>
          <Card.Content>
            <View style={styles.propertyHeader}>
              <View style={styles.propertyInfo}>
                <Title style={styles.propertyName}>{property.name}</Title>
                <Paragraph style={styles.propertyAddress}>
                  {property.address}, {property.city}, {property.state}
                </Paragraph>
              </View>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusColor(property.status) + '20' }]}
                textStyle={{ color: getStatusColor(property.status) }}
              >
                {property.status}
              </Chip>
            </View>

            <View style={styles.propertyStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{property.totalUnits}</Text>
                <Text style={styles.statLabel}>Total Units</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: getOccupancyColor(occupancyRate) }]}>
                  {occupancyRate}%
                </Text>
                <Text style={styles.statLabel}>Occupied</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(property.monthlyRevenue)}</Text>
                <Text style={styles.statLabel}>Monthly Revenue</Text>
              </View>
            </View>

            <View style={styles.unitBreakdown}>
              <View style={styles.unitStat}>
                <Ionicons name="home" size={16} color="#10b981" />
                <Text style={[styles.unitText, { color: '#10b981' }]}>
                  {property.occupiedUnits} Occupied
                </Text>
              </View>
              <View style={styles.unitStat}>
                <Ionicons name="home-outline" size={16} color="#ef4444" />
                <Text style={[styles.unitText, { color: '#ef4444' }]}>
                  {property.vacantUnits} Vacant
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          placeholder="Search properties..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <FlatList
        data={filteredProperties}
        renderItem={({ item }) => <PropertyCard property={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Properties Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first property to get started'}
            </Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddProperty')}
        label="Add Property"
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
  propertyCard: {
    marginBottom: 16,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  propertyInfo: {
    flex: 1,
    marginRight: 12,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#64748b',
  },
  statusChip: {
    height: 28,
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  unitBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unitText: {
    fontSize: 14,
    marginLeft: 6,
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

export default PropertiesScreen;