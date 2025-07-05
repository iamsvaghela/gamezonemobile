// app/booking-success.tsx - Simple success screen for immediate testing
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

export default function BookingSuccessScreen() {
  const { bookingData } = useLocalSearchParams<{ bookingData: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingData) {
      try {
        const parsedData = JSON.parse(bookingData);
        setBooking(parsedData);
        console.log('✅ Booking Success Data:', parsedData);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        Alert.alert('Error', 'Invalid booking data');
      }
    }
    setLoading(false);
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
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>🎉 Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your gaming session is all set
        </Text>
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
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookingsButton} onPress={goToBookings}>
          <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          <Text style={styles.bookingsButtonText}>View All Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
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
  successHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
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
  shareButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shareButtonText: {
    color: 'white',
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