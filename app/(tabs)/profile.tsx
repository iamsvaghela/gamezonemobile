// app/(tabs)/profile.tsx - Updated with login redirect
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  Linking,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import apiService from '../../services/api';

export default function ProfileScreen() {
  const { user, isLoggedIn, isLoading, login, logout, refreshUserData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleGoogleLogin = async (userData: any, token: string, isNewUser: boolean) => {
    console.log('✅ Google login successful in profile:', userData.email);
    
    try {
      // Use auth context to login
      await login(userData, token);
      
      // Show success message
      Alert.alert(
        'Login Successful!',
        isNewUser ? 
          `Welcome to GameZone, ${userData.name}!` :
          `Welcome back, ${userData.name}!`,
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Login error in profile:', error);
      Alert.alert('Error', 'Login succeeded but failed to complete setup. Please try again.');
    }
  };

  const handleGoogleLoginError = (error: string) => {
    console.error('❌ Google login error in profile:', error);
    Alert.alert(
      'Login Failed',
      `Authentication failed: ${error}`,
      [{ text: 'Try Again', onPress: () => {} }]
    );
  };

  const handleLogout = () => {
    console.log('🔥 handleLogout function called');
    
    if (loggingOut) {
      console.log('⏳ Logout already in progress, ignoring...');
      return;
    }
    
    // Direct logout without Alert dialog (since Alert doesn't work properly)
    console.log('🔥 Proceeding with logout...');
    
    // Add a slight delay to prevent accidental logouts
    setTimeout(() => {
      console.log('🔥 Executing logout after delay...');
      performLogout();
    }, 100);
  };

  const performLogout = async () => {
    if (loggingOut) {
      console.log('⏳ Already logging out, skipping...');
      return;
    }

    try {
      setLoggingOut(true);
      console.log('🚪 Starting logout process...');
      
      console.log('🧹 Local state cleared');
      
      // Perform logout through AuthContext
      await logout();
      console.log('✅ AuthContext logout completed');
      
      // Force navigation to home screen
      console.log('📱 Navigating to home...');
      
      // Use replace to prevent going back to profile
      router.replace('/(tabs)');
      
      // Small delay to ensure navigation completes
      setTimeout(() => {
        console.log('🎉 Logout process completed successfully');
        Alert.alert(
          'Logged Out',
          'You have been successfully logged out.',
          [{ text: 'OK' }]
        );
      }, 100);
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Even if logout fails, clear local state and navigate
      try {
        console.log('🔄 Force logout - clearing state anyway');
        
        // Navigate to home
        router.replace('/(tabs)');
        
        Alert.alert(
          'Session Ended',
          'Your session has been ended. You may need to refresh the app.',
          [{ text: 'OK' }]
        );
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        Alert.alert(
          'Error',
          'There was an issue logging out. Please refresh the app.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRefresh = async () => {
    if (!isLoggedIn) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing profile data...');
      await refreshUserData();
      console.log('✅ Profile data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
      Alert.alert('Error', 'Failed to refresh profile data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSupport = () => {
    // Direct email opening without popup
    Linking.openURL('mailto:support@gamezone.com?subject=GameZone Support Request&body=Hi GameZone Support Team,%0D%0A%0D%0AI need help with:%0D%0A%0D%0A[Please describe your issue here]%0D%0A%0D%0AThank you!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.loginPrompt}>
          <View style={styles.loginIcon}>
            <Text style={styles.loginIconText}>🎮</Text>
          </View>
          <Text style={styles.loginTitle}>Welcome to GameZone!</Text>
          <Text style={styles.loginSubtitle}>
            Sign in with Google to access your profile and book gaming zones.
          </Text>
          
          <GoogleLoginButton
            onSuccess={handleGoogleLogin}
            onError={handleGoogleLoginError}
            role="user"
            style={styles.googleLoginButton}
          />
          
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>Quick and secure login</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📅</Text>
              <Text style={styles.featureText}>Book gaming zones</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Track your reservations</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user.role === 'vendor' ? '🏢 Business Account' : '🎮 Gamer Account'}
              </Text>
            </View>
            {user.createdAt && (
              <Text style={styles.memberSince}>
                Member since {formatDate(user.createdAt)}
              </Text>
            )}
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          {/* Booking History */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>📅</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Booking History</Text>
                <Text style={styles.menuSubtitle}>View all your reservations</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Support */}
          <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>🎧</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Support</Text>
                <Text style={styles.menuSubtitle}>Get help and contact us</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutItem]} 
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.6}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>
                {loggingOut ? '⏳' : '👋'}
              </Text>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, styles.logoutText]}>
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Text>
                <Text style={styles.menuSubtitle}>
                  {loggingOut ? 'Please wait' : 'Sign out of your account'}
                </Text>
              </View>
              {loggingOut ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.menuArrow}>›</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    flex: 2,
  },
  refreshButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginIconText: {
    fontSize: 40,
    color: '#6366f1',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  googleLoginButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#d1d5db',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  features: {
    alignSelf: 'stretch',
    maxWidth: 300,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
  },
  userCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10b981',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  memberSince: {
    fontSize: 12,
    color: '#9ca3af',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  logoutText: {
    color: '#ef4444',
  },
});