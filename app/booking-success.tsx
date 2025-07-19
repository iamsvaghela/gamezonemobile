// app/booking-success.tsx - Complete booking success screen with notification integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export default function BookingSuccessScreen() {
  const { bookingData } = useLocalSearchParams<{ bookingData: string }>();
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10); // Increased countdown
  const [redirecting, setRedirecting] = useState(false);
  const [notificationProcessed, setNotificationProcessed] = useState(false);

  useEffect(() => {
    if (bookingData) {
      try {
        const parsedData = JSON.parse(bookingData);
        setBooking(parsedData);
        console.log('✅ Booking Success Data:', parsedData);
        
        // Process notification and then start countdown
        processBookingNotification(parsedData);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        Alert.alert('Error', 'Invalid booking data');
      }
    }
    setLoading(false);
  }, [bookingData]);

  const processBookingNotification = async (bookingData: any) => {
    try {
      console.log('🔔 Processing booking notification...');
      
      // Import notification service
      const NotificationService = (await import('../../services/NotificationService')).default;
      
      // Create booking confirmation notification
      await NotificationService.createNotification({
        title: '🎉 Booking Confirmed!',
        message: `Your gaming session at ${bookingData.zoneName} is confirmed for ${formatDate(bookingData.date)} at ${formatTime(bookingData.timeSlot)}`,
        type: 'booking_confirmed',
        category: 'booking',
        priority: 'high',
        data: {
          bookingId: bookingData.id,
          zoneId: bookingData.zoneId,
          reference: bookingData.reference,
          zoneName: bookingData.zoneName,
          date: bookingData.date,
          timeSlot: bookingData.timeSlot,
          totalAmount: bookingData.totalAmount
        },
        actions: [
          {
            type: 'view_booking',
            label: 'View Booking'
          },
          {
            type: 'share_booking',
            label: 'Share'
          }
        ]
      });

      // Refresh notifications to show immediately
      await refreshNotifications();
      
      // Small delay to ensure notification is processed
      setTimeout(() => {
        setNotificationProcessed(true);
        console.log('✅ Booking notification processed successfully');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Failed to process booking notification:', error);
      // Continue with countdown even if notification fails
      setNotificationProcessed(true);
    }
  };

  // Start countdown only after notification is processed
  useEffect(() => {
    if (!loading && booking && notificationProcessed && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0 && !redirecting) {
      handleAutoRedirect();
    }
  }, [countdown, loading, booking, notificationProcessed, redirecting]);

  const handleAutoRedirect = () => {
    setRedirecting(true);
    console.log('🔄 Auto-redirecting to appropriate dashboard...');
    
    // Redirect based on user role
    if (user?.role === 'vendor') {
      router.replace('/vendor/dashboard');
    } else {
      router.replace('/(tabs)');
    }
  };

  const cancelAutoRedirect = () => {
    setCountdown(0);
    setRedirecting(false);
    console.log('❌ Auto-redirect cancelled by user');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleShare = async () => {
    if (!booking) return;
    
    const shareMessage = `🎮 GameZone Booking Confirmed!\n\n` +
      `Zone: ${booking.zoneName}\n` +
      `Date: ${formatDate(booking.date)}\n` +
      `Time: ${formatTime(booking.timeSlot)}\n` +
      `Duration: ${booking.duration} hour${booking.duration > 1 ? 's' : ''}\n` +
      `Reference: ${booking.reference}\n\n` +
      `Total Paid: $${booking.totalAmount}\n\n` +
      `Thank you for choosing GameZone!`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'GameZone Booking Confirmation',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRefreshNotifications = async () => {
    try {
      await refreshNotifications();
      Alert.alert('Success', 'Notifications refreshed successfully');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      Alert.alert('Error', 'Failed to refresh notifications');
    }
  };

  const goToHome = () => {
    cancelAutoRedirect();
    router.replace('/');
  };

  const goToBookings = () => {
    cancelAutoRedirect();
    router.replace('/(tabs)/bookings');
  };

  const goToDashboard = () => {
    cancelAutoRedirect();
    if (user?.role === 'vendor') {
      router.replace('/vendor/dashboard');
    } else {
      router.replace('/(tabs)');
    }
  };

  const goToNotifications = () => {
    cancelAutoRedirect();
    router.push('/notifications');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Processing your booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={80} color="#ef4444" />
        <Text style={styles.errorTitle}>No Booking Data</Text>
        <Text style={styles.errorText}>Unable to load booking confirmation</Text>
        <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Auto-redirect notification */}
      {countdown > 0 && !redirecting && notificationProcessed && (
        <View style={styles.redirectNotification}>
          <View style={styles.redirectContent}>
            <Text style={styles.redirectText}>
              🔄 Redirecting to {user?.role === 'vendor' ? 'vendor dashboard' : 'home'} in {countdown}s
            </Text>
            <TouchableOpacity onPress={cancelAutoRedirect} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notification processing indicator */}
      {!notificationProcessed && (
        <View style={styles.processingNotification}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.processingText}>Processing notification...</Text>
        </View>
      )}

      {/* Redirecting overlay */}
      {redirecting && (
        <View style={styles.redirectingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.redirectingText}>
            Redirecting to {user?.role === 'vendor' ? 'vendor dashboard' : 'home'}...
          </Text>
        </View>
      )}

      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>🎉 Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your gaming session is all set
        </Text>
        
        {/* Notification status indicator */}
        {notificationProcessed && (
          <View style={styles.notificationStatus}>
            <Ionicons name="notifications" size={16} color="#10b981" />
            <Text style={styles.notificationStatusText}>
              Notification sent to your device
            </Text>
          </View>
        )}
        
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>Confirmation Number</Text>
          <Text style={styles.referenceNumber}>#{booking.reference}</Text>
        </View>
      </View>

      {/* Booking Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>📋 Booking Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🎮 Zone:</Text>
          <Text style={styles.detailValue}>{booking.zoneName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Date:</Text>
          <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🕐 Time:</Text>
          <Text style={styles.detailValue}>{formatTime(booking.timeSlot)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏱️ Duration:</Text>
          <Text style={styles.detailValue}>
            {booking.duration} hour{booking.duration > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>💰 Total Paid:</Text>
          <Text style={styles.totalValue}>${booking.totalAmount}</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ {booking.status?.toUpperCase() || 'CONFIRMED'}</Text>
          </View>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentText}>💳 {booking.paymentStatus?.toUpperCase() || 'PAID'}</Text>
          </View>
        </View>
      </View>

      {/* Important Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>⚠️ Important Reminders</Text>
        <Text style={styles.infoText}>
          • Please arrive 10 minutes before your scheduled time{'\n'}
          • Bring a valid ID for verification{'\n'}
          • Free cancellation up to 2 hours before your session{'\n'}
          • Contact support if you need assistance
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.dashboardButton} onPress={goToDashboard}>
          <Ionicons name="home-outline" size={20} color="white" />
          <Text style={styles.dashboardButtonText}>
            Go to {user?.role === 'vendor' ? 'Vendor Dashboard' : 'Home'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#6366f1" />
          <Text style={styles.shareButtonText}>Share Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookingsButton} onPress={goToBookings}>
          <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          <Text style={styles.bookingsButtonText}>View All Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notificationsButton} onPress={goToNotifications}>
          <Ionicons name="notifications-outline" size={20} color="#6366f1" />
          <Text style={styles.notificationsButtonText}>View Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshNotifications}>
          <Ionicons name="refresh-outline" size={20} color="#6366f1" />
          <Text style={styles.refreshButtonText}>Refresh Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Development Controls */}
      {__DEV__ && (
        <View style={styles.devControls}>
          <Text style={styles.devTitle}>🛠️ Developer Controls</Text>
          
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => {
              if (booking) {
                processBookingNotification(booking);
              }
            }}
          >
            <Text style={styles.devButtonText}>🔔 Resend Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={() => {
              console.log('📊 Debug Info:');
              console.log('- Booking data:', booking);
              console.log('- Countdown:', countdown);
              console.log('- Notification processed:', notificationProcessed);
              console.log('- Redirecting:', redirecting);
              console.log('- User role:', user?.role);
            }}
          >
            <Text style={styles.devButtonText}>📊 Log Debug Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={() => {
              setCountdown(30);
              setRedirecting(false);
            }}
          >
            <Text style={styles.devButtonText}>⏱️ Reset Countdown</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Thank you for choosing GameZone! 🎮
        </Text>
        <Text style={styles.footerSubtext}>
          Questions? Contact us at support@gamezone.com
        </Text>
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  // Auto-redirect styles
  redirectNotification: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  redirectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redirectText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  processingNotification: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  redirectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  redirectingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  successHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 40,
    paddingTop: 80,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  notificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  notificationStatusText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
    marginLeft: 4,
  },
  referenceContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  referenceLabel: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '600',
    marginBottom: 4,
  },
  referenceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  detailsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#6366f1',
  },
  totalLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  statusBadge: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  paymentBadge: {
    flex: 1,
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fef3c7',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  actionButtons: {
    margin: 20,
    gap: 12,
  },
  dashboardButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dashboardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  shareButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookingsButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  bookingsButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationsButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  notificationsButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  refreshButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  homeButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
  // Development controls
  devControls: {
    backgroundColor: '#1f2937',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 12,
  },
  devButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  devButtonText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});