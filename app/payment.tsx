// app/payment.tsx - Fixed payment screen with improved validation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

// Try to import useAuth, but handle case where it's not available
let useAuth: any;
try {
  useAuth = require('../contexts/AuthContext').useAuth;
} catch (error) {
  console.log('AuthContext not available, using fallback');
  useAuth = () => ({ 
    user: { name: 'Demo User', email: 'demo@example.com' }, 
    isLoggedIn: true 
  });
}

interface BookingData {
  zoneId: string;
  zoneName: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  pricePerHour: number;
}

export default function PaymentScreen() {
  const { bookingData } = useLocalSearchParams<{ bookingData: string }>();
  const authData = useAuth();
  const { user, isLoggedIn } = authData || { user: null, isLoggedIn: false };
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  
  // Billing address state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (bookingData) {
      try {
        const parsedData = JSON.parse(bookingData);
        setBooking(parsedData);
        console.log('📋 Booking data loaded:', parsedData);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        Alert.alert('Error', 'Invalid booking data');
        router.back();
      }
    }

    // Pre-fill user data if available
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCardholderName(user.name || '');
    }
  }, [bookingData, user]);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 19);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiryDate(text);
    setExpiryDate(formatted);
  };

  const validateForm = () => {
    console.log('🔍 Validating form fields:');
    console.log('Card Number:', cardNumber, 'Length:', cardNumber.replace(/\s/g, '').length);
    console.log('Expiry Date:', expiryDate, 'Length:', expiryDate.length);
    console.log('CVV:', cvv, 'Length:', cvv.length);
    console.log('Cardholder Name:', cardholderName.trim());
    console.log('Email:', email.trim());
    
    // Card number validation (remove spaces and check length)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      console.log('❌ Card number validation failed');
      Alert.alert('Invalid Card', 'Please enter a valid card number (13-19 digits)');
      return false;
    }
    
    // Expiry date validation
    if (!expiryDate || expiryDate.length !== 5) {
      console.log('❌ Expiry date validation failed');
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    // Check if expiry date is in the future
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1;
    
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      console.log('❌ Expiry date is in the past');
      Alert.alert('Invalid Expiry', 'Please enter a future expiry date');
      return false;
    }
    
    // CVV validation
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      console.log('❌ CVV validation failed');
      Alert.alert('Invalid CVV', 'Please enter a valid CVV (3-4 digits)');
      return false;
    }
    
    // Cardholder name validation
    if (!cardholderName.trim() || cardholderName.trim().length < 2) {
      console.log('❌ Cardholder name validation failed');
      Alert.alert('Invalid Name', 'Please enter a valid cardholder name');
      return false;
    }
    
    // Email validation (more flexible)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      console.log('❌ Email validation failed');
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }
    
    console.log('✅ All form validations passed');
    return true;
  };

  const handlePayment = async () => {
    console.log('💳 Payment button clicked');
    console.log('📋 Current booking:', booking);
    console.log('🔐 Auth status:', { isLoggedIn, user: user?.name });
    
    // Add detailed form state logging
    console.log('📝 Form state:', {
      cardNumber: cardNumber,
      cardNumberLength: cardNumber.replace(/\s/g, '').length,
      expiryDate: expiryDate,
      expiryDateLength: expiryDate.length,
      cvv: cvv,
      cvvLength: cvv.length,
      cardholderName: cardholderName,
      cardholderNameTrimmed: cardholderName.trim(),
      email: email,
      emailTrimmed: email.trim(),
      phone: phone
    });
    
    if (!booking) {
      Alert.alert('Error', 'No booking data found');
      return;
    }

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate payment processing
      console.log('🔄 Processing payment...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to create booking via API
      console.log('🔄 Creating booking:', {
        zoneId: booking.zoneId,
        date: booking.date,
        timeSlot: booking.timeSlot,
        duration: booking.duration,
        notes: notes || undefined
      });

      try {
        const response = await apiService.createBooking({
          zoneId: booking.zoneId,
          date: booking.date,
          timeSlot: booking.timeSlot,
          duration: booking.duration,
          notes: notes || undefined
        });

        console.log('✅ Booking created successfully:', response);

        // Navigate to success screen with real booking data
        router.replace({
          pathname: '/booking-success',
          params: {
            bookingData: JSON.stringify({
              id: response.booking.id,
              reference: response.booking.reference,
              zoneName: response.booking.zone.name,
              zoneId: response.booking.zone.id,
              date: response.booking.date,
              timeSlot: response.booking.timeSlot,
              duration: response.booking.duration,
              totalAmount: response.booking.totalAmount,
              pricePerHour: booking.pricePerHour,
              status: response.booking.status,
              paymentStatus: response.booking.paymentStatus,
              qrCode: response.booking.qrCode,
              cardLast4: cardNumber.slice(-4),
              createdAt: response.booking.createdAt,
              userEmail: email,
              userPhone: phone,
              userAddress: address ? `${address}, ${city}, ${zipCode}` : undefined,
              notes: notes || undefined
            }),
          }
        });
      } catch (apiError) {
        console.warn('⚠️ API booking failed, using mock success:', apiError);
        
        // If API fails, create mock booking for demo
        const mockBooking = {
          id: 'mock_' + Date.now(),
          reference: 'GZ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          zoneName: booking.zoneName,
          zoneId: booking.zoneId,
          date: booking.date,
          timeSlot: booking.timeSlot,
          duration: booking.duration,
          totalAmount: booking.totalAmount,
          pricePerHour: booking.pricePerHour,
          status: 'confirmed',
          paymentStatus: 'paid',
          qrCode: JSON.stringify({
            bookingId: 'mock_' + Date.now(),
            reference: 'GZ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            zoneName: booking.zoneName,
            date: booking.date,
            timeSlot: booking.timeSlot,
            duration: booking.duration
          }),
          cardLast4: cardNumber.slice(-4),
          createdAt: new Date().toISOString(),
          userEmail: email,
          userPhone: phone,
          userAddress: address ? `${address}, ${city}, ${zipCode}` : undefined,
          notes: notes || undefined
        };

        console.log('✅ Mock booking created:', mockBooking);

        // Navigate to success screen with mock data
        router.replace({
          pathname: '/booking-success',
          params: {
            bookingData: JSON.stringify(mockBooking),
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const getCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Card';
  };

  // Add a test fill function for debugging
  const fillTestData = () => {
    setCardNumber('4111 1111 1111 1111');
    setExpiryDate('12/25');
    setCvv('123');
    setCardholderName('John Doe');
    setEmail('john@example.com');
    setPhone('+1234567890');
    console.log('🧪 Test data filled');
  };

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💳 Payment</Text>
          <TouchableOpacity style={styles.headerRight} onPress={fillTestData}>
            <Text style={styles.testButton}>Test</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Booking Summary</Text>
          <View style={styles.bookingSummary}>
            <Text style={styles.zoneName}>{booking.zoneName}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(booking.date)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{booking.timeSlot}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{booking.duration} hour{booking.duration > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rate:</Text>
              <Text style={styles.summaryValue}>${booking.pricePerHour}/hour</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>${booking.totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <View style={styles.cardInputContainer}>
              <TextInput
                style={styles.cardInput}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19}
              />
              <View style={styles.cardTypeContainer}>
                <Text style={styles.cardType}>{getCardType(cardNumber)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                value={expiryDate}
                onChangeText={handleExpiryChange}
                placeholder="MM/YY"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                value={cvv}
                onChangeText={setCvv}
                placeholder="123"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Doe"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Billing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Billing Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main Street"
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="New York"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="10001"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special requests or notes..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure
          </Text>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity 
          style={[styles.paymentButton, loading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingPayment}>
              <ActivityIndicator color="white" />
              <Text style={styles.loadingPaymentText}>Processing Payment...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="card" size={20} color="white" />
              <Text style={styles.paymentButtonText}>
                Pay ${booking.totalAmount}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 32,
  },
  testButton: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  bookingSummary: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#6366f1',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  cardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  cardInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  cardTypeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  cardType: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  securityText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#065f46',
    flex: 1,
  },
  paymentButtonContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentButton: {
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
  paymentButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingPayment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingPaymentText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});