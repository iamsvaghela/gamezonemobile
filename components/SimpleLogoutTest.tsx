// components/SimpleLogoutTest.tsx - Simple test component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SimpleLogoutTest() {
  const { user, isLoggedIn, logout } = useAuth();

  const testAlert = () => {
    console.log('🧪 Testing Alert...');
    Alert.alert(
      'Test Alert',
      'This is a test alert',
      [
        { text: 'OK', onPress: () => console.log('✅ Alert worked!') }
      ]
    );
  };

  const testLogoutDirect = async () => {
    console.log('🧪 Testing direct logout...');
    try {
      await logout();
      console.log('✅ Direct logout completed');
    } catch (error) {
      console.error('❌ Direct logout failed:', error);
    }
  };

  const testLogoutWithAlert = () => {
    console.log('🧪 Testing logout with alert...');
    Alert.alert(
      'Test Logout',
      'Are you sure?',
      [
        { text: 'Cancel', onPress: () => console.log('❌ Cancelled') },
        { text: 'Logout', onPress: testLogoutDirect }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Simple Logout Test</Text>
      
      <Text style={styles.status}>
        User: {user?.email || 'None'} | Logged In: {isLoggedIn ? 'Yes' : 'No'}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={testAlert}>
          <Text style={styles.buttonText}>Test Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLogoutDirect}>
          <Text style={styles.buttonText}>Direct Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLogoutWithAlert}>
          <Text style={styles.buttonText}>Logout with Alert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    margin: 10,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
    textAlign: 'center',
  },
  status: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttons: {
    gap: 8,
  },
  button: {
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});