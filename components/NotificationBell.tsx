// components/NotificationBell.tsx - FIXED to show count and red badge
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBellProps {
  iconColor?: string;
  style?: any;
}

export function NotificationBell({ iconColor = '#6366f1', style }: NotificationBellProps) {
  const { user, isLoggedIn } = useAuth();
  const { unreadCount, isLoading, refreshNotifications } = useNotifications();

  // Don't show notification bell if user is not logged in
  if (!isLoggedIn || !user) {
    return null;
  }

  // Refresh notifications when component mounts
  useEffect(() => {
    if (isLoggedIn && user) {
      console.log('🔔 NotificationBell: Refreshing notifications for user:', user.role, user.email);
      refreshNotifications();
    }
  }, [isLoggedIn, user?.role, user?.email]);

  const handleNotificationPress = () => {
    console.log('🔔 Notification bell pressed by:', user.role, user.email);
    console.log('🔔 Current unread count:', unreadCount);
    
    // Navigate to appropriate notifications screen
    if (user.role === 'vendor') {
      console.log('🏢 Navigating to vendor notifications...');
      router.push('/vendor/notifications');
    } else {
      console.log('🎮 Navigating to user notifications...');
      router.push('/notifications');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleNotificationPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="notifications"
          size={24}
          color={iconColor}
        />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingDot} />
          </View>
        )}
      </View>
      
      {/* Role indicator (optional - for debugging) */}
      {__DEV__ && (
        <Text style={styles.roleIndicator}>
          {user.role === 'vendor' ? 'V' : 'G'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444', // Red color for unread badge
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  loadingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    margin: 2,
  },
  roleIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
});