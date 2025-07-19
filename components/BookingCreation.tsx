// components/BookingCreation.tsx - Updated with notification integration
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

// Try to import notification context
let useNotifications: any;
try {
  useNotifications = require('../contexts/NotificationContext').useNotifications;
} catch (error) {
  console.log('NotificationContext not available, using fallback');
  useNotifications = () => ({ 
    refreshNotifications: async () => console.log('Notifications not available') 
  });
}

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
  
  // Add notification context
  const notificationData = useNotifications();
  const { refreshNotifications } = notificationData || { refreshNotifications: async () => {} };
  
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
  const [bookingCreated, setBookingCreated] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

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
      
      // Set booking created state
      setBookingCreated(true);
      setCreatedBookingId(response.booking.id);
      
      // Refresh notifications to show the new booking notification
      try {
        await refreshNotifications();
        console.log('✅ Notifications refreshed after booking creation');
      } catch (notifError) {
        console.warn('⚠️ Failed to refresh notifications:', notifError);
      }
      
      Alert.alert(
        'Booking Created! 🎉',
        'Your booking request has been sent to the vendor. You\'ll receive a notification when they respond.',
        [
          {
            text: 'View Notifications',
            onPress: () => router.push('/notifications')
          },
          {
            text: 'Continue',
            onPress: () => router.push('/(tabs)')
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

  // Success screen component
  if (bookingCreated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Created</Text>
        </View>
        
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.successTitle}>Booking Created Successfully!</Text>
          <Text style={styles.successMessage}>
            Your booking request has been sent to the vendor. You'll receive a notification when they respond.
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications" size={20} color="white" />
              <Text style={styles.buttonText}>Check Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/(tabs)/bookings')}
            >
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={[styles.buttonText, { color: '#007AFF' }]}>View Bookings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={[styles.buttonText, { color: '#666' }]}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }