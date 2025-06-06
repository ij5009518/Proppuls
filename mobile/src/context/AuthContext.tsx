import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

interface Tenant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  unitId: string;
  phoneNumber: string;
  emergencyContact: string;
  emergencyPhone: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
}

interface AuthContextType {
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('tenantToken');
      const storedTenant = await AsyncStorage.getItem('tenant');
      
      if (storedToken && storedTenant) {
        setToken(storedToken);
        setTenant(JSON.parse(storedTenant));
        apiService.setAuthToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.post('/api/tenant/login', {
        email,
        password,
      });

      if (response.success) {
        const { tenant: tenantData, token: authToken } = response;
        
        await AsyncStorage.setItem('tenantToken', authToken);
        await AsyncStorage.setItem('tenant', JSON.stringify(tenantData));
        
        setToken(authToken);
        setTenant(tenantData);
        apiService.setAuthToken(authToken);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiService.post('/api/tenant/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('tenantToken');
      await AsyncStorage.removeItem('tenant');
      setToken(null);
      setTenant(null);
      apiService.setAuthToken(null);
    }
  };

  const value: AuthContextType = {
    tenant,
    token,
    isAuthenticated: !!token && !!tenant,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}