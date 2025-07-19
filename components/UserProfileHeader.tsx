// components/UserProfileHeader.tsx - Fixed alignment for vendor pages
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import NotificationBell component
import { NotificationBell } from './NotificationBell';

interface UserProfileHeaderProps {
  style?: any;
}

export default function UserProfileHeader({ style }: UserProfileHeaderProps) {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  // Check if we're on a vendor page to show different styling
  const isVendorPage = pathname?.startsWith('/vendor/');

  const handleLogin = () => {
    router.push('/login');
  };

  // 🔧 DIRECT LOGOUT FUNCTION - With enhanced debugging
  const handleLogout = async () => {
    console.log('🚪 UserProfileHeader logout button clicked - DIRECT LOGOUT');
    console.log('👤 User role:', user?.role);
    console.log('📧 User email:', user?.email);
    console.log('📍 Current pathname:', pathname);
    console.log('🏢 Is vendor page:', isVendorPage);
    console.log('⏳ Currently logging out:', loggingOut);
    
    if (loggingOut) {
      console.log('⏳ Already logging out, ignoring click');
      return;
    }

    // Call forceLogout directly without Alert dialog
    await forceLogout();
  };

  // 🔧 FORCE LOGOUT - Enhanced debugging for vendor pages
  const forceLogout = async () => {
    const startTime = Date.now();
    console.log('🚪 USERPROFILEHEADER FORCE LOGOUT: Starting...');
    console.log('👤 Logging out user:', user?.role, user?.email);
    console.log('📍 Current pathname:', pathname);
    console.log('🏢 Is vendor page:', isVendorPage);
    console.log('⏰ Start time:', new Date().toISOString());
    
    try {
      console.log('🔄 Step 1: Setting loggingOut to true');
      setLoggingOut(true);
      console.log('✅ Step 1 complete');
      
      // 1. Clear AsyncStorage manually
      console.log('🔄 Step 2: Clearing AsyncStorage...');
      try {
        await AsyncStorage.removeItem('authToken');
        console.log('✅ AuthToken removed from AsyncStorage');
        await AsyncStorage.removeItem('user');
        console.log('✅ User removed from AsyncStorage');
        console.log('✅ Step 2 complete - AsyncStorage cleared');
      } catch (storageError) {
        console.error('❌ Step 2 failed - AsyncStorage clear error:', storageError);
      }
      
      // 2. Try AuthContext logout (but don't fail if it errors)
      console.log('🔄 Step 3: Calling AuthContext logout...');
      try {
        await logout();
        console.log('✅ Step 3 complete - AuthContext logout successful');
      } catch (contextError) {
        console.error('❌ Step 3 failed - AuthContext logout error:', contextError);
        console.log('🔄 Continuing with manual logout...');
      }
      
      // 3. Add longer delay for vendor pages to prevent navigation conflicts
      const navigationDelay = isVendorPage ? 150 : 50;
      console.log('🔄 Step 4: Adding navigation delay of', navigationDelay, 'ms...');
      await new Promise(resolve => setTimeout(resolve, navigationDelay));
      console.log('✅ Step 4 complete - Navigation delay finished');
      
      // 4. Force navigation to home with enhanced error handling
      console.log('🔄 Step 5: Starting navigation to home...');
      console.log('🏠 Current route before navigation:', pathname);
      
      // Clear any pending navigation or auth redirects
      if (typeof window !== 'undefined') {
        console.log('🧹 Clearing window history state...');
        try {
          // Clear any OAuth callback states
          if (window.location.hash.includes('state=') || window.location.search.includes('callback')) {
            console.log('🔧 Detected OAuth callback, clearing hash and search params');
            window.history.replaceState(null, '', window.location.pathname);
          }
          
          // Clear all session storage to prevent OAuth conflicts
          window.sessionStorage.clear();
          console.log('✅ Session storage cleared');
          
          // Clear specific OAuth-related items
          ['oauth_state', 'oauth_redirect', 'auth_callback'].forEach(key => {
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(key);
          });
          
          window.history.replaceState(null, '', '/');
          console.log('✅ Window history cleared');
        } catch (historyError) {
          console.error('❌ History clear error:', historyError);
        }
      }
      
      try {
        // For vendor pages, try direct navigation first
        if (isVendorPage) {
          console.log('🏢 Vendor logout - using router.replace("/(tabs)")');
          
          // Add immediate redirect prevention and OAuth cleanup
          console.log('🛡️ Preventing auth redirects and cleaning OAuth state...');
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('preventAuthRedirect', 'true');
            
            // Close any OAuth popup windows
            if (window.opener) {
              console.log('🔧 Detected OAuth popup, closing...');
              try {
                window.close();
              } catch (closeError) {
                console.error('❌ Could not close OAuth popup:', closeError);
              }
            }
            
            // Handle multiple tabs scenario
            const currentUrl = window.location.href;
            if (currentUrl.includes('/auth/callback') || currentUrl.includes('#state=')) {
              console.log('🔧 OAuth callback detected, redirecting to home');
              window.location.replace('/');
              return; // Exit early for OAuth callbacks
            }
          }
          
          router.replace('/(tabs)');
          console.log('✅ Step 5a complete - Vendor router.replace successful');
        } else {
          console.log('👤 Regular logout - using router.replace("/(tabs)")');
          router.replace('/(tabs)');
          console.log('✅ Step 5b complete - Regular router.replace successful');
        }
        
        // Clear the redirect prevention after a short delay
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('preventAuthRedirect');
            console.log('🧹 Cleared auth redirect prevention');
          }
        }, 2000);
        
      } catch (navError) {
        console.error('❌ Step 5 failed - router.replace error:', navError);
        console.log('🔄 Attempting fallback navigation...');
        
        // Enhanced fallback for vendor pages
        const fallbackDelay = isVendorPage ? 500 : 200;
        console.log('⏳ Using fallback delay of', fallbackDelay, 'ms');
        
        setTimeout(() => {
          console.log('🔄 Step 5 Fallback 1: Trying router.push...');
          try {
            router.push('/(tabs)');
            console.log('✅ Step 5 Fallback 1 complete - router.push successful');
          } catch (pushError) {
            console.error('❌ Step 5 Fallback 1 failed - router.push error:', pushError);
            console.log('🔄 Step 5 Fallback 2: Trying window.location.replace...');
            
            // Use window.location.replace instead of router for final fallback
            setTimeout(() => {
              try {
                if (typeof window !== 'undefined') {
                  console.log('🌐 Using window.location.replace for immediate navigation');
                  window.location.replace('/');
                  console.log('✅ Step 5 Fallback 2 complete - window.location.replace used');
                } else {
                  console.error('❌ Step 5 Fallback 2 failed - window not available');
                }
              } catch (windowError) {
                console.error('❌ Step 5 Fallback 2 failed - window.location.replace error:', windowError);
              }
            }, 300);
          }
        }, fallbackDelay);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log('🎉 USERPROFILEHEADER FORCE LOGOUT: Completed successfully');
      console.log('⏰ Total logout duration:', duration, 'ms');
      console.log('⏰ End time:', new Date().toISOString());
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error('❌ USERPROFILEHEADER FORCE LOGOUT: Error occurred:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.log('⏰ Error occurred after:', duration, 'ms');
    } finally {
      // Reset logging out state with delay to prevent quick re-renders
      console.log('🔄 Step 7: Scheduling loggingOut state reset...');
      setTimeout(() => {
        console.log('🔄 Resetting loggingOut state to false');
        setLoggingOut(false);
        console.log('✅ Step 7 complete - loggingOut state reset');
      }, 200);
    }
  };

  const handleProfile = () => {
    if (user?.role === 'vendor') {
      router.push('/vendor/dashboard');
    } else {
      router.push('/(tabs)/profile');
    }
  };

  if (isLoading || loggingOut) {
    return (
      <View style={[
        styles.container,
        style
      ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366f1" size="small" />
          <Text style={styles.loadingText}>
            {loggingOut ? 'Logging out...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!isLoggedIn || !user) {
    // Don't show login button if currently logging out
    if (loggingOut) {
      return (
        <View style={[
          styles.container,
          style
        ]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#6366f1" size="small" />
            <Text style={styles.loadingText}>Logging out...</Text>
          </View>
        </View>
      );
    }
    // Show login/signup button
    return (
      <View style={[
        styles.container,
        isVendorPage && styles.vendorContainer,
        style
      ]}>
        <TouchableOpacity style={[
          styles.loginButton,
          isVendorPage && styles.vendorLoginButton
        ]} onPress={handleLogin}>
          <Text style={[
            styles.loginButtonText,
            isVendorPage && styles.vendorLoginButtonText
          ]}>Login / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🎯 FIXED LAYOUT - Better alignment for vendor pages
  return (
    <View style={[
      styles.container,
      style
    ]}>
      {/* Header Row - Clean layout like gamer version */}
      <View style={styles.headerRow}>
        {/* Left Side - User Info */}
        <View style={styles.leftContent}>
          {/* User Avatar */}
          <TouchableOpacity onPress={handleProfile} style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Details */}
          <TouchableOpacity onPress={handleProfile} style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              Welcome, {user.name}!
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right Side - Actions */}
        <View style={styles.rightContent}>
          {/* Role Badge */}
          <View style={[
            styles.roleBadge,
            user.role === 'vendor' ? styles.vendorRoleBadge : styles.gamerRoleBadge
          ]}>
            <Text style={[
              styles.roleText,
              user.role === 'vendor' ? styles.vendorRoleText : styles.gamerRoleText
            ]}>
              {user.role === 'vendor' ? 'VENDOR' : 'GAMER'}
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            onPress={handleLogout} 
            style={[
              styles.logoutButton,
              loggingOut && styles.logoutButtonDisabled
            ]}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator 
                size="small" 
                color="#6b7280" 
              />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </TouchableOpacity>

          {/* 🔔 NOTIFICATION BELL - Properly aligned */}
          <NotificationBell 
            iconColor="#6366f1" 
            style={styles.notificationBell}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vendorContainer: {
    backgroundColor: '#6366f1',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  vendorLoginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  vendorLoginButtonText: {
    color: '#ffffff',
  },
  // 🎯 FIXED LAYOUT STYLES
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10b981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedIcon: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gamerRoleBadge: {
    backgroundColor: '#f3f4f6',
  },
  vendorRoleBadge: {
    backgroundColor: '#fef3c7',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gamerRoleText: {
    color: '#4b5563',
  },
  vendorRoleText: {
    color: '#92400e',
  },
  logoutButton: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  logoutButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  // 🔔 NOTIFICATION BELL STYLES
  notificationBell: {
    // Clean alignment with other elements
  },
});