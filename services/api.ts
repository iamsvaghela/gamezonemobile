// services/api.ts - Fixed with better error handling and URL configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 FIXED: More robust API URL configuration
const getApiBaseUrl = () => {
  // Try different environment variable names
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 
                 process.env.EXPO_PUBLIC_API_BASE_URL ||
                 process.env.REACT_NATIVE_API_URL;
  
  if (envUrl) {
    console.log('🔗 Using environment API URL:', envUrl);
    return envUrl;
  }
  
  // Fallback URLs
  const fallbackUrls = [
    'https://gamezone-production.up.railway.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const fallbackUrl = fallbackUrls[0];
  console.log('⚠️  No environment API URL found, using fallback:', fallbackUrl);
  return fallbackUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔗 Final API Base URL:', API_BASE_URL);

// Type definitions (existing ones)
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
  pushNotificationSettings?: {
    enabled: boolean;
    email: boolean;
  };
  pushToken?: string;
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
    zipCode?: string;
    coordinates?: { coordinates: [number, number] };
  };
  operatingHours: {
    start: string;
    end: string;
  };
  capacity: number;
  amenities: string[];
  gameTypes?: string[];
  isActive: boolean;
  vendorId?: {
    _id: string;
    name: string;
    email: string;
  };
  equipment?: any;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MobileApiService {
  private baseURL: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('📱 Mobile API initialized with URL:', this.baseURL);
  }

  /**
   * Get user notifications with filtering options
   */
  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
    category?: string;
  } = {}): Promise<{
    notifications: any[];
    pagination: any;
    unreadCount: number;
  }> {
    try {
      console.log('📋 Getting user notifications...');
      
      const queryString = new URLSearchParams(
        Object.entries(options)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      const response = await this.apiCall<{
        success: boolean;
        notifications: any[];
        pagination: any;
        unreadCount: number;
      }>(`/api/notifications${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 0, false);
      
      if (response.success) {
        console.log(`✅ Retrieved ${response.notifications.length} notifications`);
        return {
          notifications: response.notifications,
          pagination: response.pagination,
          unreadCount: response.unreadCount
        };
      }
      
      throw new Error('Failed to get notifications');
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      
      // Return safe defaults instead of throwing
      return {
        notifications: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        },
        unreadCount: 0
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(): Promise<number> {
    try {
      console.log('📊 Getting unread notification count...');
      
      const response = await this.apiCall<{
        success: boolean;
        unreadCount: number;
      }>('/api/notifications/unread-count', {
        method: 'GET',
      }, 0, true);
      
      if (response.success) {
        console.log(`📊 Unread count: ${response.unreadCount}`);
        return response.unreadCount;
      }
      
      throw new Error('Failed to get unread count');
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      return 0; // Return 0 instead of throwing
    }
  }


   /**
   * Mark notifications as read
   */
   async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      console.log('✅ Marking notifications as read:', notificationIds);
      
      const response = await this.apiCall<{
        success: boolean;
        modifiedCount: number;
      }>('/api/notifications/mark-read', {
        method: 'PUT',
        body: JSON.stringify({ notificationIds }),
      });
      
      if (response.success) {
        console.log(`✅ Marked ${response.modifiedCount} notifications as read`);
      } else {
        throw new Error('Failed to mark notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    try {
      console.log('✅ Marking all notifications as read...');
      
      const response = await this.apiCall<{
        success: boolean;
        modifiedCount: number;
      }>('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      
      if (response.success) {
        console.log(`✅ Marked ${response.modifiedCount} notifications as read`);
      } else {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting notification:', notificationId);
      
      const response = await this.apiCall<{
        success: boolean;
      }>(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        console.log('✅ Notification deleted successfully');
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  }

  /**
   * Execute a notification action (confirm, decline, etc.)
   */
  async executeNotificationAction(notificationId: string, actionType: string): Promise<any> {
    try {
      console.log('🔄 Executing notification action:', { notificationId, actionType });
      
      const response = await this.apiCall<{
        success: boolean;
        message: string;
        action?: any;
        [key: string]: any;
      }>(`/api/notifications/${notificationId}/action`, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });
      
      if (response.success) {
        console.log('✅ Notification action executed successfully');
        return response;
      } else {
        throw new Error('Failed to execute notification action');
      }
    } catch (error) {
      console.error('❌ Execute action error:', error);
      throw error;
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<{
    enabled: boolean;
    email: boolean;
    pushNotifications?: boolean;
    categories?: any;
  }> {
    try {
      console.log('⚙️ Getting notification settings...');
      
      const response = await this.apiCall<{
        success: boolean;
        settings: {
          enabled: boolean;
          email: boolean;
          pushNotifications?: boolean;
          categories?: any;
        };
      }>('/api/notifications/settings', {
        method: 'GET',
      }, 0, true);
      
      if (response.success) {
        console.log('✅ Notification settings retrieved');
        return response.settings;
      }
      
      throw new Error('Failed to get notification settings');
    } catch (error) {
      console.error('❌ Get notification settings error:', error);
      return { enabled: true, email: true }; // Return defaults
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: {
    enabled?: boolean;
    email?: boolean;
    pushToken?: string;
    categories?: any;
  }): Promise<void> {
    try {
      console.log('⚙️ Updating notification settings:', settings);
      
      const response = await this.apiCall<{
        success: boolean;
        settings?: any;
      }>('/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      
      if (response.success) {
        console.log('✅ Notification settings updated successfully');
      } else {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      console.error('❌ Update notification settings error:', error);
      throw error;
    }
  }

  /**
   * Send test notification (development only)
   */
  async sendTestNotification(title?: string, message?: string): Promise<void> {
    try {
      console.log('🧪 Sending test notification...');
      
      const response = await this.apiCall<{
        success: boolean;
        notification?: any;
      }>('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ 
          title: title || 'Test Notification',
          message: message || 'This is a test notification from GameZone'
        }),
      });
      
      if (response.success) {
        console.log('✅ Test notification sent successfully');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('❌ Send test notification error:', error);
      throw error;
    }
  }

  /**
   * Create test booking notification (for testing)
   */
  async createTestBookingNotification(): Promise<void> {
    try {
      console.log('🧪 Creating test booking notification...');
      
      const response = await this.apiCall<{
        success: boolean;
        notification?: any;
      }>('/api/notifications/create-test-booking-notification', {
        method: 'POST',
      });
      
      if (response.success) {
        console.log('✅ Test booking notification created successfully');
      } else {
        throw new Error('Failed to create test booking notification');
      }
    } catch (error) {
      console.error('❌ Create test booking notification error:', error);
      throw error;
    }
  }


  // 🔧 ENHANCED: Test connection method
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection successful:', data);
        return true;
      } else {
        console.error('❌ API connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }


  

  // Enhanced cache management
  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}${params ? `_${JSON.stringify(params)}` : ''}`;
  }

  private setCache<T>(key: string, data: T, customDuration?: number): void {
    const duration = customDuration || this.CACHE_DURATION;
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    };
    this.cache.set(key, cacheItem);
  }

  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
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
      await AsyncStorage.multiRemove(['authToken', 'user']);
      this.clearCache();
      console.log('✅ Auth data cleared successfully');
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
      'User-Agent': 'GameZone-Mobile-App',
      'Origin': 'http://localhost:8081', // 🔧 ADDED: Explicit origin
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Sleep function for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 🔧 ENHANCED: Better error handling and connection testing
  async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0,
    useCache: boolean = false,
    queryParams?: string
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullEndpoint = queryParams ? `${cleanEndpoint}?${queryParams}` : cleanEndpoint;
    const url = `${this.baseURL}${fullEndpoint}`;
    const cacheKey = this.getCacheKey(fullEndpoint, options.body);
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.getCache<T>(cacheKey);
      if (cached) {
        console.log(`💾 Cache hit for: ${endpoint}`);
        return cached;
      }
    }
    
    try {
      const headers = await this.getHeaders();
      const config: RequestInit = {
        headers,
        mode: 'cors',
        credentials: 'omit',
        ...options,
      };

      console.log(`📱 API Call (attempt ${retryCount + 1}): ${options.method || 'GET'} ${url}`);
      console.log('📤 Headers:', headers);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 🔧 Increased timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        console.log('📄 Non-JSON response:', textData);
        data = textData;
      }

      if (!response.ok) {
        const errorMessage = this.parseErrorMessage(data, response.status);
        console.error(`❌ API Error ${response.status}:`, errorMessage);
        console.error('📄 Error response:', data);
        
        if (response.status === 401) {
          await this.removeAuthToken();
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error(`Resource not found: ${endpoint}`);
        } else if (response.status === 409) {
          throw new Error(errorMessage || 'Conflict occurred. Please check your data.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        } else if (response.status >= 500) {
          if (retryCount < this.maxRetries) {
            console.log(`🔄 Server error, retrying... (${retryCount + 1}/${this.maxRetries})`);
            await this.sleep(this.retryDelay * (retryCount + 1));
            return this.apiCall<T>(endpoint, options, retryCount + 1, useCache, queryParams);
          }
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(errorMessage);
      }

      console.log(`✅ API Call successful: ${options.method || 'GET'} ${url}`);
      
      // Cache successful GET responses
      if (useCache && (!options.method || options.method === 'GET')) {
        this.setCache(cacheKey, data);
      }
      
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
          return this.apiCall<T>(endpoint, options, retryCount + 1, useCache, queryParams);
        }
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      if (retryCount < this.maxRetries && 
          !error.message.includes('Session expired') &&
          !error.message.includes('Access denied') &&
          !error.message.includes('Resource not found') &&
          !error.message.includes('Conflict occurred')) {
        console.log(`🔄 Retrying due to error... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.apiCall<T>(endpoint, options, retryCount + 1, useCache, queryParams);
      }
      
      throw error;
    }
  }

  // Enhanced error message parsing
  private parseErrorMessage(data: any, status: number): string {
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      return data.error || data.message || data.msg || `HTTP ${status}`;
    }
    return `HTTP ${status}`;
  }

  // 🔧 ENHANCED: Health check with better error handling
  async healthCheck(): Promise<any> {
    try {
      console.log('🏥 Health check starting...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:8081'
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Health check HTTP error:', response.status, response.statusText);
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Health check timed out - server may be down');
      }
      
      if (error.message.includes('Network request failed')) {
        throw new Error('Network error - unable to reach server');
      }
      
      throw error;
    }
  }

  // 🔧 ENHANCED: App stats with better error handling
  async getAppStats(): Promise<AppStats> {
    try {
      console.log('📊 Getting app statistics...');
      
      const response = await this.apiCall<{ 
        success: boolean; 
        totalGameZones: number;
        totalUsers: number;
        totalBookings: number;
        activeZones: number;
      }>('/api/stats/app', {}, 0, true);
      
      console.log('📊 App stats response:', response);
      
      if (response.success) {
        return {
          totalGameZones: response.totalGameZones || 0,
          totalUsers: response.totalUsers || 0,
          totalBookings: response.totalBookings || 0,
          activeZones: response.activeZones || 0,
        };
      }
      
      throw new Error('Failed to get app stats - success flag is false');
    } catch (error) {
      console.error('❌ App stats API call failed:', error);
      
      // Return default values instead of throwing
      return {
        totalGameZones: 0,
        totalUsers: 0,
        totalBookings: 0,
        activeZones: 0,
      };
    }
  }

  // 🔧 ENHANCED: User stats (for the missing endpoint)
  async getUserStats(): Promise<{ totalUsers: number }> {
    try {
      console.log('👥 Getting user statistics...');
      
      const response = await this.apiCall<{ 
        success: boolean; 
        totalUsers: number;
      }>('/api/stats/users', {}, 0, true);
      
      console.log('👥 User stats response:', response);
      
      if (response.success) {
        return {
          totalUsers: response.totalUsers || 0
        };
      }
      
      throw new Error('Failed to get user stats - success flag is false');
    } catch (error) {
      console.error('❌ User stats API call failed:', error);
      
      // Return default values instead of throwing
      return {
        totalUsers: 0
      };
    }
  }

  // Authentication methods (keeping existing)
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
        this.clearCache();
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
      this.clearCache();
    }
    
    return response;
  }

  async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.apiCall('/api/auth/profile', {}, 0, true);
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

  // 🔧 ENHANCED: GameZones with better error handling
  async getGameZones(params: any = {}): Promise<any> {
    try {
      console.log('🎮 Getting game zones with params:', params);
      
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      const response = await this.apiCall<any>(
        `/api/gamezones${queryString ? `?${queryString}` : ''}`,
        {},
        0,
        true
      );
      
      console.log('🎮 GameZones response:', response);
      
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
      
      // Return empty result instead of throwing
      return {
        success: false,
        gameZones: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrev: false
        },
        error: error.message
      };
    }
  }

  // Keep all existing methods but enhance error handling
  async getUserBookings(): Promise<{ success: boolean; bookings: Booking[] }> {
    try {
      console.log('📋 Getting user bookings...');
      const response = await this.apiCall<{ success: boolean; bookings: Booking[] }>(
        '/api/bookings',
        {},
        0,
        true
      );
      
      if (response.success) {
        console.log(`✅ Retrieved ${response.bookings.length} bookings`);
        return response;
      }
      
      throw new Error('Failed to get user bookings');
    } catch (error) {
      console.error('❌ Get user bookings error:', error);
      return {
        success: false,
        bookings: []
      };
    }
  }

  async createBooking(bookingData: {
    zoneId: string;
    date: string;
    timeSlot: string;
    duration: number;
    notes?: string;
  }): Promise<{ success: boolean; booking: Booking }> {
    const response = await this.apiCall<{ success: boolean; booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    
    this.clearCache();
    return response;
  }

  async cancelBooking(bookingId: string): Promise<{ success: boolean; booking: Booking }> {
    const response = await this.apiCall<{ success: boolean; booking: Booking }>(`/api/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
    
    this.clearCache();
    return response;
  }

  async getBooking(bookingId: string): Promise<{ success: boolean; booking: Booking }> {
    return this.apiCall(`/api/bookings/${bookingId}`, {}, 0, true);
  }

  async getGameZone(id: string): Promise<GameZone> {
    try {
      console.log(`🎮 Getting game zone details for ID: ${id}`);
      
      const response = await this.apiCall<any>(
        `/api/gamezones/${id}`,
        {},
        0,
        true
      );
      
      let gamezone = this.extractGameZoneFromResponse(response);
      
      if (!gamezone) {
        console.error('❌ No gamezone found in response:', response);
        throw new Error('Game zone not found in response');
      }
      
      const formattedZone = this.formatGameZone(gamezone);
      console.log('✅ Game zone details retrieved successfully:', formattedZone.name);
      return formattedZone;
      
    } catch (error) {
      console.error('❌ Get game zone error:', error);
      throw this.handleGameZoneError(error);
    }
  }

  private extractGameZoneFromResponse(data: any): any {
    if (data.gamezone) {
      return data.gamezone;
    } else if (data._id) {
      return data;
    } else if (data.success && data.data) {
      return data.data;
    } else {
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object' && data[key]._id) {
          return data[key];
        }
      }
    }
    return null;
  }

  private formatGameZone(gamezone: any): GameZone {
    return {
      _id: gamezone._id,
      name: gamezone.name || 'Unknown Zone',
      description: gamezone.description || '',
      pricePerHour: gamezone.pricePerHour || 0,
      rating: gamezone.rating || 0,
      totalReviews: gamezone.totalReviews || 0,
      images: gamezone.images || [],
      location: {
        address: gamezone.location?.address || '',
        city: gamezone.location?.city || '',
        state: gamezone.location?.state || '',
        zipCode: gamezone.location?.zipCode || '',
        coordinates: gamezone.location?.coordinates || { coordinates: [0, 0] }
      },
      operatingHours: {
        start: gamezone.operatingHours?.start || '09:00',
        end: gamezone.operatingHours?.end || '22:00'
      },
      capacity: gamezone.capacity || 1,
      amenities: gamezone.amenities || [],
      gameTypes: gamezone.gameTypes || [],
      isActive: gamezone.isActive !== false,
      vendorId: gamezone.vendorId || {
        _id: 'unknown',
        name: 'Unknown Vendor',
        email: 'unknown@example.com'
      },
      equipment: gamezone.equipment,
      createdAt: gamezone.createdAt || new Date().toISOString()
    };
  }

  private handleGameZoneError(error: any): Error {
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return new Error('Game zone not found');
      } else if (error.message.includes('Network')) {
        return new Error('Network error. Please check your connection.');
      } else if (error.message.includes('timeout')) {
        return new Error('Request timed out. Please try again.');
      }
    }
    return error;
  }

  async getAvailability(zoneId: string, date: string): Promise<any> {
    try {
      console.log(`🔍 Getting availability for zone ${zoneId} on ${date}`);
      const response = await this.apiCall<any>(
        `/api/bookings/availability/${zoneId}/${date}`,
        {},
        0,
        true
      );
      
      if (response.success) {
        console.log('✅ Availability retrieved successfully');
        return response;
      }
      
      throw new Error('Failed to get availability');
    } catch (error) {
      console.error('❌ Get availability error:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  async refreshProfile(): Promise<User | null> {
    try {
      const response = await this.getProfile();
      if (response.success) {
        await this.setUser(response.user);
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('❌ Profile refresh failed:', error);
      return null;
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }



  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
    category?: string;
  } = {}): Promise<{
    notifications: any[];
    pagination: any;
    unreadCount: number;
  }> {
    try {
      console.log('📋 Getting user notifications...');
      
      const queryString = new URLSearchParams(
        Object.entries(options)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      const response = await this.apiCall<{
        success: boolean;
        notifications: any[];
        pagination: any;
        unreadCount: number;
      }>(`/api/notifications${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 0, false);
      
      if (response.success) {
        console.log(`✅ Retrieved ${response.notifications.length} notifications`);
        return {
          notifications: response.notifications,
          pagination: response.pagination,
          unreadCount: response.unreadCount
        };
      }
      
      throw new Error('Failed to get notifications');
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      
      // Return safe defaults instead of throwing
      return {
        notifications: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        },
        unreadCount: 0
      };
    }
  }
  
  // Get unread notification count
  async getUnreadNotificationCount(): Promise<number> {
    try {
      console.log('📊 Getting unread notification count...');
      
      const response = await this.apiCall<{
        success: boolean;
        unreadCount: number;
      }>('/api/notifications/unread-count', {
        method: 'GET',
      }, 0, true);
      
      if (response.success) {
        return response.unreadCount;
      }
      
      throw new Error('Failed to get unread count');
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      return 0; // Return 0 instead of throwing
    }
  }
  
  // Mark notifications as read
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      console.log('✅ Marking notifications as read...');
      
      const response = await this.apiCall<{
        success: boolean;
        modifiedCount: number;
      }>('/api/notifications/mark-read', {
        method: 'PUT',
        body: JSON.stringify({ notificationIds }),
      });
      
      if (response.success) {
        console.log(`✅ Marked ${response.modifiedCount} notifications as read`);
      } else {
        throw new Error('Failed to mark notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  }
  
  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<void> {
    try {
      console.log('✅ Marking all notifications as read...');
      
      const response = await this.apiCall<{
        success: boolean;
        modifiedCount: number;
      }>('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      
      if (response.success) {
        console.log(`✅ Marked ${response.modifiedCount} notifications as read`);
      } else {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      throw error;
    }
  }
  
  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting notification...');
      
      const response = await this.apiCall<{
        success: boolean;
      }>(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        console.log('✅ Notification deleted successfully');
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  }
  

  // Execute notification action
  async executeNotificationAction(notificationId: string, actionType: string): Promise<any> {
    try {
      console.log('🔄 Executing notification action...');
      
      const response = await this.apiCall<{
        success: boolean;
        message: string;
        [key: string]: any;
      }>(`/api/notifications/${notificationId}/action`, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });
      
      if (response.success) {
        console.log('✅ Notification action executed successfully');
        return response;
      } else {
        throw new Error('Failed to execute notification action');
      }
    } catch (error) {
      console.error('❌ Execute action error:', error);
      throw error;
    }
  }
  
  // Get notification settings
  async getNotificationSettings(): Promise<{
    enabled: boolean;
    email: boolean;
  }> {
    try {
      console.log('⚙️ Getting notification settings...');
      
      const response = await this.apiCall<{
        success: boolean;
        settings: {
          enabled: boolean;
          email: boolean;
        };
      }>('/api/notifications/settings', {
        method: 'GET',
      }, 0, true);
      
      if (response.success) {
        return response.settings;
      }
      
      throw new Error('Failed to get notification settings');
    } catch (error) {
      console.error('❌ Get notification settings error:', error);
      return { enabled: true, email: true }; // Return defaults
    }
  }
  
  // Update notification settings
  async updateNotificationSettings(settings: {
    enabled?: boolean;
    email?: boolean;
    pushToken?: string;
  }): Promise<void> {
    try {
      console.log('⚙️ Updating notification settings...');
      
      const response = await this.apiCall<{
        success: boolean;
      }>('/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      
      if (response.success) {
        console.log('✅ Notification settings updated successfully');
      } else {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      console.error('❌ Update notification settings error:', error);
      throw error;
    }
  }
  
  // Send test notification
  async sendTestNotification(title?: string, message?: string): Promise<void> {
    try {
      console.log('🧪 Sending test notification...');
      
      const response = await this.apiCall<{
        success: boolean;
      }>('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ title, message }),
      });
      
      if (response.success) {
        console.log('✅ Test notification sent successfully');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('❌ Send test notification error:', error);
      throw error;
    }
  }

  // 🔧 ADDED: Connection diagnostic method
  async diagnoseConnection(): Promise<{
    baseUrl: string;
    healthCheck: boolean;
    cors: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Diagnosing API connection...');
      
      // Test basic connectivity
      const healthResult = await this.healthCheck();
      const latency = Date.now() - startTime;
      
      return {
        baseUrl: this.baseURL,
        healthCheck: true,
        cors: true,
        latency,
      };
    } catch (error: any) {
      console.error('❌ Connection diagnosis failed:', error);
      
      return {
        baseUrl: this.baseURL,
        healthCheck: false,
        cors: error.message.includes('CORS'),
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

const apiService = new MobileApiService();

export default apiService;
export type { 
  User, 
  LoginResponse, 
  AppStats, 
  Booking, 
  GameZone, 
  ApiResponse
};