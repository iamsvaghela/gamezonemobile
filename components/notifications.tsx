// app/notifications.tsx - Notifications screen
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationData } from '../services/NotificationService';

type FilterType = 'all' | 'unread' | 'booking' | 'payment' | 'zone' | 'system';

export default function NotificationsScreen() {
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
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    email: true
  });

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'booking':
      case 'payment':
      case 'zone':
      case 'system':
        return notification.category === filter;
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
      const NotificationService = (await import('../services/NotificationService')).default;
      const settings = await NotificationService.getSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('❌ Failed to load notification settings:', error);
    }
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    try {
      // Mark as read if unread
      if (!notification.isRead) {
        await markAsRead([notification.id]);
      }

      // Handle navigation based on notification type
      switch (notification.type) {
        case 'booking_created':
        case 'booking_confirmed':
        case 'booking_cancelled':
          if (notification.data.bookingId) {
            router.push(`/booking/${notification.data.bookingId}`);
          } else {
            router.push('/(tabs)/bookings');
          }
          break;
        case 'zone_update':
          if (notification.data.zoneId) {
            router.push(`/gamezone/${notification.data.zoneId}`);
          } else {
            router.push('/(tabs)/gamezone');
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
        ...(notification.actions.length > 0 ? [
          {
            text: 'Actions',
            onPress: () => showNotificationActions(notification)
          }
        ] : [])
      ]
    );
  };

  const showNotificationActions = (notification: NotificationData) => {
    const actionButtons = notification.actions.map(action => ({
      text: action.label,
      onPress: () => handleNotificationAction(notification.id, action.type)
    }));

    Alert.alert(
      'Available Actions',
      `Choose an action for: ${notification.title}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...actionButtons
      ]
    );
  };

  const handleNotificationAction = async (notificationId: string, actionType: string) => {
    try {
      const response = await executeAction(notificationId, actionType);
      
      // Handle the action response
      if (response.action) {
        Alert.alert(
          'Action Completed',
          `${response.action.label} executed successfully`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Failed to execute notification action:', error);
      Alert.alert('Error', 'Failed to execute action');
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
      const NotificationService = (await import('../services/NotificationService')).default;
      
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

  const getNotificationIcon = (type: string, category: string) => {
    switch (type) {
      case 'booking_created':
        return 'calendar';
      case 'booking_confirmed':
        return 'checkmark-circle';
      case 'booking_cancelled':
        return 'close-circle';
      case 'payment_success':
        return 'card';
      case 'payment_failed':
        return 'alert-circle';
      case 'zone_update':
        return 'location';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return '#ef4444';
    if (priority === 'high') return '#f59e0b';
    
    switch (type) {
      case 'booking_confirmed':
        return '#10b981';
      case 'booking_cancelled':
        return '#ef4444';
      case 'payment_success':
        return '#10b981';
      case 'payment_failed':
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
        
        {item.actions.length > 0 && (
          <TouchableOpacity
            style={styles.actionsButton}
            onPress={() => showNotificationActions(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
          </TouchableOpacity>
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
        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
      </Text>
      <Text style={styles.emptyDescription}>
        {filter === 'unread' 
          ? 'You\'re all caught up!' 
          : 'You\'ll see booking updates and important information here.'
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All', notifications.length)}
        {renderFilterButton('unread', 'Unread', unreadCount)}
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
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications on your device
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
                    Receive notifications via email
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
                      const NotificationService = (await import('../services/NotificationService')).default;
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
    flexDirection: 'row',
    alignItems: 'flex-start',
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
});