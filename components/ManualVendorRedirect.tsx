// components/ManualVendorRedirect.tsx - Test component for manual redirects
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function ManualVendorRedirect() {
  const { user, isLoggedIn } = useAuth();

  // Auto-redirect effect
  useEffect(() => {
    console.log('🔧 ManualVendorRedirect: Checking user state');
    console.log('🔧 User:', user);
    console.log('🔧 isLoggedIn:', isLoggedIn);
    console.log('🔧 Role:', user?.role);

    if (isLoggedIn && user?.role === 'vendor') {
      console.log('🚀 ManualVendorRedirect: VENDOR DETECTED - Auto redirecting...');
      
      // Show alert and redirect
      Alert.alert(
        'Vendor Detected!',
        'You will be redirected to the vendor dashboard.',
        [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              console.log('🏢 Manual redirect to vendor dashboard');
              router.replace('/vendor/dashboard');
            }
          }
        ]
      );
    }
  }, [isLoggedIn, user?.role]);

  // Manual redirect button for testing
  const handleManualRedirect = () => {
    console.log('🔧 Manual redirect button clicked');
    if (user?.role === 'vendor') {
      router.replace('/vendor/dashboard');
    } else {
      Alert.alert('Not a Vendor', 'Only vendors can access the dashboard');
    }
  };

  // Only render if user is logged in
  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Vendor Redirect Test</Text>
      
      <View style={styles.info}>
        <Text style={styles.infoText}>User: {user.name}</Text>
        <Text style={styles.infoText}>Email: {user.email}</Text>
        <Text style={styles.infoText}>Role: {user.role}</Text>
        <Text style={styles.infoText}>Is Vendor: {user.role === 'vendor' ? 'YES' : 'NO'}</Text>
      </View>

      {user.role === 'vendor' && (
        <TouchableOpacity style={styles.redirectButton} onPress={handleManualRedirect}>
          <Text style={styles.redirectButtonText}>🏢 Go to Vendor Dashboard</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1f2937',
  },
  info: {
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#4b5563',
  },
  redirectButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  redirectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});