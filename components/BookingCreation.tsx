// components/BookingCreation.tsx - Enhanced booking creation with conflict handling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ZoneAvailability {
  success: boolean;
  date: string;
  zoneId: string;
  zoneName: string;
  operatingHours: {
    start: string;
    end: string;
  };
  availability: Record<string, boolean>;
  availableSlots: string[];
  bookedSlots: string[];
  totalAvailable: number;
  totalBooked: number;
}

export default function BookingCreation() {
  const { user, isLoggedIn } = useAuth();
  const { zoneId, zoneName, pricePerHour } = useLocalSearchParams<{
    zoneId: string;
    zoneName: string;
    pricePerHour: string;
  }>();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState<ZoneAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
  }, []);

  useEffect(() => {
    if (selectedDate && zoneId) {
      loadZoneAvailability();
    }
  }, [selectedDate, zoneId]);

  const loadZoneAvailability = async () => {
    try {
      setLoadingAvailability(true);
      
      console.log('🔍 Loading availability for:', zoneId, selectedDate);
      
      const response = await apiService.getAvailability(zoneId, selectedDate);
      console.log('✅ Availability loaded:', response);
      
      setAvailability(response);
      
      // Create time slots array
      const slots: TimeSlot[] = [];
      const startHour = parseInt(response.operatingHours.start.split(':')[0]);
      const endHour = parseInt(response.operatingHours.end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        slots.push({
          time: timeString,
          available: response.availability[timeString] || false
        });
      }
      
      setTimeSlots(slots);
      
    } catch (error) {
      console.error('❌ Error loading availability:', error);
      Alert.alert(
        'Availability Error',
        'Failed to load available time slots. Please try again.'
      );
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to create a booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Missing Information', 'Please select a date and time slot.');
      return;
    }

    // Validate booking is for future date
    const bookingDate = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate <= today) {
      Alert.alert('Invalid Date', 'Please select a future date for your booking.');
      return;
    }

    // Check if selected time slot is still available
    const selectedSlot = timeSlots.find(slot => slot.time === selectedTimeSlot);
    if (!selectedSlot?.available) {
      Alert.alert(
        'Time Slot Unavailable',
        'The selected time slot is no longer available. Please choose another time.',
        [
          { text: 'OK', onPress: loadZoneAvailability }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      
      const bookingData = {
        zoneId,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        duration,
        notes: notes.trim()
      };
      
      console.log('🔄 Creating booking:', bookingData);
      
      const response = await apiService.createBooking(bookingData);
      
      console.log('✅ Booking created successfully:', response);
      
      Alert.alert(
        'Booking Confirmed!',
        `Your booking has been confirmed.\n\nReference: ${response.booking.reference}\nTotal: $${response.booking.totalAmount}`,
        [
          {
            text: 'View Bookings',
            onPress: () => router.push('/(tabs)/bookings')
          },
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('409') || error.message.includes('conflict')) {
          Alert.alert(
            'Time Slot Conflict',
            'The selected time slot is no longer available. Please choose another time.',
            [
              { text: 'Choose Different Time', onPress: loadZoneAvailability },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else if (error.message.includes('operating hours')) {
          Alert.alert(
            'Outside Operating Hours',
            'Your selected time is outside the zone\'s operating hours. Please choose a different time.'
          );
        } else {
          Alert.alert(
            'Booking Failed',
            'Failed to create booking. Please try again or contact support.'
          );
        }
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateTotal = () => {
    const hourlyRate = parseFloat(pricePerHour || '0');
    return (hourlyRate * duration).toFixed(2);
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow booking up to 30 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Gaming Session</Text>
        </View>
        
        <View style={styles.loginPrompt}>
          <Ionicons name="lock-closed" size={64} color="#9ca3af" />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginSubtitle}>
            Please login to create a booking at {zoneName}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Gaming Session</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>{zoneName}</Text>
          <Text style={styles.zonePrice}>${pricePerHour}/hour</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity style={styles.dateButton}>
            <Ionicons name="calendar" size={20} color="#6366f1" />
            <Text style={styles.dateButtonText}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            You can book up to 30 days in advance
          </Text>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationContainer}>
            {[1, 2, 3, 4, 6, 8].map(hours => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.durationButton,
                  duration === hours && styles.selectedDurationButton
                ]}
                onPress={() => setDuration(hours)}
              >
                <Text style={[
                  styles.durationButtonText,
                  duration === hours && styles.selectedDurationButtonText
                ]}>
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Time Slots
            {loadingAvailability && (
              <ActivityIndicator size="small" color="#6366f1" style={styles.loadingIndicator} />
            )}
          </Text>
          
          {availability && (
            <View style={styles.availabilityInfo}>
              <Text style={styles.availabilityText}>
                {availability.totalAvailable} available, {availability.totalBooked} booked
              </Text>
              <Text style={styles.operatingHours}>
                Open: {formatTimeSlot(availability.operatingHours.start)} - {formatTimeSlot(availability.operatingHours.end)}
              </Text>
            </View>
          )}

          <View style={styles.timeSlotsContainer}>
            {timeSlots.map(slot => (
              <TouchableOpacity
                key={slot.time}
                style={[
                  styles.timeSlotButton,
                  !slot.available && styles.unavailableTimeSlot,
                  selectedTimeSlot === slot.time && styles.selectedTimeSlot
                ]}
                onPress={() => slot.available && setSelectedTimeSlot(slot.time)}
                disabled={!slot.available}
              >
                <Text style={[
                  styles.timeSlotText,
                  !slot.available && styles.unavailableTimeSlotText,
                  selectedTimeSlot === slot.time && styles.selectedTimeSlotText
                ]}>
                  {formatTimeSlot(slot.time)}
                </Text>
                {!slot.available && (
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {loadingAvailability && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading availability...</Text>
            </View>
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requests or notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{notes.length}/500</Text>
        </View>

        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Not selected'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>
              {selectedTimeSlot ? formatTimeSlot(selectedTimeSlot) : 'Not selected'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{duration} hour{duration > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rate:</Text>
            <Text style={styles.summaryValue}>${pricePerHour}/hour</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${calculateTotal()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookingButtonContainer}>
        <TouchableOpacity
          style={[
            styles.bookingButton,
            (!selectedDate || !selectedTimeSlot || loading) && styles.disabledButton
          ]}
          onPress={handleCreateBooking}
          disabled={!selectedDate || !selectedTimeSlot || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.bookingButtonText}>Book Now</Text>
              <Text style={styles.bookingButtonPrice}>${calculateTotal()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  zoneInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  zoneName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  zonePrice: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedDurationButton: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  durationButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectedDurationButtonText: {
    color: 'white',
  },
  availabilityInfo: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  availabilityText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
  operatingHours: {
    fontSize: 12,
    color: '#0369a1',
    marginTop: 4,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlotButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTimeSlot: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  unavailableTimeSlot: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: 'white',
  },
  unavailableTimeSlotText: {
    color: '#6b7280',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6366f1',
  },
  notesInput: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  summarySection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
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
  bookingButtonContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookingButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  bookingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingButtonPrice: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
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
});