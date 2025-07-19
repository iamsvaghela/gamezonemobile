// components/NotificationDebug.tsx - Debug component to test notification count
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export function NotificationDebug() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, refreshNotifications } = useNotifications();

  const handleTestRefresh = async () => {
    console.log('🔄 Testing notification refresh...');
    await refreshNotifications();
    console.log('✅ Refresh completed');
  };

  const handleShowDebugInfo = () => {
    const debugInfo = {
      user: {
        id: user?._id,
        email: user?.email,
        role: user?.role
      },
      notifications: notifications.length,
      unreadCount,
      isLoading,
      notificationTitles: notifications.map(n => n.title)
    };

    console.log('🔍 Debug info:', debugInfo);
    Alert.alert(
      'Notification Debug',
      JSON.stringify(debugInfo, null, 2),
      [{ text: 'OK' }]
    );
  };

  // Only show in development
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Debug</Text>
      <Text style={styles.info}>User: {user?.email} ({user?.role})</Text>
      <Text style={styles.info}>Notifications: {notifications.length}</Text>
      <Text style={styles.info}>Unread: {unreadCount}</Text>
      <Text style={styles.info}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
      
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={handleTestRefresh}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleShowDebugInfo}>
          <Text style={styles.buttonText}>Debug Info</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});