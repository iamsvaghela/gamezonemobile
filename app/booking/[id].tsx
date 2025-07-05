// app/booking/[id].tsx
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
  pricePerHour: number;
  operatingHours: {
    start: string;
    end: string;
  };
  capacity: number;
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
      generateTimeSlots();
    }
  }, [id]);

  const loadZoneDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://gamezone-production.up.railway.app/api/gamezones/${id}`);
      const data = await response.json();
      
      // Handle response format - try different ways to access the zone data
      let zoneData = null;
      if (data.gamezone) {
        zoneData = data.gamezone;
      } else if (data._id) {
        zoneData = data;
      } else if (Array.isArray(data) && data.length > 0) {
        zoneData = data[0];
      }
      
      setZone(zoneData);
    } catch (error) {
      console.error('Load zone details error:', error);
      Alert.alert('Error', 'Failed to load zone details', [
        { text: 'Go Back', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 22) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
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

    const bookingData = {
      zoneId: id,
      zoneName: zone?.name || '',
      date: selectedDate.toISOString().split('T')[0],
      timeSlot: selectedTime,
      duration: duration,
      totalAmount: calculateTotal(),
      pricePerHour: zone?.pricePerHour || 0,
    };

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
        <Text style={styles.errorText}>Zone not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Zone Info Header */}
      <View style={styles.zoneHeader}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zonePrice}>${zone.pricePerHour}/hour</Text>
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
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6366f1',
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
  },
  zoneName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  zonePrice: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
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
  },
  summaryValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
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