import React, { useState, useEffect } from 'react';
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
Alert,
RefreshControl,
ActivityIndicator,
Modal,
Switch,
TextInput,
Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationData } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';

type FilterType = 'all' | 'unread' | 'booking' | 'payment' | 'zone' | 'system';

export default function VendorNotificationsScreen() {
const { user } = useAuth();
const {
  notifications,
  unreadCount,
  isLoading,
  refreshNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  executeAction
} = useNotifications();

const [filter, setFilter] = useState<FilterType>('all');
const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
const [showSettings, setShowSettings] = useState(false);
const [settingsLoading, setSettingsLoading] = useState(false);
const [showDeclineModal, setShowDeclineModal] = useState(false);
const [declineReason, setDeclineReason] = useState('');
const [currentDeclineNotificationId, setCurrentDeclineNotificationId] = useState<string | null>(null);
const [notificationSettings, setNotificationSettings] = useState({
  enabled: true,
  email: true
});

// FIXED: Enhanced vendor notification filter to hide processed booking requests
const filteredNotifications = notifications.filter(notification => {
  // First filter by vendor-specific criteria
  const isVendorNotification = 
    notification.data?.userType === 'vendor' ||
    notification.data?.notificationFor === 'business' ||
    notification.data?.isVendorNotification === true ||
    // ADDED: Include booking-related notifications that vendors need to see
    (notification.type === 'booking_created' && notification.data?.bookingAction === 'review_required') ||
    (notification.type === 'booking_confirmed') ||
    (notification.type === 'booking_cancelled') ||
    (notification.type === 'booking_updated') ||
    // ADDED: Include payment notifications for vendor bookings
    (notification.type === 'payment_success' && notification.data?.vendorId === user?.id) ||
    (notification.type === 'payment_failed' && notification.data?.vendorId === user?.id) ||
    // ADDED: Include zone notifications for vendor zones
    (notification.type === 'zone_update' && notification.data?.vendorId === user?.id) ||
    (notification.type === 'zone_approved' && notification.data?.vendorId === user?.id) ||
    (notification.type === 'zone_rejected' && notification.data?.vendorId === user?.id);

  if (!isVendorNotification) return false;

  // ADDED: Hide processed booking requests (that have been confirmed/declined)
  if (notification.type === 'booking_created' && notification.data?.bookingAction === 'review_required') {
    // Check if this booking has been processed (confirmed/declined)
    const bookingId = notification.data?.bookingId;
    const hasProcessedNotification = notifications.some(n => 
      n.data?.bookingId === bookingId && 
      (n.type === 'booking_confirmed' || n.type === 'booking_cancelled') &&
      n.data?.userType === 'vendor'
    );
    
    // If there's a processed notification for this booking, hide the original request
    if (hasProcessedNotification) {
      return false;
    }
  }

  // Then apply category filter
  switch (filter) {
    case 'unread':
      return !notification.isRead;
    case 'booking':
      return notification.category === 'booking' || 
             notification.type.startsWith('booking_');
    case 'payment':
      return notification.category === 'payment' || 
             notification.type.startsWith('payment_');
    case 'zone':
      return notification.category === 'zone' || 
             notification.type.startsWith('zone_');
    case 'system':
      return notification.category === 'system';
    default:
      return true;
  }
});

// Load notification settings
useEffect(() => {
  loadNotificationSettings();
}, []);

const loadNotificationSettings = async () => {
  try {
    const NotificationService = (await import('../../services/NotificationService')).default;
    const settings = await NotificationService.getSettings();
    setNotificationSettings(settings);
  } catch (error) {
    console.error('❌ Failed to load notification settings:', error);
  }
};

const handleDeclineBooking = async () => {
  if (!currentDeclineNotificationId) return;

  if (!declineReason.trim()) {
    Alert.alert('Error', 'Please provide a reason for declining');
    return;
  }

  try {
    const notification = notifications.find(n => n.id === currentDeclineNotificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const bookingId = notification.data?.bookingId;
    if (!bookingId) {
      throw new Error('Booking ID not found in notification');
    }

    // Get API URL and token
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://gamezone-production.up.railway.app';
    const token = await AsyncStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    console.log('❌ Calling booking decline API...');
    
    const declineResponse = await fetch(`${apiUrl}/api/vendor/bookings/${bookingId}/decline`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: declineReason.trim()
      })
    });
    
    console.log('📡 Decline API Response status:', declineResponse.status);
    
    if (declineResponse.ok) {
      const result = await declineResponse.json();
      console.log('✅ Booking declined successfully:', result);
      
      // Close modal
      setShowDeclineModal(false);
      setCurrentDeclineNotificationId(null);
      setDeclineReason('');
      
      Alert.alert('Success', 'Booking declined successfully');
      await refreshNotifications();
      
      // Mark notification as read
      await markAsRead([currentDeclineNotificationId]);
    } else {
      const errorData = await declineResponse.json();
      console.error('❌ Decline API Error:', errorData);
      
      if (declineResponse.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again to decline bookings.');
      } else {
        throw new Error(errorData.error || 'Failed to decline booking');
      }
    }
  } catch (error) {
    console.error('❌ Failed to decline booking:', error);
    Alert.alert('Error', 'Failed to decline booking: ' + error.message);
  }
};

const handleNotificationPress = async (notification: NotificationData) => {
  try {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }

    // ENHANCED: For booking requests, show actions directly instead of navigating
    if (notification.type === 'booking_created' && 
        notification.data?.bookingAction === 'review_required' && 
        notification.actions && notification.actions.length > 0) {
      // Show the confirm/cancel actions immediately
      showNotificationActions(notification);
      return;
    }

    // For other notification types, navigate to relevant screen
    switch (notification.type) {
      case 'booking_created':
        if (notification.data.bookingId) {
          router.push(`/vendor/booking/${notification.data.bookingId}`);
        } else {
          router.push('/vendor/bookings');
        }
        break;
      case 'booking_confirmed':
        // Show booking confirmation details and navigate to booking
        if (notification.data?.bookingId) {
          router.push(`/vendor/booking/${notification.data.bookingId}`);
        } else {
          router.push('/vendor/bookings');
        }
        break;
      case 'booking_cancelled':
        // Show cancellation details and navigate to booking
        if (notification.data?.bookingId) {
          router.push(`/vendor/booking/${notification.data.bookingId}`);
        } else {
          router.push('/vendor/bookings');
        }
        break;
      case 'booking_updated':
        if (notification.data?.bookingId) {
          router.push(`/vendor/booking/${notification.data.bookingId}`);
        } else {
          router.push('/vendor/bookings');
        }
        break;
      case 'payment_success':
      case 'payment_failed':
        if (notification.data?.bookingId) {
          router.push(`/vendor/booking/${notification.data.bookingId}`);
        } else {
          router.push('/vendor/earnings');
        }
        break;
      case 'zone_update':
      case 'zone_approved':
      case 'zone_rejected':
        if (notification.data.zoneId) {
          router.push(`/vendor/zone/${notification.data.zoneId}`);
        } else {
          router.push('/vendor/zones');
        }
        break;
      default:
        // Show notification details
        showNotificationDetails(notification);
        break;
    }
  } catch (error) {
    console.error('❌ Failed to handle notification press:', error);
    Alert.alert('Error', 'Failed to open notification');
  }
};

const showNotificationDetails = (notification: NotificationData) => {
  Alert.alert(
    notification.title,
    notification.message,
    [
      { text: 'Close', style: 'cancel' },
      ...(notification.actions && notification.actions.length > 0 ? [
        {
          text: 'Actions',
          onPress: () => showNotificationActions(notification)
        }
      ] : [])
    ]
  );
};

const showNotificationActions = (notification: NotificationData) => {
  if (!notification.actions || notification.actions.length === 0) {
    Alert.alert('No Actions', 'No actions available for this notification');
    return;
  }

  // For booking requests, show confirm/cancel actions prominently
  if (notification.type === 'booking_created' && notification.data?.bookingAction === 'review_required') {
    Alert.alert(
      'Booking Request',
      `${notification.message}\n\nDo you want to confirm or decline this booking?`,
      [
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => handleNotificationAction(notification.id, 'decline')
        },
        {
          text: 'Confirm',
          onPress: () => handleNotificationAction(notification.id, 'confirm')
        }
      ]
    );
    return;
  }

  // For other notifications, show all available actions
  const actionButtons = notification.actions.map(action => ({
    text: action.label,
    style: action.type === 'cancel' || action.type === 'decline' || action.type === 'reject' ? 'destructive' : 'default',
    onPress: () => handleNotificationAction(notification.id, action.type)
  }));

  Alert.alert(
    'Available Actions',
    `Choose an action for: ${notification.title}`,
    [
      { text: 'Close', style: 'cancel' },
      ...actionButtons
    ]
  );
};

const handleNotificationAction = async (notificationId: string, actionType: string) => {
  try {
    // Get the notification to extract booking details
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const bookingId = notification.data?.bookingId;
    if (!bookingId) {
      throw new Error('Booking ID not found in notification');
    }

    // Get API URL from environment variable
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://gamezone-production.up.railway.app';

    // Get authentication token
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    console.log('🔄 Executing notification action:', { actionType, bookingId, notificationId, apiUrl });

    // Handle different action types
    switch (actionType) {
      case 'confirm':
      case 'accept':
        try {
          console.log('✅ Calling booking confirmation API...');
          
          // Make direct API call to confirm booking
          const response = await fetch(`${apiUrl}/api/vendor/bookings/${bookingId}/confirm`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              message: 'Booking confirmed through notification'
            })
          });

          console.log('📡 API Response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Booking confirmed successfully:', result);
            
            Alert.alert('Success', 'Booking confirmed successfully!');
            await refreshNotifications();
            
            // Mark notification as read
            await markAsRead([notificationId]);
          } else {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            
            if (response.status === 401) {
              Alert.alert('Authentication Error', 'Please log in again to confirm bookings.');
            } else {
              throw new Error(errorData.error || 'Failed to confirm booking');
            }
          }
        } catch (error) {
          console.error('❌ Failed to confirm booking:', error);
          Alert.alert('Error', 'Failed to confirm booking: ' + error.message);
        }
        break;

      case 'decline':
      case 'cancel':
      case 'reject':
        // Show custom decline modal (works on both iOS and Android)
        setCurrentDeclineNotificationId(notificationId);
        setDeclineReason('');
        setShowDeclineModal(true);
        break;

      default:
        // For other actions, try to use the original executeAction
        console.log('🔄 Using original executeAction for:', actionType);
        try {
          const response = await executeAction(notificationId, actionType);
          console.log('✅ Original executeAction response:', response);
          
          if (response.success) {
            Alert.alert('Success', 'Action completed successfully');
            await refreshNotifications();
          }
        } catch (error) {
          console.error('❌ Original executeAction failed:', error);
          Alert.alert('Error', 'Failed to execute action');
        }
        break;
    }

  } catch (error) {
    console.error('❌ Failed to execute notification action:', error);
    Alert.alert('Error', error.message || 'Failed to execute action');
  }
};

const handleLongPress = (notificationId: string) => {
  if (selectedNotifications.includes(notificationId)) {
    setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
  } else {
    setSelectedNotifications(prev => [...prev, notificationId]);
  }
};

const handleSelectAll = () => {
  if (selectedNotifications.length === filteredNotifications.length) {
    setSelectedNotifications([]);
  } else {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  }
};

const handleBulkMarkAsRead = async () => {
  if (selectedNotifications.length === 0) return;

  try {
    await markAsRead(selectedNotifications);
    setSelectedNotifications([]);
    Alert.alert('Success', `${selectedNotifications.length} notifications marked as read`);
  } catch (error) {
    Alert.alert('Error', 'Failed to mark notifications as read');
  }
};

const handleBulkDelete = async () => {
  if (selectedNotifications.length === 0) return;

  Alert.alert(
    'Delete Notifications',
    `Are you sure you want to delete ${selectedNotifications.length} notification(s)?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(
              selectedNotifications.map(id => deleteNotification(id))
            );
            setSelectedNotifications([]);
            Alert.alert('Success', 'Notifications deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete notifications');
          }
        }
      }
    ]
  );
};

const handleMarkAllAsRead = async () => {
  try {
    await markAllAsRead();
    Alert.alert('Success', 'All notifications marked as read');
  } catch (error) {
    Alert.alert('Error', 'Failed to mark all notifications as read');
  }
};

const updateNotificationSettings = async (key: keyof typeof notificationSettings, value: boolean) => {
  try {
    setSettingsLoading(true);
    const NotificationService = (await import('../../services/NotificationService')).default;
    
    const newSettings = { ...notificationSettings, [key]: value };
    await NotificationService.updateSettings(newSettings);
    setNotificationSettings(newSettings);
    
    Alert.alert('Success', 'Notification settings updated');
  } catch (error) {
    console.error('❌ Failed to update notification settings:', error);
    Alert.alert('Error', 'Failed to update notification settings');
  } finally {
    setSettingsLoading(false);
  }
};

// ENHANCED: Better icon mapping for different notification types
const getNotificationIcon = (type: string, category: string) => {
  switch (type) {
    case 'booking_created':
      return 'calendar-outline';
    case 'booking_confirmed':
      return 'checkmark-circle-outline';
    case 'booking_cancelled':
      return 'close-circle-outline';
    case 'booking_updated':
      return 'refresh-circle-outline';
    case 'payment_success':
      return 'card-outline';
    case 'payment_failed':
      return 'alert-circle-outline';
    case 'zone_update':
      return 'location-outline';
    case 'zone_approved':
      return 'checkmark-done-outline';
    case 'zone_rejected':
      return 'close-outline';
    default:
      switch (category) {
        case 'booking':
          return 'calendar-outline';
        case 'payment':
          return 'card-outline';
        case 'zone':
          return 'location-outline';
        case 'system':
          return 'settings-outline';
        default:
          return 'notifications-outline';
      }
  }
};

// ENHANCED: Better color mapping for different notification types
const getNotificationColor = (type: string, priority: string) => {
  if (priority === 'urgent') return '#ef4444';
  if (priority === 'high') return '#f59e0b';
  
  switch (type) {
    case 'booking_created':
      return '#3b82f6';
    case 'booking_confirmed':
      return '#10b981';
    case 'booking_cancelled':
      return '#ef4444';
    case 'booking_updated':
      return '#f59e0b';
    case 'payment_success':
      return '#10b981';
    case 'payment_failed':
      return '#ef4444';
    case 'zone_approved':
      return '#10b981';
    case 'zone_rejected':
      return '#ef4444';
    default:
      return '#6366f1';
  }
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

const renderNotification = ({ item }: { item: NotificationData }) => {
  const isSelected = selectedNotifications.includes(item.id);
  const iconName = getNotificationIcon(item.type, item.category);
  const iconColor = getNotificationColor(item.type, item.priority);
  const showActionButtons = item.type === 'booking_created' && 
                           item.data?.bookingAction === 'review_required' && 
                           !item.isRead;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
        isSelected && styles.selectedNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleLongPress(item.id)}
      activeOpacity={0.7}
    >
      {/* Top Row: Icon, Content, Menu Button */}
      <View style={styles.notificationMainRow}>
        <View style={styles.notificationIcon}>
          <Ionicons name={iconName as any} size={24} color={iconColor} />
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>
              {formatRelativeTime(item.createdAt)}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: iconColor + '20' }]}>
              <Text style={[styles.priorityText, { color: iconColor }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Menu button for other actions */}
        {item.actions && item.actions.length > 0 && !showActionButtons && (
          <TouchableOpacity
            style={styles.actionsButton}
            onPress={() => showNotificationDetails(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Bottom Row: Action Buttons (only for booking requests) */}
      {showActionButtons && (
        <View style={styles.bookingActionButtons}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleNotificationAction(item.id, 'confirm')}
          >
            <Text style={styles.confirmButtonText}>
              Confirm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleNotificationAction(item.id, 'decline')}
          >
            <Text style={styles.cancelButtonText}>
              Decline
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const renderFilterButton = (filterType: FilterType, label: string, count?: number) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      filter === filterType && styles.activeFilterButton
    ]}
    onPress={() => setFilter(filterType)}
  >
    <Text style={[
      styles.filterButtonText,
      filter === filterType && styles.activeFilterButtonText
    ]}>
      {label}
      {count !== undefined && ` (${count})`}
    </Text>
  </TouchableOpacity>
);

const renderEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="notifications-outline" size={64} color="#d1d5db" />
    <Text style={styles.emptyTitle}>
      {filter === 'unread' ? 'No unread notifications' : 'No business notifications'}
    </Text>
    <Text style={styles.emptyDescription}>
      {filter === 'unread' 
        ? 'You\'re all caught up!' 
        : 'You\'ll see booking requests, confirmations, and business updates here.'
      }
    </Text>
  </View>
);

return (
  <View style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Business Notifications</Text>
      <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
        <Ionicons name="settings-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>

    {/* Filters */}
    <View style={styles.filtersContainer}>
      {renderFilterButton('all', 'All', filteredNotifications.length)}
      {renderFilterButton('unread', 'Unread', filteredNotifications.filter(n => !n.isRead).length)}
      {renderFilterButton('booking', 'Bookings')}
      {renderFilterButton('payment', 'Payment')}
      {renderFilterButton('zone', 'Zones')}
      {renderFilterButton('system', 'System')}
    </View>

    {/* Bulk Actions */}
    {selectedNotifications.length > 0 && (
      <View style={styles.bulkActionsContainer}>
        <Text style={styles.bulkActionsText}>
          {selectedNotifications.length} selected
        </Text>
        <View style={styles.bulkActionsButtons}>
          <TouchableOpacity style={styles.bulkActionButton} onPress={handleSelectAll}>
            <Text style={styles.bulkActionButtonText}>
              {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkActionButton} onPress={handleBulkMarkAsRead}>
            <Text style={styles.bulkActionButtonText}>Mark Read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkActionButton} onPress={handleBulkDelete}>
            <Text style={[styles.bulkActionButtonText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* Quick Actions */}
    {selectedNotifications.length === 0 && unreadCount > 0 && (
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickActionButton} onPress={handleMarkAllAsRead}>
          <Ionicons name="checkmark-done" size={16} color="#6366f1" />
          <Text style={styles.quickActionText}>Mark All as Read</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Notifications List */}
    <FlatList
      data={filteredNotifications}
      renderItem={renderNotification}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshNotifications}
          colors={['#6366f1']}
          tintColor="#6366f1"
        />
      }
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
    />

    {/* Settings Modal */}
    <Modal
      visible={showSettings}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Business Notification Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsContainer}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive booking requests and business updates
                </Text>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={(value) => updateNotificationSettings('enabled', value)}
                disabled={settingsLoading}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive business notifications via email
                </Text>
              </View>
              <Switch
                value={notificationSettings.email}
                onValueChange={(value) => updateNotificationSettings('email', value)}
                disabled={settingsLoading}
              />
            </View>
            
            {/* Test Notification Button (Development) */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.testButton}
                onPress={async () => {
                  try {
                    const NotificationService = (await import('../../services/NotificationService')).default;
                    await NotificationService.sendTestNotification();
                    Alert.alert('Success', 'Test notification sent!');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to send test notification');
                  }
                }}
              >
                <Text style={styles.testButtonText}>Send Test Notification</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>

    {/* Decline Booking Modal */}
    <Modal
      visible={showDeclineModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeclineModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Decline Booking</Text>
            <TouchableOpacity onPress={() => setShowDeclineModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.declineInstruction}>
            Please provide a reason for declining this booking:
          </Text>
          
          <TextInput
            style={styles.declineInput}
            placeholder="Enter decline reason..."
            value={declineReason}
            onChangeText={setDeclineReason}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          
          <View style={styles.declineActions}>
            <TouchableOpacity
              style={styles.declineCancelButton}
              onPress={() => setShowDeclineModal(false)}
            >
              <Text style={styles.declineCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineConfirmButton}
              onPress={handleDeclineBooking}
            >
              <Text style={styles.declineConfirmText}>Decline Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#f8fafc',
},
header: {
  backgroundColor: '#6366f1',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 50,
  paddingBottom: 20,
  paddingHorizontal: 20,
},
backButton: {
  padding: 8,
},
headerTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: 'white',
},
settingsButton: {
  padding: 8,
},
filtersContainer: {
  flexDirection: 'row',
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},
filterButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginRight: 8,
  borderRadius: 16,
  backgroundColor: '#f3f4f6',
},
activeFilterButton: {
  backgroundColor: '#6366f1',
},
filterButtonText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#6b7280',
},
activeFilterButtonText: {
  color: 'white',
},
bulkActionsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: '#f0f9ff',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},
bulkActionsText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#1f2937',
},
bulkActionsButtons: {
  flexDirection: 'row',
  gap: 12,
},
bulkActionButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: 'white',
  borderWidth: 1,
  borderColor: '#d1d5db',
},
bulkActionButtonText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#6366f1',
},
quickActionsContainer: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},
quickActionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-end',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: '#f0f9ff',
},
quickActionText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#6366f1',
  marginLeft: 4,
},
listContainer: {
  paddingVertical: 8,
},
notificationItem: {
  flexDirection: 'column',
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#f3f4f6',
},
unreadNotification: {
  backgroundColor: '#f8fafc',
  borderLeftWidth: 4,
  borderLeftColor: '#6366f1',
},
selectedNotification: {
  backgroundColor: '#f0f9ff',
},
notificationMainRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
},
notificationIcon: {
  position: 'relative',
  marginRight: 12,
  marginTop: 4,
},
unreadDot: {
  position: 'absolute',
  top: -2,
  right: -2,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#ef4444',
},
notificationContent: {
  flex: 1,
},
notificationTitle: {
  fontSize: 16,
  fontWeight: '500',
  color: '#1f2937',
  marginBottom: 4,
},
unreadTitle: {
  fontWeight: '600',
  color: '#111827',
},
notificationMessage: {
  fontSize: 14,
  color: '#6b7280',
  lineHeight: 20,
  marginBottom: 8,
},
notificationMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
notificationTime: {
  fontSize: 12,
  color: '#9ca3af',
},
priorityBadge: {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 8,
},
priorityText: {
  fontSize: 10,
  fontWeight: '600',
},
actionsButton: {
  padding: 8,
  marginLeft: 8,
},
bookingActionButtons: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 12,
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingLeft: 36, // Align with the text content (icon width + margin)
},
confirmButton: {
  backgroundColor: '#10b981',
  borderColor: '#10b981',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
  borderWidth: 1,
  minWidth: 85,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#10b981',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 2,
},
cancelButton: {
  backgroundColor: '#ef4444',
  borderColor: '#ef4444',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
  borderWidth: 1,
  minWidth: 85,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#ef4444',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 2,
},
confirmButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},
cancelButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},
emptyState: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 60,
  paddingHorizontal: 40,
},
emptyTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#4b5563',
  marginTop: 16,
  marginBottom: 8,
  textAlign: 'center',
},
emptyDescription: {
  fontSize: 14,
  color: '#6b7280',
  textAlign: 'center',
  lineHeight: 20,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: 'white',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 40,
  maxHeight: '80%',
},
modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1f2937',
},
settingsContainer: {
  gap: 20,
},
settingItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 8,
},
settingInfo: {
  flex: 1,
  marginRight: 16,
},
settingLabel: {
  fontSize: 16,
  fontWeight: '500',
  color: '#1f2937',
  marginBottom: 4,
},
settingDescription: {
  fontSize: 14,
  color: '#6b7280',
  lineHeight: 18,
},
testButton: {
  backgroundColor: '#6366f1',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 16,
},
testButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
},
declineInstruction: {
  fontSize: 16,
  color: '#374151',
  marginBottom: 16,
},
declineInput: {
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  minHeight: 100,
  marginBottom: 20,
  backgroundColor: '#f9fafb',
},
declineActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
},
declineCancelButton: {
  flex: 1,
  backgroundColor: '#f3f4f6',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},
declineCancelText: {
  color: '#6b7280',
  fontSize: 16,
  fontWeight: '600',
},
declineConfirmButton: {
  flex: 1,
  backgroundColor: '#ef4444',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},
declineConfirmText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
},
});