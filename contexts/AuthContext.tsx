// contexts/AuthContext.tsx - Debug version with better logging and notification integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  profileImage?: string;
  isVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isTokenValid: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthProvider mounted, checking auth status...');
    checkAuthStatus();
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 Auth State Changed:', {
      isLoggedIn,
      isLoading,
      userEmail: user?.email,
      userName: user?.name
    });
  }, [isLoggedIn, isLoading, user]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Checking authentication status...');
      
      // First check if we have a token
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Token found:', token ? '✅ Yes' : '❌ No');
      
      if (!token) {
        console.log('❌ No token found, user not authenticated');
        setUser(null);
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }

      // Check if we have user data
      const userData = await apiService.getUser();
      console.log('👤 User data found:', userData ? '✅ Yes' : '❌ No');
      
      if (userData) {
        console.log('✅ User authenticated:', userData.email);
        setUser(userData);
        setIsLoggedIn(true);
        
        // 🔔 Initialize notification service for authenticated users
        try {
          console.log('🔔 Initializing notification service...');
          const NotificationService = (await import('../services/NotificationService')).default;
          await NotificationService.initialize();
          console.log('✅ Notification service initialized');
        } catch (notificationError) {
          console.error('⚠️ Notification service initialization failed:', notificationError);
          // Don't fail auth if notifications fail
        }
        
        // Optional: Try to validate with server (but don't fail if it doesn't work)
        try {
          console.log('🔍 Validating token with server...');
          const profileResponse = await apiService.getProfile();
          
          if (profileResponse.success) {
            console.log('✅ Token valid, updating user data');
            setUser(profileResponse.user);
            await apiService.setUser(profileResponse.user);
          }
        } catch (profileError) {
          console.log('⚠️ Server validation failed, but keeping local auth:', profileError.message);
          // Don't change auth state - keep user logged in with local data
        }
      } else {
        console.log('❌ No user data found, clearing auth');
        await AsyncStorage.removeItem('authToken');
        setUser(null);
        setIsLoggedIn(false);
      }
      
    } catch (error) {
      console.error('❌ Auth check error:', error);
      // Clear everything on error
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
      console.log('✅ Auth check complete');
    }
  };

  const login = async (userData: User, token: string) => {
    try {
      console.log('📱 Logging in user:', userData.email);
      
      // Store auth data
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      setIsLoggedIn(true);
      
      // 🔔 Initialize notification service after login
      try {
        console.log('🔔 Initializing notification service after login...');
        const NotificationService = (await import('../services/NotificationService')).default;
        await NotificationService.initialize();
        console.log('✅ Notification service initialized after login');
      } catch (notificationError) {
        console.error('⚠️ Notification service initialization failed after login:', notificationError);
        // Don't fail login if notifications fail
      }
      
      console.log('✅ User logged in successfully');
    } catch (error) {
      console.error('❌ Login context error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('📱 Logging out user...');
      
      // Clear auth data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      // Clear state
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if there's an error, clear the state
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      try {
        console.log('🔄 Updating user profile:', userData);
        
        // Try to update via API first
        try {
          const response = await apiService.updateProfile(userData);
          if (response.success) {
            console.log('✅ Server profile updated successfully');
            setUser(response.user);
            await AsyncStorage.setItem('user', JSON.stringify(response.user));
            return;
          }
        } catch (apiError) {
          console.log('⚠️ Server update failed, updating locally:', apiError.message);
        }
        
        // Fallback to local update
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('✅ User data updated locally:', updatedUser.email);
      } catch (error) {
        console.error('❌ Update user error:', error);
        throw error;
      }
    }
  };

  const refreshUserData = async () => {
    try {
      console.log('🔄 Refreshing user data from server...');
      const response = await apiService.getProfile();
      
      if (response.success) {
        setUser(response.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        console.log('✅ User data refreshed from server');
      }
    } catch (error) {
      console.log('⚠️ Failed to refresh user data from server:', error.message);
      // Don't throw error, just keep existing data
    }
  };

  const isTokenValid = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;
      
      const response = await apiService.getProfile();
      return response.success;
    } catch (error) {
      console.log('❌ Token validation failed:', error.message);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    refreshUserData,
    isTokenValid,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};