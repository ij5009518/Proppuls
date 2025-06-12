import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import TenantsScreen from './src/screens/TenantsScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import FinancialsScreen from './src/screens/FinancialsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PropertyDetailsScreen from './src/screens/PropertyDetailsScreen';
import TenantDetailsScreen from './src/screens/TenantDetailsScreen';
import MaintenanceDetailsScreen from './src/screens/MaintenanceDetailsScreen';
import AddPropertyScreen from './src/screens/AddPropertyScreen';
import AddTenantScreen from './src/screens/AddTenantScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function LandlordTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Properties') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Tenants') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Maintenance') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Financials') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Portfolio Overview' }}
      />
      <Tab.Screen 
        name="Properties" 
        component={PropertiesScreen}
        options={{ title: 'Properties' }}
      />
      <Tab.Screen 
        name="Tenants" 
        component={TenantsScreen}
        options={{ title: 'Tenants' }}
      />
      <Tab.Screen 
        name="Maintenance" 
        component={MaintenanceScreen}
        options={{ title: 'Maintenance' }}
      />
      <Tab.Screen 
        name="Financials" 
        component={FinancialsScreen}
        options={{ title: 'Financials' }}
      />
    </Tab.Navigator>
  );
}

function LandlordStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={LandlordTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen}
        options={{ 
          title: 'Property Details',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="TenantDetails" 
        component={TenantDetailsScreen}
        options={{ 
          title: 'Tenant Details',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="MaintenanceDetails" 
        component={MaintenanceDetailsScreen}
        options={{ 
          title: 'Maintenance Request',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="AddProperty" 
        component={AddPropertyScreen}
        options={{ 
          title: 'Add Property',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="AddTenant" 
        component={AddTenantScreen}
        options={{ 
          title: 'Add Tenant',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Loading screen can be added here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={LandlordStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}