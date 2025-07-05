// services/api.ts - Updated Mobile API Service with enhanced booking support
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://gamezone-production.up.railway.app/api';

console.log('🔗 API Base URL:', API_BASE_URL);

// Enhanced type definitions
interface GameZone {
  _id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      type: string;
      coordinates: number[];
    };
  };
  amenities: string[];
  pricePerHour: number;
  images: string[];
  vendorId: {
    _id: string;
    name: string;
    email: string;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  rating: number;
  totalReviews: number;
  capacity: number;
  isActive: boolean;
  gameTypes: string[];
  equipment: {
    pcs: number;
    consoles: number;
    vrHeadsets: number;
    arcadeMachines: number;
  };
  createdAt: string;
  distance?: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  profileImage?: string;
  isVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message: string;
  isNewUser?: boolean;
}

interface GameZonesResponse {
  success: boolean;
  gameZones: GameZone[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface Booking {
  _id: string;
  reference: string;
  userId: string;
  zoneId: {
    _id: string;
    name: string;
    location: {
      address: string;
      city: string;
    };
    images: string[];
    pricePerHour: number;
    rating: number;
  };
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  qrCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingCreateRequest {
  zoneId: string;
  date: string;
  timeSlot: string;
  duration: number;
  notes?: string;
}

interface BookingCreateResponse {
  message: string;
  booking: {
    id: string;
    reference: string;
    zone: {
      id: string;
      name: string;
      location: {
        address: string;
      };
      image: string;
    };
    date: string;
    timeSlot: string;
    duration: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    qrCode: string;
    createdAt: string;
  };
}

interface BookingResponse {
  success: boolean;
  booking: {
    id: string;
    reference: string;
    zone: GameZone;
    user?: User;
    date: string;
    timeSlot: string;
    duration: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    qrCode: string;
    notes?: string;
    createdAt: string;
    canBeCancelled: boolean;
  };
}

interface BookingsResponse {
  success: boolean;
  bookings: Booking[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface AvailabilityResponse {
  success: boolean;
  date: string;
  zoneId: string;
  zoneName: string;
  operatingHours: {
    start: string;
    end: string;
  };
  availability: Record<string, boolean>;
}

class MobileApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('📱 Mobile API initialized with URL:', this.baseURL);
  }

  // Authentication token management
  async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
      console.log('✅ Auth token stored successfully');
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  }

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('✅ User data stored successfully');
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      console.log('✅ Auth token and user data removed');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  // Create headers with auth token
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Generic API call method with enhanced error handling
  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseURL}/${cleanEndpoint}`;
    
    const headers = await this.getHeaders();
    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      console.log(`📱 API Call: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = typeof data === 'object' ? 
          data.error || data.message || `HTTP ${response.status}` : 
          data || `HTTP ${response.status}`;
        
        // Handle specific error codes
        if (response.status === 401) {
          // Token expired or invalid
          await this.removeAuthToken();
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else if (response.status === 409) {
          throw new Error(errorMessage || 'Conflict occurred. Please check your data.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error) {
      console.error('❌ Mobile API call error:', error);
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Network error: Please check your internet connection');
      }
      
      throw error;
    }
  }

  // Authentication APIs
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.apiCall<LoginResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
      await this.setUser(response.user);
    }
    
    return response;
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  }): Promise<LoginResponse> {
    const response = await this.apiCall<LoginResponse>('auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
      await this.setUser(response.user);
    }
    
    return response;
  }

  async googleAuth(googleData: {
    googleId: string;
    email: string;
    name: string;
    profileImage?: string;
    role: 'user' | 'vendor';
    isVerified: boolean;
  }): Promise<LoginResponse> {
    const response = await this.apiCall<LoginResponse>('auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
      await this.setUser(response.user);
    }
    
    return response;
  }

  async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.apiCall('auth/profile');
  }

  async updateProfile(userData: {
    name?: string;
    phone?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    const response = await this.apiCall<{ success: boolean; user: User; message: string }>('auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    
    if (response.success) {
      await this.setUser(response.user);
    }
    
    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.apiCall('auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.apiCall('auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.removeAuthToken();
      console.log('✅ Logged out successfully');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Gaming Zones APIs
  async getGameZones(params: {
    page?: number;
    limit?: number;
    search?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string;
    sort?: 'rating' | 'price' | 'distance';
  } = {}): Promise<GameZonesResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    const response = await this.apiCall<any>(
      `gamezones${queryString ? `?${queryString}` : ''}`
    );
    
    console.log('🎮 GameZones API Response:', response);
    
    // Handle your backend's response format
    const gameZones = Array.isArray(response.gameZones) ? response.gameZones : [];
    
    return {
      success: true,
      gameZones: gameZones,
      pagination: response.pagination || {
        currentPage: params.page || 1,
        totalPages: Math.ceil((response.total || gameZones.length) / (params.limit || 10)),
        totalItems: response.total || gameZones.length,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async getGameZone(id: string): Promise<GameZone> {
    const response = await this.apiCall<GameZone>(`gamezones/${id}`);
    return response;
  }

  async getAvailability(zoneId: string, date: string): Promise<AvailabilityResponse> {
    const response = await this.apiCall<AvailabilityResponse>(`gamezones/${zoneId}/availability?date=${date}`);
    return {
      success: true,
      ...response
    };
  }

  // Enhanced Booking APIs
  async createBooking(bookingData: BookingCreateRequest): Promise<BookingCreateResponse> {
    console.log('🔄 Creating booking with data:', bookingData);
    
    const response = await this.apiCall<BookingCreateResponse>('bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    
    console.log('✅ Booking created successfully:', response);
    return response;
  }

  async getUserBookings(params: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<BookingsResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    const response = await this.apiCall<any>(`bookings${queryString ? `?${queryString}` : ''}`);
    
    return {
      success: true,
      bookings: response.bookings || [],
      pagination: response.pagination || {
        currentPage: params.page || 1,
        totalPages: 1,
        totalItems: response.bookings?.length || 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async getBooking(id: string): Promise<BookingResponse> {
    const response = await this.apiCall<BookingResponse>(`bookings/${id}`);
    return response;
  }

  async cancelBooking(id: string, reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.apiCall<{ message: string }>(`bookings/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ cancellationReason: reason }),
    });
    
    return {
      success: true,
      message: response.message
    };
  }

  // Utility methods
  async healthCheck(): Promise<any> {
    try {
      const healthUrl = this.baseURL.replace('/api', '/health');
      console.log('🏥 Health check URL:', healthUrl);
      const response = await fetch(healthUrl);
      return await response.json();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // Helper method to format errors for user display
  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }
}

// Create and export singleton instance
const apiService = new MobileApiService();

export default apiService;
export type { 
  GameZone, 
  User, 
  LoginResponse, 
  GameZonesResponse, 
  Booking, 
  BookingCreateRequest,
  BookingCreateResponse,
  BookingResponse,
  BookingsResponse,
  AvailabilityResponse
};