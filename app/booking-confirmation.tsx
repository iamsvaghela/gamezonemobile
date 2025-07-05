// app/booking-confirmation.tsx - Updated with real booking data
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

interface BookingConfirmation {
  id: string;
  reference: string;
  zoneName: string;
  zoneId: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  pricePerHour: number;
  status: string;
  paymentStatus: string;
  qrCode?: string;
  cardLast4: string;
  createdAt: string;
}

export default function BookingConfirmationScreen() {
  const { bookingData } = useLocalSearchParams<{ bookingData: string }>();
  const [booking, setBooking] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingData) {
      try {
        const parsedData = JSON.parse(bookingData);
        setBooking(parsedData);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        setLoading(false);
        Alert.alert('Error', 'Invalid booking data', [
          { text: 'OK', onPress: () => router.replace('/') }
        ]);
      }
    } else {
      setLoading(false);
      Alert.alert('Error', 'No booking data found', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    }
  }, [bookingData]);

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

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (duration * 60);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endTimeString = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    return formatTime(endTimeString);
  };

  const handleShare = async () => {
    if (!booking) return;
    
    const shareMessage = `🎮 GameZone Booking Confirmed!\n\n` +
      `Zone: ${booking.zoneName}\n` +
      `Date: ${formatDate(booking.date)}\n` +
      `Time: ${formatTime(booking.timeSlot)} - ${calculateEndTime(booking.timeSlot, booking.duration)}\n` +
      `Duration: ${booking.duration} hour${booking.duration > 1 ? 's' : ''}\n` +
      `Confirmation: ${booking.reference}\n\n` +
      `Total Paid: $${booking.totalAmount}`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'GameZone Booking Confirmation',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToCalendar = () => {
    if (!booking) return;
    
    Alert.alert(
      'Add to Calendar',
      `Add "${booking.zoneName}" booking to your calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: () => {
          // In a real app, integrate with device calendar
          Alert.alert('Success', 'Booking added to calendar!');
        }}
      ]
    );
  };

  const handleViewBooking = async () => {
    if (!booking) return;
    
    try {
      // Fetch latest booking details
      const response = await apiService.getBooking(booking.id);
      
      Alert.alert(
        'Booking Details',
        `Status: ${response.booking.status.toUpperCase()}\n` +
        `Payment: ${response.booking.paymentStatus.toUpperCase()}\n` +
        `Reference: ${response.booking.reference}`,
        [
          { text: 'OK' },
          { text: 'View All Bookings', onPress: () => router.push('/(tabs)/bookings') }
        ]
      );
    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to fetch booking details');
    }
  };

  const handleCancelBooking = () => {
    if (!booking) return;
    
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? You may be charged a cancellation fee.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.cancelBooking(booking.id, 'User requested cancellation');
              Alert.alert(
                'Booking Cancelled',
                'Your booking has been cancelled successfully.',
                [
                  { text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }
                ]
              );
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const goToHome = () => {
    router.replace('/');
  };

  const goToBookings = () => {
    router.replace('/(tabs)/bookings');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading confirmation...</Text>
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

  const isUpcoming = () => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  };

  const canBeCancelled = () => {
    const bookingDateTime = new Date(booking.date);
    const [hours, minutes] = booking.timeSlot.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const timeDiff = bookingDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff > 2 && booking.status === 'confirmed';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
        <Text style={styles.successSubtitle}>
          Your gaming session is all set
        </Text>
        <Text style={styles.confirmationNumber}>
          #{booking.reference}
        </Text>
      </View>

      {/* Booking Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Booking Details</Text>
        <View style={styles.detailsContainer}>
          <View style={styles.zoneHeader}>
            <Text style={styles.zoneName}>{booking.zoneName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Ionicons name={getStatusIcon(booking.status) as any} size={16} color="#fff" />
              <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={20} color="#6366f1" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={20} color="#6366f1" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {formatTime(booking.timeSlot)} - {calculateEndTime(booking.timeSlot, booking.duration)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="hourglass" size={20} color="#6366f1" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {booking.duration} hour{booking.duration > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="receipt" size={20} color="#6366f1" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>{booking.id}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Payment Details</Text>
        <View style={styles.paymentContainer}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Rate:</Text>
            <Text style={styles.paymentValue}>${booking.pricePerHour}/hour</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Duration:</Text>
            <Text style={styles.paymentValue}>{booking.duration} hour{booking.duration > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal:</Text>
            <Text style={styles.paymentValue}>${booking.totalAmount}</Text>
          </View>
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid:</Text>
            <Text style={styles.totalValue}>${booking.totalAmount}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Ionicons name="card" size={16} color="#64748b" />
            <Text style={styles.cardText}>
              Paid with card ending in {booking.cardLast4}
            </Text>
            <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(booking.paymentStatus) }]}>
              <Text style={styles.paymentStatusText}>{booking.paymentStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* QR Code Section */}
      {booking.qrCode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 QR Code</Text>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code" size={120} color="#6366f1" />
            <Text style={styles.qrText}>
              Show this QR code at the gaming zone for quick check-in
            </Text>
          </View>
        </View>
      )}

      {/* Important Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Important Information</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.infoText}>
              Please arrive 10 minutes before your scheduled time
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color="#f59e0b" />
            <Text style={styles.infoText}>
              Bring a valid ID for verification
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#f59e0b" />
            <Text style={styles.infoText}>
              Free cancellation up to 2 hours before your session
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.primaryButtonText}>Share Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleAddToCalendar}>
          <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          <Text style={styles.secondaryButtonText}>Add to Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleViewBooking}>
          <Ionicons name="eye-outline" size={20} color="#6366f1" />
          <Text style={styles.secondaryButtonText}>View Booking Details</Text>
        </TouchableOpacity>

        {isUpcoming() && canBeCancelled() && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.navButton} onPress={goToBookings}>
            <Text style={styles.navButtonText}>View All Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={goToHome}>
            <Text style={styles.navButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Thank you for choosing GameZone! 🎮
        </Text>
        <Text style={styles.footerSubtext}>
          Questions? Contact us at support@gamezone.com
        </Text>
      </View>
    </ScrollView>
  );
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed': return '#10b981';
    case 'pending': return '#f59e0b';
    case 'completed': return '#6366f1';
    case 'cancelled': return '#ef4444';
    default: return '#64748b';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'checkmark-circle';
    case 'pending': return 'time';
    case 'completed': return 'checkmark-done-circle';
    case 'cancelled': return 'close-circle';
    default: return 'help-circle';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid': return '#10b981';
    case 'pending': return '#f59e0b';
    case 'refunded': return '#6366f1';
    case 'failed': return '#ef4444';
    default: return '#64748b';
  }
};

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
  homeButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  zoneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  detailRow: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  paymentContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#6366f1',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cardText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  qrText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    lineHeight: 20,
  },
  actionSection: {
    margin: 16,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
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