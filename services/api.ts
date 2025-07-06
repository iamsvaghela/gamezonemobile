// services/api.ts - Fixed version with correct URL structure
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fix: Remove /api from base URL since it's added in routes
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://gamezone-production.up.railway.app';

console.log('🔗 API Base URL:', API_BASE_URL);

// Type definitions
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

interface AppStats {
  totalGameZones: number;
  totalUsers: number;
  totalBookings: number;
  activeZones: number;
}

interface Booking {
  _id: string;
  reference: string;
  zoneId: any;
  userId: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

class MobileApiService {
  private baseURL: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

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
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Sleep function for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced API call method with retry logic
  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    // Fix: Ensure correct URL construction
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${cleanEndpoint}`;
    
    try {
      const headers = await this.getHeaders();
      const config: RequestInit = {
        headers,
        mode: 'cors',
        credentials: 'omit',
        ...options,
      };

      console.log(`📱 API Call (attempt ${retryCount + 1}): ${options.method || 'GET'} ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
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
        
        console.error(`❌ API Error ${response.status}:`, errorMessage);
        
        if (response.status === 401) {
          await this.removeAuthToken();
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else if (response.status === 409) {
          throw new Error(errorMessage || 'Conflict occurred. Please check your data.');
        } else if (response.status >= 500) {
          if (retryCount < this.maxRetries) {
            console.log(`🔄 Server error, retrying... (${retryCount + 1}/${this.maxRetries})`);
            await this.sleep(this.retryDelay * (retryCount + 1));
            return this.apiCall<T>(endpoint, options, retryCount + 1);
          }
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(errorMessage);
      }

      console.log(`✅ API Call successful: ${options.method || 'GET'} ${url}`);
      return data as T;
      
    } catch (error: any) {
      console.error('❌ API call error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        if (retryCount < this.maxRetries) {
          console.log(`🔄 Network error, retrying... (${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(this.retryDelay * (retryCount + 1));
          return this.apiCall<T>(endpoint, options, retryCount + 1);
        }
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      if (retryCount < this.maxRetries && 
          !error.message.includes('Session expired') &&
          !error.message.includes('Access denied') &&
          !error.message.includes('Resource not found')) {
        console.log(`🔄 Retrying due to error... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.apiCall<T>(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Authentication methods
  async googleAuth(googleData: {
    googleId: string;
    email: string;
    name: string;
    profileImage?: string;
    role: 'user' | 'vendor';
    isVerified: boolean;
  }): Promise<LoginResponse> {
    try {
      console.log('🔄 Starting Google authentication with backend...');
      console.log('📧 Email:', googleData.email);
      
      const response = await this.apiCall<LoginResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(googleData),
      });
      
      if (response.success && response.token) {
        await this.setAuthToken(response.token);
        await this.setUser(response.user);
        console.log('✅ Google authentication successful');
      } else {
        console.error('❌ Google authentication failed:', response);
        throw new Error(response.message || 'Google authentication failed');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Google auth error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.apiCall<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
      await this.setUser(response.user);
    }
    
    return response;
  }

  async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.apiCall('/api/auth/profile');
  }

  async logout(): Promise<void> {
    try {
      await this.apiCall('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.removeAuthToken();
      console.log('✅ Logged out successfully');
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      console.log('🏥 Health check...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // Stats methods
  async getAppStats(): Promise<AppStats> {
    try {
      console.log('📊 Getting app statistics...');
      const response = await this.apiCall<{ success: boolean } & AppStats>('/api/stats/app');
      
      if (response.success) {
        return {
          totalGameZones: response.totalGameZones,
          totalUsers: response.totalUsers,
          totalBookings: response.totalBookings,
          activeZones: response.activeZones,
        };
      }
      
      throw new Error('Failed to get app stats');
    } catch (error) {
      console.error('❌ App stats API call failed:', error);
      throw error;
    }
  }

  // Booking methods - Fixed!
  async getUserBookings(): Promise<{ success: boolean; bookings: Booking[] }> {
    try {
      console.log('📋 Getting user bookings...');
      const response = await this.apiCall<{ success: boolean; bookings: Booking[] }>('/api/bookings');
      
      if (response.success) {
        console.log(`✅ Retrieved ${response.bookings.length} bookings`);
        return response;
      }
      
      throw new Error('Failed to get user bookings');
    } catch (error) {
      console.error('❌ Get user bookings error:', error);
      throw error;
    }
  }

  async createBooking(bookingData: {
    zoneId: string;
    date: string;
    timeSlot: string;
    duration: number;
    notes?: string;
  }): Promise<{ success: boolean; booking: Booking }> {
    return this.apiCall('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async cancelBooking(bookingId: string): Promise<{ success: boolean; booking: Booking }> {
    return this.apiCall(`/api/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  }

  async getBooking(bookingId: string): Promise<{ success: boolean; booking: Booking }> {
    return this.apiCall(`/api/bookings/${bookingId}`);
  }

  // Game zones methods
  async getGameZones(params: any = {}): Promise<any> {
    try {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      const response = await this.apiCall<any>(
        `/api/gamezones${queryString ? `?${queryString}` : ''}`
      );
      
      return {
        success: true,
        gameZones: response.gameZones || response.gamezones || [],
        pagination: response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      console.error('❌ Game zones API call failed:', error);
      throw error;
    }
  }

  // Utility methods
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
}

// Create and export singleton instance
const apiService = new MobileApiService();

export default apiService;
export type { User, LoginResponse, AppStats, Booking };