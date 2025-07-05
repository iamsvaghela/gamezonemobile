// utils/bookingDebugUtils.ts - Debug utilities for booking system
import apiService from '../services/api';

export interface MockBookingData {
  zoneId: string;
  zoneName: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
}

export const mockBookingsData: MockBookingData[] = [
  {
    zoneId: '507f1f77bcf86cd799439011',
    zoneName: 'Elite Gaming Lounge',
    date: '2025-01-15',
    timeSlot: '14:00',
    duration: 2,
    totalAmount: 70,
    status: 'confirmed',
    paymentStatus: 'paid'
  },
  {
    zoneId: '507f1f77bcf86cd799439012',
    zoneName: 'Pixel Paradise',
    date: '2025-01-08',
    timeSlot: '16:00',
    duration: 3,
    totalAmount: 90,
    status: 'confirmed',
    paymentStatus: 'paid'
  },
  {
    zoneId: '507f1f77bcf86cd799439013',
    zoneName: 'Retro Arcade Zone',
    date: '2024-12-20',
    timeSlot: '18:00',
    duration: 1,
    totalAmount: 25,
    status: 'completed',
    paymentStatus: 'paid'
  },
  {
    zoneId: '507f1f77bcf86cd799439014',
    zoneName: 'GamersHub Central',
    date: '2024-12-15',
    timeSlot: '20:00',
    duration: 4,
    totalAmount: 120,
    status: 'cancelled',
    paymentStatus: 'refunded'
  }
];

export class BookingDebugUtils {
  
  static async testApiConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testing API connection...');
      await apiService.healthCheck();
      console.log('✅ API connection successful');
      return true;
    } catch (error) {
      console.error('❌ API connection failed:', error);
      return false;
    }
  }

  static async testAuthStatus(): Promise<void> {
    try {
      console.log('🔄 Testing authentication status...');
      const isAuth = await apiService.isAuthenticated();
      console.log('🔐 Is authenticated:', isAuth);
      
      if (isAuth) {
        const user = await apiService.getUser();
        console.log('👤 Current user:', user);
      }
    } catch (error) {
      console.error('❌ Auth test failed:', error);
    }
  }

  static async testBookingsAPI(): Promise<void> {
    try {
      console.log('🔄 Testing bookings API...');
      
      // Test fetching bookings
      const bookings = await apiService.getUserBookings();
      console.log('📅 Bookings response:', bookings);
      
      if (bookings.bookings && bookings.bookings.length > 0) {
        const firstBooking = bookings.bookings[0];
        console.log('📋 First booking details:', firstBooking);
        
        // Test fetching individual booking
        try {
          const singleBooking = await apiService.getBooking(firstBooking._id);
          console.log('🎯 Single booking:', singleBooking);
        } catch (singleError) {
          console.log('⚠️ Single booking fetch failed:', singleError);
        }
      }
      
    } catch (error) {
      console.error('❌ Bookings API test failed:', error);
    }
  }

  static async createTestBooking(): Promise<void> {
    try {
      console.log('🔄 Creating test booking...');
      
      const testBooking = {
        zoneId: '507f1f77bcf86cd799439011', // Replace with actual zone ID
        date: '2025-01-20',
        timeSlot: '15:00',
        duration: 2,
        notes: 'Test booking created by debug utils'
      };
      
      const result = await apiService.createBooking(testBooking);
      console.log('✅ Test booking created:', result);
      
    } catch (error) {
      console.error('❌ Test booking creation failed:', error);
    }
  }

  static logBookingData(bookings: any[]): void {
    console.log('📊 Booking Statistics:');
    console.log('- Total bookings:', bookings.length);
    
    const statusCounts = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('- Status breakdown:', statusCounts);
    
    const totalAmount = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    console.log('- Total amount spent:', totalAmount);
    
    // Log upcoming bookings
    const today = new Date().toISOString().split('T')[0];
    const upcomingBookings = bookings.filter(b => b.date >= today && b.status === 'confirmed');
    console.log('- Upcoming bookings:', upcomingBookings.length);
    
    if (upcomingBookings.length > 0) {
      console.log('- Next booking:', upcomingBookings[0]);
    }
  }

  static validateBookingData(booking: any): boolean {
    const requiredFields = [
      '_id', 'zoneId', 'date', 'timeSlot', 'duration', 
      'totalAmount', 'status', 'paymentStatus'
    ];
    
    for (const field of requiredFields) {
      if (!booking[field]) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate status values
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(booking.status)) {
      console.error(`❌ Invalid status: ${booking.status}`);
      return false;
    }
    
    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'refunded', 'failed'];
    if (!validPaymentStatuses.includes(booking.paymentStatus)) {
      console.error(`❌ Invalid payment status: ${booking.paymentStatus}`);
      return false;
    }
    
    console.log('✅ Booking data validation passed');
    return true;
  }

  static async runFullDiagnostic(): Promise<void> {
    console.log('🔍 Running full booking system diagnostic...');
    
    // Test API connection
    const apiConnected = await this.testApiConnection();
    if (!apiConnected) {
      console.error('❌ API connection failed, stopping diagnostic');
      return;
    }
    
    // Test authentication
    await this.testAuthStatus();
    
    // Test bookings API
    await this.testBookingsAPI();
    
    console.log('✅ Diagnostic complete');
  }
}

// Export for easy use in components
export default BookingDebugUtils;