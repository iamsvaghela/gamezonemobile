// app/vendor/welcome.tsx - Vendor Welcome Screen
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function VendorWelcome() {
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    // Auto-redirect to dashboard after 2 seconds
    const timer = setTimeout(() => {
      if (isLoggedIn && user?.role === 'vendor') {
        router.replace('/vendor/dashboard');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoggedIn, user]);

  const handleContinue = () => {
    router.push('/vendor/dashboard');
  };

  const handleGoHome = () => {
    router.push('/(tabs)');
  };

  if (!isLoggedIn || user?.role !== 'vendor') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            This area is only accessible to verified vendors.
          </Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={80} color="#6366f1" />
        </View>
        
        <Text style={styles.welcomeTitle}>Welcome to Vendor Portal</Text>
        <Text style={styles.welcomeSubtitle}>
          Hello, {user.name}! 👋
        </Text>
        <Text style={styles.welcomeDescription}>
          Manage your gaming zones, track bookings, and grow your business with our comprehensive vendor tools.
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="analytics" size={24} color="#10b981" />
            <Text style={styles.featureText}>Business Analytics</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="calendar" size={24} color="#f59e0b" />
            <Text style={styles.featureText}>Booking Management</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="settings" size={24} color="#6366f1" />
            <Text style={styles.featureText}>Zone Settings</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.autoRedirectContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.autoRedirectText}>
            Automatically redirecting to dashboard...
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  autoRedirectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoRedirectText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  homeButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});