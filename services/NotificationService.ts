
// services/NotificationService.ts - Frontend notification service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import apiService from './api';

export interface NotificationData {
  id: string;
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder' | 'payment_success' | 'payment_failed' | 'zone_update' | 'system_announcement';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'booking' | 'payment' | 'zone' | 'system';
  actions: NotificationAction[];
  createdAt: string;
}

export interface NotificationAction {
  type: 'confirm' | 'cancel' | 'view' | 'update';
  label: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface NotificationSettings {
  enabled: boolean;
  email: boolean;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private isInitialized = false;
  private listeners: ((notification: NotificationData) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service
  async initialize(): Promise<void> {
    try {
      console.log('🔔 Initializing notification service...');
      
      // Request permissions
      await this.requestPermissions();
      
      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Setup notification listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  // Request notification permissions
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('⚠️ Push notification permissions not granted');
          return false;
        }
        
        console.log('✅ Push notification permissions granted');
        return true;
      } else {
        console.warn('⚠️ Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  // Register for push notifications
  private async registerForPushNotifications(): Promise<void> {
    try {
      if (Device.isDevice) {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        this.pushToken = token;
        
        console.log('📱 Push token obtained:', token);
        
        // Send token to backend
        await this.updatePushToken(token);
        
        // Configure notification channel for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }
  }

  // Setup notification listeners
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📨 Notification received:', notification);
      
      const notificationData: NotificationData = {
        id: notification.request.identifier,
        type: notification.request.content.data?.type || 'system_announcement',
        title: notification.request.content.title || 'Notification',
        message: notification.request.content.body || '',
        data: notification.request.content.data || {},
        isRead: false,
        priority: notification.request.content.data?.priority || 'medium',
        category: notification.request.content.data?.category || 'system',
        actions: notification.request.content.data?.actions || [],
        createdAt: new Date().toISOString()
      };
      
      // Notify listeners
      this.listeners.forEach(listener => listener(notificationData));
    });

    // Listen for notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      
      const notificationData = response.notification.request.content.data;
      this.handleNotificationTap(notificationData);
    });
  }

  // Handle notification tap
  private handleNotificationTap(data: any): void {
    console.log('🎯 Handling notification tap:', data);
    
    // You can add navigation logic here based on notification type
    switch (data.type) {
      case 'booking_created':
      case 'booking_confirmed':
      case 'booking_cancelled':
        // Navigate to booking details
        // router.push(`/booking/${data.bookingId}`);
        break;
      case 'zone_update':
        // Navigate to zone details
        // router.push(`/gamezone/${data.zoneId}`);
        break;
      default:
        // Navigate to notifications screen
        // router.push('/notifications');
        break;
    }
  }

  // Add notification listener
  addListener(listener: (notification: NotificationData) => void): void {
    this.listeners.push(listener);
  }

  // Remove notification listener
  removeListener(listener: (notification: NotificationData) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Update push token on backend
  async updatePushToken(token: string): Promise<void> {
    try {
      // Use the new API service method
      await apiService.updateNotificationSettings({
        pushToken: token
      });
      console.log('✅ Push token updated on backend');
    } catch (error) {
      console.error('❌ Failed to update push token:', error);
    }
  }

  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
    category?: string;
  } = {}): Promise<{
    notifications: NotificationData[];
    pagination: any;
    unreadCount: number;
  }> {
    try {
      // Use the new API service method
      const response = await apiService.getNotifications(options);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      throw error;
    }
  }
  

  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    try {
      // Use the new API service method
      const count = await apiService.getUnreadNotificationCount();
      return count;
    } catch (error) {
      console.error('❌ Failed to fetch unread count:', error);
      return 0;
    }
  }
  

  // Mark notifications as read
  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      // Use the new API service method
      await apiService.markNotificationsAsRead(notificationIds);
      console.log('✅ Notifications marked as read');
    } catch (error) {
      console.error('❌ Failed to mark notifications as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      // Use the new API service method
      await apiService.markAllNotificationsAsRead();
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      // Use the new API service method
      await apiService.deleteNotification(notificationId);
      console.log('✅ Notification deleted');
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      throw error;
    }
  }

  // Execute notification action
  async executeAction(notificationId: string, actionType: string): Promise<any> {
    try {
      // Use the new API service method
      const response = await apiService.executeNotificationAction(notificationId, actionType);
      console.log('✅ Notification action executed:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to execute notification action:', error);
      throw error;
    }
  }

  // Get notification settings
  async getSettings(): Promise<NotificationSettings> {
    try {
      // Use the new API service method
      const settings = await apiService.getNotificationSettings();
      return settings;
    } catch (error) {
      console.error('❌ Failed to fetch notification settings:', error);
      return { enabled: true, email: true };
    }
  }
  

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      // Use the new API service method
      await apiService.updateNotificationSettings(settings);
      console.log('✅ Notification settings updated');
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
      throw error;
    }
  }

  // Send test notification (development only)
  async sendTestNotification(title?: string, message?: string): Promise<void> {
    try {
      // Use the new API service method
      await apiService.sendTestNotification(title, message);
      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }

  // Local notification for immediate feedback
  async showLocalNotification(title: string, message: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
    }
  }

  // Schedule local notification
  async scheduleLocalNotification(
    title: string,
    message: string,
    scheduledFor: Date,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
        },
        trigger: scheduledFor,
      });
      console.log('⏰ Local notification scheduled for:', scheduledFor);
    } catch (error) {
      console.error('❌ Failed to schedule local notification:', error);
    }
  }

  // Get push token
  getPushToken(): string | null {
    return this.pushToken;
  }

  // Check if initialized
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export default NotificationService.getInstance();