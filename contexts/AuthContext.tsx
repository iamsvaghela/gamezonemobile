// contexts/AuthContext.tsx - Updated Authentication Context with AsyncStorage
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
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
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
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Checking authentication status...');
      
      // Check if user is authenticated by looking for token
      const isAuthenticated = await apiService.isAuthenticated();
      
      if (isAuthenticated) {
        // Get user data from AsyncStorage
        const userData = await apiService.getUser();
        
        if (userData) {
          console.log('✅ User authenticated:', userData.email);
          setUser(userData);
          setIsLoggedIn(true);
          
          // Optional: Validate token with server
          try {
            const profileResponse = await apiService.getProfile();
            if (profileResponse.success) {
              // Update user data if server returns newer data
              setUser(profileResponse.user);
              await apiService.setUser(profileResponse.user);
            }
          } catch (profileError) {
            console.log('⚠️ Profile validation failed, but keeping local auth');
          }
        } else {
          console.log('❌ No user data found');
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        console.log('❌ User not authenticated');
        setUser(null);
        setIsLoggedIn(false);
      }
      
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, token: string) => {
    try {
      console.log('📱 Logging in user:', userData.email);
      
      // Store auth data in AsyncStorage
      await apiService.setAuthToken(token);
      await apiService.setUser(userData);
      
      // Update state
      setUser(userData);
      setIsLoggedIn(true);
      
      console.log('✅ User logged in successfully');
    } catch (error) {
      console.error('❌ Login context error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('📱 Logging out user...');
      
      // Clear auth data from AsyncStorage and API
      await apiService.logout();
      
      // Clear state
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout context error:', error);
      // Even if API call fails, clear local state
      setUser(null);
      setIsLoggedIn(false);
      
      // Force clear AsyncStorage
      try {
        await apiService.removeAuthToken();
      } catch (storageError) {
        console.error('❌ Failed to clear AsyncStorage:', storageError);
      }
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      try {
        const updatedUser = { ...user, ...userData };
        
        // Update local state
        setUser(updatedUser);
        
        // Save to AsyncStorage
        await apiService.setUser(updatedUser);
        
        console.log('✅ User data updated:', updatedUser.email);
      } catch (error) {
        console.error('❌ Update user error:', error);
      }
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
