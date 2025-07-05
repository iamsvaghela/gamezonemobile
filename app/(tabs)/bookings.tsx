// app/(tabs)/bookings.tsx - Updated with real API integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

// Updated interface to match your API response
interface Booking {
  _id: string;
  reference: string;
  zoneId: {
    _id: string;
    name: string;
    location: {
      address: string;
      city: string;
    };
    images: string[];
    pricePerHour: number;
    rating: number;
  };
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  qrCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function BookingsScreen() {
  const { user, isLoggedIn } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    filterBookings(filterStatus);
  }, [bookings, filterStatus]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 Loading bookings for user:', user?.email);
      
      // Fetch real bookings from API
      const response = await apiService.getUserBookings();
      
      console.log('✅ Bookings loaded:', response.bookings);
      setBookings(response.bookings || []);
      
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      setError('Failed to load bookings. Please try again.');
      
      // Show user-friendly error message
      Alert.alert(
        'Error Loading Bookings',
        'We couldn\'t load your bookings. Please check your internet connection and try again.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: loadBookings }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = (status: FilterStatus) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let filtered = bookings;
    
    switch (status) {
      case 'upcoming':
        filtered = bookings.filter(booking => {
          const bookingDate = new Date(booking.date);
          const todayDate = new Date(today);
          return bookingDate >= todayDate && 
                 (booking.status === 'confirmed' || booking.status === 'pending');
        });
        break;
      case 'completed':
        filtered = bookings.filter(booking => booking.status === 'completed');
        break;
      case 'cancelled':
        filtered = bookings.filter(booking => booking.status === 'cancelled');
        break;
      default:
        filtered = bookings;
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredBookings(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleBookingPress = (booking: Booking) => {
    const statusText = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
    const paymentText = booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1);
    
    Alert.alert(
      booking.zoneId.name,
      `Reference: ${booking.reference}\nStatus: ${statusText}\nPayment: ${paymentText}\nTotal: $${booking.totalAmount}\n\nDate: ${formatDate(booking.date)}\nTime: ${formatTime(booking.timeSlot)}\nDuration: ${booking.duration} hour${booking.duration > 1 ? 's' : ''}`,
      [
        { text: 'OK' },
        ...(booking.status === 'confirmed' || booking.status === 'pending' ? [
          { 
            text: 'Cancel Booking', 
            style: 'destructive', 
            onPress: () => handleCancelBooking(booking._id) 
          }
        ] : []),
        ...(booking.qrCode ? [
          { 
            text: 'View QR Code', 
            onPress: () => showQRCode(booking.qrCode!) 
          }
        ] : [])
      ]
    );
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? Cancellation policies may apply.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const response = await apiService.cancelBooking(bookingId);
              
              Alert.alert('Success', response.message || 'Booking cancelled successfully');
              
              // Refresh bookings list
              await loadBookings();
              
            } catch (error) {
              console.error('Cancel booking error:', error);
              Alert.alert(
                'Cancellation Failed',
                'We couldn\'t cancel your booking. Please try again or contact support.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const showQRCode = (qrCode: string) => {
    Alert.alert(
      'QR Code',
      `Your booking QR code: ${qrCode}\n\nShow this QR code at the gaming zone for quick check-in.`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
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

  const isUpcoming = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date >= today;
  };

  const renderBookingItem = ({ item: booking }: { item: Booking }) => (
    <TouchableOpacity 
      style={styles.bookingCard}
      onPress={() => handleBookingPress(booking)}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.zoneName} numberOfLines={1}>{booking.zoneId.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Ionicons 
            name={getStatusIcon(booking.status) as any} 
            size={12} 
            color="white" 
          />
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#64748b" />
          <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {formatTime(booking.timeSlot)} • {booking.duration}h
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card" size={16} color="#64748b" />
          <Text style={styles.detailText}>${booking.totalAmount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.detailText}>{booking.zoneId.location.city}</Text>
        </View>
      </View>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.confirmationNumber}>#{booking.reference}</Text>
        {isUpcoming(booking.date) && booking.status === 'confirmed' && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingText}>Upcoming</Text>
          </View>
        )}
        {booking.qrCode && (
          <View style={styles.qrBadge}>
            <Ionicons name="qr-code" size={12} color="#6366f1" />
            <Text style={styles.qrText}>QR</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (status: FilterStatus, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.activeFilterButton
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterButtonText,
        filterStatus === status && styles.activeFilterButtonText
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        
        <View style={styles.notAuthenticatedContainer}>
          <View style={styles.loginPrompt}>
            <Ionicons name="calendar-outline" size={80} color="#9ca3af" />
            <Text style={styles.loginTitle}>Sign In Required</Text>
            <Text style={styles.loginSubtitle}>
              Sign in to view your booking history and manage your reservations
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const upcomingCount = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    const today = new Date();
    return bookingDate >= today && (b.status === 'confirmed' || b.status === 'pending');
  }).length;
  
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', bookings.length)}
        {renderFilterButton('upcoming', 'Upcoming', upcomingCount)}
        {renderFilterButton('completed', 'Completed', completedCount)}
        {renderFilterButton('cancelled', 'Cancelled', cancelledCount)}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' ? 'No bookings yet' : `No ${filterStatus} bookings`}
            </Text>
            <Text style={styles.emptyDescription}>
              {filterStatus === 'all' 
                ? 'Book your first gaming session to get started!'
                : `You don't have any ${filterStatus} bookings at the moment.`
              }
            </Text>
            {filterStatus === 'all' && (
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)/gamezones')}
              >
                <Text style={styles.browseButtonText}>Browse Gaming Zones</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    marginTop: 12,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  notAuthenticatedContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loginPrompt: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  confirmationNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  upcomingBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upcomingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46',
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qrText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});