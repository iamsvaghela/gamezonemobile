// app/booking/[id].tsx - Fixed version using apiService
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface GameZone {
  _id: string;
  name: string;
  description: string;
  pricePerHour: number;
  rating: number;
  totalReviews: number;
  images: string[];
  location: {
    address: string;
    city: string;
    state: string;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  capacity: number;
  amenities: string[];
  isActive: boolean;
}

export default function BookingFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [zone, setZone] = useState<GameZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadZoneDetails();
    }
  }, [id]);

  // Generate time slots after zone details are loaded
  useEffect(() => {
    if (zone) {
      generateTimeSlots();
    }
  }, [zone]);

  const loadZoneDetails = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading zone details for ID:', id);
      
      // Use direct fetch since it works consistently
      const response = await fetch(`https://gamezone-production.up.railway.app/api/gamezones/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📱 Direct fetch response:', data);
      
      // Handle different response formats
      let gameZone = null;
      
      if (data.gamezone) {
        // Format: { success: true, gamezone: {...} }
        gameZone = data.gamezone;
      } else if (data._id) {
        // Direct gamezone object
        gameZone = data;
      } else if (data.success && data.data) {
        // Format: { success: true, data: {...} }
        gameZone = data.data;
      } else {
        // Try to find the zone in any property
        for (const key in data) {
          if (data[key] && typeof data[key] === 'object' && data[key]._id) {
            gameZone = data[key];
            break;
          }
        }
      }
      
      if (!gameZone) {
        throw new Error('Zone not found in response');
      }
      
      // Ensure required fields exist
      const formattedZone = {
        _id: gameZone._id,
        name: gameZone.name || 'Unknown Zone',
        description: gameZone.description || '',
        pricePerHour: gameZone.pricePerHour || 0,
        rating: gameZone.rating || 0,
        totalReviews: gameZone.totalReviews || 0,
        images: gameZone.images || [],
        location: gameZone.location || {
          address: '',
          city: '',
          state: ''
        },
        operatingHours: gameZone.operatingHours || {
          start: '09:00',
          end: '22:00'
        },
        capacity: gameZone.capacity || 1,
        amenities: gameZone.amenities || [],
        isActive: gameZone.isActive !== false
      };
      
      setZone(formattedZone);
      console.log('✅ Zone details loaded:', formattedZone.name);
      
    } catch (error) {
      console.error('❌ Load zone details error:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load zone details';
      
      Alert.alert(
        'Error Loading Zone',
        errorMessage,
        [
          { text: 'Try Again', onPress: () => loadZoneDetails() },
          { text: 'Go Back', onPress: () => router.back() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    
    if (zone && zone.operatingHours) {
      // Use actual zone operating hours
      const startHour = parseInt(zone.operatingHours.start.split(':')[0]);
      const endHour = parseInt(zone.operatingHours.end.split(':')[0]);
      
      console.log(`🕐 Generating time slots from ${zone.operatingHours.start} to ${zone.operatingHours.end}`);
      console.log(`🕐 Start hour: ${startHour}, End hour: ${endHour}`);
      
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        // Add 30-minute slot if not the last hour
        if (hour < endHour - 1) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    } else {
      // Fallback to default hours if zone operating hours not available
      console.log('⚠️ Using fallback operating hours (9 AM - 10 PM)');
      for (let hour = 9; hour <= 22; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 22) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    
    console.log(`🕐 Generated ${slots.length} time slots:`, slots);
    setAvailableSlots(slots);
  };

  const getNextWeekDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const calculateTotal = () => {
    if (!zone) return 0;
    return zone.pricePerHour * duration;
  };

  const handleBooking = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    if (!zone) {
      Alert.alert('Error', 'Zone information not available');
      return;
    }

    // Validate that selected time is within operating hours
    const selectedHour = parseInt(selectedTime.split(':')[0]);
    const selectedMinutes = parseInt(selectedTime.split(':')[1]);
    const startHour = parseInt(zone.operatingHours.start.split(':')[0]);
    const endHour = parseInt(zone.operatingHours.end.split(':')[0]);
    const bookingEndHour = selectedHour + duration;
    
    console.log('⏰ Booking validation:', {
      selectedTime,
      selectedHour,
      duration,
      bookingEndHour,
      operatingHours: zone.operatingHours,
      startHour,
      endHour
    });
    
    if (selectedHour < startHour || bookingEndHour > endHour) {
      Alert.alert(
        'Invalid Time Selection',
        `Please select a time within operating hours (${zone.operatingHours.start} - ${zone.operatingHours.end}). Your booking of ${duration} hour(s) starting at ${selectedTime} would end at ${bookingEndHour}:00.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const bookingData = {
      zoneId: id,
      zoneName: zone.name,
      date: selectedDate.toISOString().split('T')[0],
      timeSlot: selectedTime,
      duration: duration,
      totalAmount: calculateTotal(),
      pricePerHour: zone.pricePerHour,
    };

    console.log('📅 Booking data:', bookingData);

    // Navigate to payment screen
    router.push({
      pathname: '/payment',
      params: {
        bookingData: JSON.stringify(bookingData),
      }
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!zone) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Zone Not Found</Text>
        <Text style={styles.errorText}>
          The gaming zone you're looking for is not available or may have been removed.
        </Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadZoneDetails()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Zone Info Header */}
      <View style={styles.zoneHeader}>
        <TouchableOpacity 
          style={styles.backIcon}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zonePrice}>${zone.pricePerHour}/hour</Text>
        {zone.description && (
          <Text style={styles.zoneDescription}>{zone.description}</Text>
        )}
        <View style={styles.operatingHours}>
          <Ionicons name="time" size={16} color="white" />
          <Text style={styles.operatingHoursText}>
            Open: {zone.operatingHours.start} - {zone.operatingHours.end}
          </Text>
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {getNextWeekDates().map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCard,
                isSameDate(date, selectedDate) && styles.selectedDateCard
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[
                styles.dateCardDay,
                isSameDate(date, selectedDate) && styles.selectedDateText
              ]}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dateCardDate,
                isSameDate(date, selectedDate) && styles.selectedDateText
              ]}>
                {date.getDate()}
              </Text>
              {isToday(date) && (
                <Text style={[
                  styles.todayLabel,
                  isSameDate(date, selectedDate) && styles.selectedTodayLabel
                ]}>
                  Today
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.selectedFullDate}>
          Selected: {formatFullDate(selectedDate)}
        </Text>
      </View>

      {/* Time Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Select Time</Text>
        <View style={styles.timeGrid}>
          {availableSlots.map((timeSlot) => (
            <TouchableOpacity
              key={timeSlot}
              style={[
                styles.timeSlot,
                selectedTime === timeSlot && styles.selectedTimeSlot,
              ]}
              onPress={() => setSelectedTime(timeSlot)}
            >
              <Text style={[
                styles.timeSlotText,
                selectedTime === timeSlot && styles.selectedTimeSlotText,
              ]}>
                {timeSlot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏱️ Duration</Text>
        <View style={styles.durationContainer}>
          {[1, 2, 3, 4, 5, 6].map((hours) => (
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
              <Text style={[
                styles.durationPrice,
                duration === hours && styles.selectedDurationPrice
              ]}>
                ${zone.pricePerHour * hours}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Booking Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Booking Summary</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Zone:</Text>
            <Text style={styles.summaryValue}>{zone.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{selectedTime || 'Not selected'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{duration} hour{duration > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rate:</Text>
            <Text style={styles.summaryValue}>${zone.pricePerHour}/hour</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${calculateTotal()}</Text>
          </View>
        </View>
      </View>

      {/* Book Button */}
      <View style={styles.bookingButtonContainer}>
        <TouchableOpacity 
          style={[styles.bookButton, !selectedTime && styles.disabledButton]}
          onPress={handleBooking}
          disabled={!selectedTime}
        >
          <Text style={styles.bookButtonText}>
            Continue to Payment - ${calculateTotal()}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  zoneHeader: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingTop: 60,
    position: 'relative',
  },
  backIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  zoneName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    paddingLeft: 40,
  },
  zonePrice: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    paddingLeft: 40,
  },
  zoneDescription: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginTop: 8,
    paddingLeft: 40,
    lineHeight: 20,
  },
  operatingHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 40,
  },
  operatingHoursText: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginLeft: 8,
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
  dateScroll: {
    marginBottom: 16,
  },
  dateCard: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    minWidth: 70,
  },
  selectedDateCard: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  dateCardDay: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dateCardDate: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: 'bold',
    marginTop: 4,
  },
  selectedDateText: {
    color: 'white',
  },
  todayLabel: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4,
  },
  selectedTodayLabel: {
    color: 'white',
  },
  selectedFullDate: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: 'white',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    minWidth: 90,
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDurationButton: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  durationButtonText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
  selectedDurationButtonText: {
    color: 'white',
  },
  durationPrice: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  selectedDurationPrice: {
    color: 'white',
    opacity: 0.9,
  },
  summaryContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
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
  summaryLabel: {
    fontSize: 16,
    color: '#64748b',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: 'bold',
    flex: 1,
  },
  totalValue: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  bookingButtonContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 16,
  },
  bookButton: {
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
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});