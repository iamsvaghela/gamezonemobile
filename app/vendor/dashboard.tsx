// app/vendor/dashboard.tsx - Updated with notification integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import UserProfileHeader from '../../components/UserProfileHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to import notification context
let useNotifications: any;
try {
  useNotifications = require('../../contexts/NotificationContext').useNotifications;
} catch (error) {
  console.log('NotificationContext not available, using fallback');
  useNotifications = () => ({ 
    notifications: [],
    refreshNotifications: async () => console.log('Notifications not available'),
    executeAction: async () => console.log('Action not available')
  });
}

interface VendorStats {
  totalZones: number;
  activeZones: number;
  totalBookings: number;
  todayBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface RecentBooking {
  _id: string;
  reference: string;
  zoneName: string;
  customerName: string;
  customerEmail: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  createdAt: string;
}

export default function VendorDashboard() {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  
  // Add notification context
  const notificationData = useNotifications();
  const { notifications, refreshNotifications, executeAction } = notificationData || { 
    notifications: [], 
    refreshNotifications: async () => {}, 
    executeAction: async () => {} 
  };
  
  const [stats, setStats] = useState<VendorStats>({
    totalZones: 0,
    activeZones: 0,
    totalBookings: 0,
    todayBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

  // Redirect non-vendors with proper timing
  useEffect(() => {
    const checkAndRedirect = async () => {
      // Don't do anything if still loading auth
      if (isLoading) {
        console.log('🔄 Auth still loading, waiting...');
        return;
      }
      
      // Wait a bit for the app to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isLoggedIn || !user || user.role !== 'vendor') {
        console.log('🚫 Non-vendor accessing dashboard, redirecting...');
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback navigation
          setTimeout(() => {
            router.push('/(tabs)');
          }, 500);
        }
        return;
      }
      
      // Load dashboard data only if user is valid vendor
      loadDashboardData();
    };

    checkAndRedirect();
  }, [isLoggedIn, user, isLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading vendor dashboard data...');
      
      // Simulate API calls with mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock stats data
      const mockStats: VendorStats = {
        totalZones: 5,
        activeZones: 4,
        totalBookings: 127,
        todayBookings: 8,
        totalRevenue: 15640,
        monthlyRevenue: 3200,
      };
      
      // Mock recent bookings
      const mockBookings: RecentBooking[] = [
        {
          _id: '1',
          reference: 'GZ-ABC123',
          zoneName: 'Elite Gaming Lounge',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          date: '2025-01-20',
          timeSlot: '14:00',
          duration: 2,
          totalAmount: 70,
          status: 'confirmed',
          createdAt: '2025-01-19T10:30:00Z',
        },
        {
          _id: '2',
          reference: 'GZ-XYZ789',
          zoneName: 'Cyber Arena',
          customerName: 'Sarah Smith',
          customerEmail: 'sarah@example.com',
          date: '2025-01-20',
          timeSlot: '16:00',
          duration: 3,
          totalAmount: 90,
          status: 'pending',
          createdAt: '2025-01-19T09:15:00Z',
        },
        {
          _id: '3',
          reference: 'GZ-DEF456',
          zoneName: 'Gaming Hub',
          customerName: 'Mike Johnson',
          customerEmail: 'mike@example.com',
          date: '2025-01-19',
          timeSlot: '18:00',
          duration: 4,
          totalAmount: 120,
          status: 'completed',
          createdAt: '2025-01-19T08:45:00Z',
        },
      ];
      
      setStats(mockStats);
      setRecentBookings(mockBookings);
      
      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      refreshNotifications()
    ]);
    setRefreshing(false);
  };

  // Handle booking actions from notifications
  const handleBookingAction = async (notificationId: string, bookingId: string, action: 'confirm' | 'decline') => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    
    try {
      console.log(`🔄 ${action}ing booking ${bookingId} from notification ${notificationId}`);
      
      // Execute the notification action
      await executeAction(notificationId, action);
      
      Alert.alert(
        'Success',
        `Booking ${action}ed successfully! The customer has been notified.`,
        [{ text: 'OK', onPress: onRefresh }]
      );
      
    } catch (error) {
      console.error(`❌ Error ${action}ing booking:`, error);
      Alert.alert('Error', `Failed to ${action} booking. Please try again.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter booking notifications for vendor
  const bookingNotifications = notifications.filter((notification: any) => 
    notification.type === 'booking_request' && notification.data && notification.data.bookingId
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#6366f1']}
          tintColor="#6366f1"
        />
      }
    >
      {/* Header Section - Same as AuthHeader structure */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>🏢 Vendor Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage your gaming zones and bookings
          </Text>
        </View>
      </View>

      {/* Content - Same structure as home screen */}
      <View style={styles.content}>
        {/* User Profile Header */}
        <UserProfileHeader style={styles.profileHeader} />

        {/* Pending Booking Notifications */}
        {bookingNotifications.length > 0 && (
          <View style={styles.notificationSection}>
            <Text style={styles.notificationTitle}>
              <Ionicons name="notifications" size={20} color="#007AFF" />
              {' '}Pending Booking Requests ({bookingNotifications.length})
            </Text>
            
            {bookingNotifications.map((notification: any) => (
              <View key={notification.id} style={styles.notificationCard}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitleText}>{notification.title}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
                
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                
                {notification.data && (
                  <View style={styles.bookingDetails}>
                    <Text style={styles.bookingInfo}>
                      Amount: ${notification.data.amount}
                    </Text>
                    <Text style={styles.bookingInfo}>
                      Date: {notification.data.date}
                    </Text>
                    <Text style={styles.bookingInfo}>
                      Time: {notification.data.time}
                    </Text>
                    {notification.data.customerName && (
                      <Text style={styles.bookingInfo}>
                        Customer: {notification.data.customerName}
                      </Text>
                    )}
                  </View>
                )}
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleBookingAction(notification.id, notification.data.bookingId, 'confirm')}
                    disabled={actionLoading[notification.data.bookingId]}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.actionButtonText}>
                      {actionLoading[notification.data.bookingId] ? 'Confirming...' : 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleBookingAction(notification.id, notification.data.bookingId, 'decline')}
                    disabled={actionLoading[notification.data.bookingId]}
                  >
                    <Ionicons name="close" size={16} color="white" />
                    <Text style={styles.actionButtonText}>
                      {actionLoading[notification.data.bookingId] ? 'Declining...' : 'Decline'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stats Overview - Same as home screen */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {stats.totalZones}+
            </Text>
            <Text style={styles.statLabel}>Gaming Zones</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {stats.totalBookings.toLocaleString()}+
            </Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              ${stats.totalRevenue.toLocaleString()}+
            </Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionTitle}>Add Zone</Text>
              <Text style={styles.actionDescription}>
                Create new gaming zone
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionTitle}>Manage Zones</Text>
              <Text style={styles.actionDescription}>
                Edit existing zones
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Recent Bookings</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {recentBookings.map((booking) => (
                <View key={booking._id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingReference}>{booking.reference}</Text>
                      <Text style={styles.bookingZone}>{booking.zoneName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.bookingDetailsSection}>
                    <Text style={styles.bookingDetailText}>👤 {booking.customerName}</Text>
                    <Text style={styles.bookingDetailText}>
                      📅 {formatDate(booking.date)} at {formatTime(booking.timeSlot)}
                    </Text>
                    <Text style={styles.bookingDetailText}>⏱️ {booking.duration} hour{booking.duration > 1 ? 's' : ''}</Text>
                  </View>
                  
                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingAmount}>${booking.totalAmount}</Text>
                    <Text style={styles.bookingDate}>
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Recent Bookings</Text>
              <Text style={styles.emptyText}>
                New bookings will appear here when customers make reservations
              </Text>
            </View>
          )}
        </View>

        {/* Performance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Performance Summary</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>This Month</Text>
              <Text style={styles.performanceValue}>${stats.monthlyRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Average per Booking</Text>
              <Text style={styles.performanceValue}>
                ${Math.round(stats.totalRevenue / stats.totalBookings || 0)}
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Zone Utilization</Text>
              <Text style={styles.performanceValue}>
                {Math.round((stats.activeZones / stats.totalZones) * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Styles based on AuthHeader and home screen patterns
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
    marginTop: 12,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    marginBottom: 20,
  },
  // Notification styles
  notificationSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  notificationCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  bookingDetails: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  bookingInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 0.48,
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Existing styles
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  bookingZone: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetailsSection: {
    gap: 4,
    marginBottom: 12,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#4b5563',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  bookingDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
});