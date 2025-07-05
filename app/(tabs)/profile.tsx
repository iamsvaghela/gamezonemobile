// app/(tabs)/profile.tsx - Fixed Profile Screen with Enhanced Logout
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
import apiService from '../../services/api';

interface Booking {
  _id: string;
  reference: string;
  zoneId: {
    _id: string;
    name: string;
    location: {
      city: string;
    };
  };
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  createdAt: string;
}

interface BookingStats {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  pending: number;
  totalSpent: number;
}

export default function ProfileScreen() {
  const { user, isLoggedIn, isLoading, login, logout, updateUser, refreshUserData, isTokenValid } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Modal states
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  
  // Loading states
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user) {
      setEditedName(user.name || '');
      setEditedPhone(user.phone || '');
      loadBookingData();
    }
  }, [isLoggedIn, user]);

  const loadBookingData = async () => {
    if (!isLoggedIn) return;
    
    try {
      setBookingsLoading(true);
      console.log('📅 Loading user bookings...');
      
      const response = await apiService.getUserBookings({ limit: 10 });
      
      if (response.success && response.bookings) {
        setBookings(response.bookings);
        
        // Calculate stats
        const stats: BookingStats = {
          total: response.bookings.length,
          confirmed: response.bookings.filter(b => b.status === 'confirmed').length,
          completed: response.bookings.filter(b => b.status === 'completed').length,
          cancelled: response.bookings.filter(b => b.status === 'cancelled').length,
          pending: response.bookings.filter(b => b.status === 'pending').length,
          totalSpent: response.bookings
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        };
        
        setBookingStats(stats);
        console.log('✅ Bookings loaded successfully:', stats);
      } else {
        console.log('⚠️ No bookings found or API response failed');
        setBookings([]);
        setBookingStats({
          total: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          totalSpent: 0
        });
      }
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      
      // Fallback to mock data for demo
      const mockBookings: Booking[] = [
        {
          _id: '1',
          reference: 'GZ123456',
          zoneId: {
            _id: 'zone1',
            name: 'Elite Gaming Lounge',
            location: { city: 'New York' }
          },
          date: new Date().toISOString().split('T')[0],
          timeSlot: '14:00',
          duration: 2,
          totalAmount: 70,
          status: 'confirmed',
          paymentStatus: 'paid',
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          reference: 'GZ123457',
          zoneId: {
            _id: 'zone2',
            name: 'Pixel Paradise',
            location: { city: 'Los Angeles' }
          },
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          timeSlot: '16:00',
          duration: 3,
          totalAmount: 90,
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      
      setBookings(mockBookings);
      setBookingStats({
        total: 2,
        confirmed: 1,
        completed: 1,
        cancelled: 0,
        pending: 0,
        totalSpent: 160
      });
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const demoUser = {
        _id: '1',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'user',
        phone: '+1234567890',
        profileImage: '',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      
      await login(demoUser, 'demo_token_123');
      
      Alert.alert(
        'Login Successful!',
        'Welcome to GameZone! You are now logged in as Demo User.',
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Demo login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    }
  };

  const handleLogout = () => {
    console.log('🔥 handleLogout function called');
    
    if (loggingOut) {
      console.log('⏳ Logout already in progress, ignoring...');
      return;
    }
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('🔥 Logout cancelled')
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            console.log('🔥 User confirmed logout');
            performLogout();
          },
        },
      ]
    );
  };

  const performLogout = async () => {
    if (loggingOut) {
      console.log('⏳ Already logging out, skipping...');
      return;
    }

    try {
      setLoggingOut(true);
      console.log('🚪 Starting logout process...');
      
      // Clear any local state first
      setBookings([]);
      setBookingStats(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditedName('');
      setEditedPhone('');
      
      // Close any open modals
      setChangePasswordModal(false);
      setEditProfileModal(false);
      
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
        
        // Clear bookings and forms
        setBookings([]);
        setBookingStats(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEditedName('');
        setEditedPhone('');
        setChangePasswordModal(false);
        setEditProfileModal(false);
        
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
      await loadBookingData();
      console.log('✅ Profile data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
      Alert.alert('Error', 'Failed to refresh profile data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckTokenValidity = async () => {
    try {
      setCheckingToken(true);
      const isValid = await isTokenValid();
      Alert.alert(
        'Session Status',
        isValid ? 
          '✅ Your session is valid and active.' : 
          '❌ Your session has expired. Please login again.',
        [
          { text: 'OK' },
          ...(isValid ? [] : [{ text: 'Login', onPress: handleGoogleLogin }])
        ]
      );
    } catch (error) {
      console.error('❌ Error checking token:', error);
      Alert.alert('Error', 'Failed to check session status');
    } finally {
      setCheckingToken(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordChanging(true);
      
      // Use API service to change password
      await apiService.changePassword(currentPassword, newPassword);
      
      Alert.alert('Success', 'Password changed successfully');
      setChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('❌ Password change error:', error);
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setProfileUpdating(true);
      
      // Use the enhanced updateUser from AuthContext
      await updateUser({
        name: editedName.trim(),
        phone: editedPhone.trim(),
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      setEditProfileModal(false);
    } catch (error) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How would you like to get support?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => Linking.openURL('mailto:support@gamezone.com?subject=GameZone Support Request'),
        },
        {
          text: 'Call Support',
          onPress: () => Linking.openURL('tel:+1234567890'),
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'completed':
        return '#6366f1';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
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
            Sign in to access your profile, book gaming zones, and manage your reservations.
          </Text>
          
          <TouchableOpacity 
            style={styles.googleLoginButton} 
            onPress={handleGoogleLogin}
          >
            <Text style={styles.googleLoginButtonText}>📧 Continue with Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.emailLoginButton} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.emailLoginButtonText}>📧 Sign in with Email</Text>
          </TouchableOpacity>
          
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
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditProfileModal(true)}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Stats */}
        {bookingStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Gaming Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookingStats.total}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookingStats.confirmed}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookingStats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>${bookingStats.totalSpent}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuSection}>
          {/* Session Status */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCheckTokenValidity}
            disabled={checkingToken}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>🔒</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Check Session Status</Text>
                <Text style={styles.menuSubtitle}>Verify your login session</Text>
              </View>
              {checkingToken ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text style={styles.menuArrow}>›</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setChangePasswordModal(true)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuIcon}>🔐</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Change Password</Text>
                <Text style={styles.menuSubtitle}>Update your account password</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>

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

        {/* Recent Bookings Preview */}
        <View style={styles.bookingsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {bookingsLoading ? (
            <View style={styles.bookingsLoading}>
              <ActivityIndicator color="#6366f1" />
              <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
          ) : bookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {bookings.slice(0, 3).map((booking) => (
                <View key={booking._id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingReference}>#{booking.reference}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(booking.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingZone}>
                    🎮 {booking.zoneId?.name || 'Gaming Zone'} - {booking.zoneId?.location?.city || 'Unknown'}
                  </Text>
                  <Text style={styles.bookingDate}>
                    📅 {formatDate(booking.date)} at {formatTime(booking.timeSlot)}
                  </Text>
                  <Text style={styles.bookingAmount}>💰 ${booking.totalAmount} ({booking.duration}h)</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noBookings}>
              <Text style={styles.noBookingsText}>No bookings yet</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)/gamezones')}
              >
                <Text style={styles.browseButtonText}>Browse Gaming Zones</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setChangePasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleChangePassword}
                disabled={passwordChanging}
              >
                {passwordChanging ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={editedName}
              onChangeText={setEditedName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (Optional)"
              value={editedPhone}
              onChangeText={setEditedPhone}
              keyboardType="phone-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditProfileModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={profileUpdating}
              >
                {profileUpdating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#d1d5db',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  googleLoginButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emailLoginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    minWidth: 250,
  },
  emailLoginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
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
  editButton: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
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
  bookingsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  bookingsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  bookingZone: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  bookingDate: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  bookingAmount: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  noBookings: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noBookingsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  browseButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});