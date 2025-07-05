// app/book-now.tsx - Book Now Screen with authentication integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

export default function BookNowScreen() {
  const { zoneId, zoneName, pricePerHour } = useLocalSearchParams<{
    zoneId: string;
    zoneName: string;
    pricePerHour: string;
  }>();
  
  const { isLoggedIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setSelectedDate(dateString);
  }, []);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeSlot);
    }
    return slots;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateTotal = () => {
    const price = parseFloat(pricePerHour || '0');
    return price * selectedDuration;
  };

  const handleContinueToPayment = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please log in to continue with your booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (!selectedDate || !selectedTime || !selectedDuration) {
      Alert.alert('Incomplete Selection', 'Please select date, time, and duration');
      return;
    }

    const bookingData = {
      zoneId,
      zoneName,
      date: selectedDate,
      timeSlot: selectedTime,
      duration: selectedDuration,
      totalAmount: calculateTotal(),
      pricePerHour: parseFloat(pricePerHour || '0')
    };

    router.push({
      pathname: '/payment',
      params: {
        bookingData: JSON.stringify(bookingData)
      }
    });
  };

  const handleLoginPrompt = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Now</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Login Status */}
      {isLoggedIn ? (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      ) : (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            Please log in to continue with your booking
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLoginPrompt}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Zone Info */}
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>{zoneName}</Text>
          <Text style={styles.pricePerHour}>${pricePerHour}/hour</Text>
        </View>

        {/* Select Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateContainer}>
              {generateDates().map((date, index) => {
                const dateString = date.toISOString().split('T')[0];
                const isSelected = selectedDate === dateString;
                const isToday = index === 0;
                
                return (
                  <TouchableOpacity
                    key={dateString}
                    style={[
                      styles.dateButton,
                      isSelected && styles.selectedDateButton,
                      !isLoggedIn && styles.disabledButton
                    ]}
                    onPress={() => isLoggedIn && setSelectedDate(dateString)}
                    disabled={!isLoggedIn}
                  >
                    <Text style={[
                      styles.dateText,
                      isSelected && styles.selectedDateText,
                      !isLoggedIn && styles.disabledText
                    ]}>
                      {isToday ? 'Today' : formatDate(date)}
                    </Text>
                    <Text style={[
                      styles.dateNumber,
                      isSelected && styles.selectedDateNumber,
                      !isLoggedIn && styles.disabledText
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <Text style={styles.selectedInfo}>
            Selected: {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }) : 'None'}
          </Text>
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Select Time</Text>
          <View style={styles.timeGrid}>
            {generateTimeSlots().map((time) => {
              const isSelected = selectedTime === time;
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeButton,
                    isSelected && styles.selectedTimeButton,
                    !isLoggedIn && styles.disabledButton
                  ]}
                  onPress={() => isLoggedIn && setSelectedTime(time)}
                  disabled={!isLoggedIn}
                >
                  <Text style={[
                    styles.timeText,
                    isSelected && styles.selectedTimeText,
                    !isLoggedIn && styles.disabledText
                  ]}>
                    {formatTime(time)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Select Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Duration</Text>
          <View style={styles.durationContainer}>
            {[1, 2, 3, 4, 5, 6].map((duration) => {
              const isSelected = selectedDuration === duration;
              const price = parseFloat(pricePerHour || '0') * duration;
              
              return (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationButton,
                    isSelected && styles.selectedDurationButton,
                    !isLoggedIn && styles.disabledButton
                  ]}
                  onPress={() => isLoggedIn && setSelectedDuration(duration)}
                  disabled={!isLoggedIn}
                >
                  <Text style={[
                    styles.durationText,
                    isSelected && styles.selectedDurationText,
                    !isLoggedIn && styles.disabledText
                  ]}>
                    {duration}h
                  </Text>
                  <Text style={[
                    styles.durationPrice,
                    isSelected && styles.selectedDurationPrice,
                    !isLoggedIn && styles.disabledText
                  ]}>
                    ${price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Booking Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Booking Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Zone:</Text>
              <Text style={styles.summaryValue}>{zoneName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                }) : 'Not selected'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>
                {selectedTime ? formatTime(selectedTime) : 'Not selected'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>
                {selectedDuration} hour{selectedDuration > 1 ? 's' : ''}
              </Text>
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
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!isLoggedIn || !selectedDate || !selectedTime || !selectedDuration) && styles.disabledButton
          ]}
          onPress={handleContinueToPayment}
          disabled={!isLoggedIn || !selectedDate || !selectedTime || !selectedDuration}
        >
          <Text style={styles.continueButtonText}>
            {isLoggedIn 
              ? `Continue to Payment - $${calculateTotal()}`
              : 'Login to Continue'
            }
          </Text>
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
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 24,
  },
  userInfo: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  userEmail: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
  },
  loginPrompt: {
    backgroundColor: '#fef3c7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  loginPromptText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    marginRight: 16,
  },
  loginButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  zoneInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  zoneName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  pricePerHour: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
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
  dateContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  dateButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedDateButton: {
    backgroundColor: '#6366f1',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  selectedDateText: {
    color: 'white',
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  selectedDateNumber: {
    color: 'white',
  },
  selectedInfo: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 12,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeButton: {
    backgroundColor: '#6366f1',
  },
  timeText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectedTimeText: {
    color: 'white',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: '#6366f1',
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedDurationText: {
    color: 'white',
  },
  durationPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedDurationPrice: {
    color: 'white',
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
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  continueContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  disabledText: {
    color: '#9ca3af',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});