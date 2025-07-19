// contexts/NotificationContext.tsx - Updated with role-based filtering
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import NotificationService, { NotificationData } from '../services/NotificationService';

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  executeAction: (notificationId: string, actionType: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn && user) {
      initializeNotifications();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [isLoggedIn, user?.role]);

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Initializing notifications for user:', user?.role, user?.email);
      
      // Initialize notification service
      await NotificationService.initialize();
      
      // Load initial notifications
      await refreshNotifications();
      
      // Add listener for new notifications
      NotificationService.addListener(handleNewNotification);
      
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter notifications based on user role
  const filterNotificationsByRole = (notifications: NotificationData[]): NotificationData[] => {
    if (!user) return [];
    
    console.log('🔍 Filtering notifications for role:', user.role);
    console.log('🔍 Total notifications before filtering:', notifications.length);
    
    const filtered = notifications.filter(notification => {
      // Check various role indicators in the notification data
      const notificationFor = notification.data?.notificationFor;
      const userType = notification.data?.userType;
      const isVendorNotification = notification.data?.isVendorNotification;
      const isCustomerNotification = notification.data?.isCustomerNotification;
      
      if (user.role === 'vendor') {
        // Vendor should see:
        // - Notifications with userType: 'vendor'
        // - Notifications with notificationFor: 'business'
        // - Notifications with isVendorNotification: true
        // - Specific vendor notification types
        const isForVendor = 
          userType === 'vendor' ||
          notificationFor === 'business' ||
          isVendorNotification === true ||
          notification.type === 'booking_request_received' ||
          notification.type === 'booking_confirmed' ||
          notification.type === 'booking_cancelled';
        
        if (isForVendor) {
          console.log('✅ Vendor notification:', notification.type, notification.title);
          return true;
        }
      } else if (user.role === 'user') {
        // Gamer should see:
        // - Notifications with userType: 'gamer' or 'user'
        // - Notifications with notificationFor: 'customer'
        // - Notifications with isCustomerNotification: true
        // - Specific gamer notification types
        const isForGamer = 
          userType === 'gamer' ||
          userType === 'user' ||
          notificationFor === 'customer' ||
          isCustomerNotification === true ||
          notification.type === 'booking_submitted' ||
          notification.type === 'booking_confirmed' ||
          notification.type === 'booking_cancelled' ||
          notification.type === 'system_announcement';
        
        if (isForGamer) {
          console.log('✅ Gamer notification:', notification.type, notification.title);
          return true;
        }
      }
      
      // Default: if no role indicators, show to all (for system notifications)
      if (!notificationFor && !userType && !isVendorNotification && !isCustomerNotification) {
        console.log('📢 System notification (no role filter):', notification.type, notification.title);
        return true;
      }
      
      console.log('❌ Filtered out notification:', notification.type, notification.title, {
        notificationFor,
        userType,
        isVendorNotification,
        isCustomerNotification,
        currentUserRole: user.role
      });
      
      return false;
    });
    
    console.log('🔍 Filtered notifications count:', filtered.length);
    return filtered;
  };

  const handleNewNotification = (notification: NotificationData) => {
    console.log('📨 New notification received:', notification.type, notification.title);
    
    // Filter the single notification
    const filtered = filterNotificationsByRole([notification]);
    
    if (filtered.length > 0) {
      console.log('✅ New notification matches user role, adding to list');
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Show local notification for immediate feedback
      NotificationService.showLocalNotification(
        notification.title,
        notification.message,
        notification.data
      );
    } else {
      console.log('❌ New notification filtered out - not for current user role');
    }
  };

  const refreshNotifications = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Refreshing notifications for user:', user?.role, user?.email);
      
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        NotificationService.getNotifications({ page: 1, limit: 50 }),
        NotificationService.getUnreadCount()
      ]);
      
      console.log('📊 API returned notifications:', notificationsResponse.notifications.length);
      console.log('📊 API returned unread count:', unreadCountResponse);
      
      // Filter notifications by role
      const filteredNotifications = filterNotificationsByRole(notificationsResponse.notifications);
      
      // Calculate filtered unread count
      const filteredUnreadCount = filteredNotifications.filter(n => !n.isRead).length;
      
      setNotifications(filteredNotifications);
      setUnreadCount(filteredUnreadCount);
      
      console.log('✅ Notifications refreshed successfully');
      console.log('📊 Final filtered count:', filteredNotifications.length);
      console.log('📊 Final unread count:', filteredUnreadCount);
      
    } catch (error) {
      console.error('❌ Failed to refresh notifications:', error);
      
      // Don't throw error, just log it and keep existing state
      console.log('⚠️ Using fallback notification state');
      
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await NotificationService.markAsRead(notificationIds);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notificationIds.includes(notif.id) 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      
      // Update unread count
      const unreadToRead = notifications.filter(notif => 
        notificationIds.includes(notif.id) && !notif.isRead
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadToRead));
      
    } catch (error) {
      console.error('❌ Failed to mark notifications as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(notif => notif.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      throw error;
    }
  };

  const executeAction = async (notificationId: string, actionType: string) => {
    try {
      const response = await NotificationService.executeAction(notificationId, actionType);
      
      // Mark notification as read
      await markAsRead([notificationId]);
      
      return response;
      
    } catch (error) {
      console.error('❌ Failed to execute notification action:', error);
      throw error;
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    executeAction
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};