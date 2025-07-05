// app/_layout.tsx - Improved layout with proper navigation
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

// This component handles the conditional rendering based on auth state
function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        // Authenticated user screens
        <>
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="gamezone/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="book-now" 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="payment" 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="booking-success" 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
        </>
      ) : (
        // Unauthenticated user screens
        <>
          <Stack.Screen 
            name="login" 
            options={{ 
              headerShown: false,
              // Don't make it a modal for unauthenticated users
            }} 
          />
          <Stack.Screen 
            name="signup" 
            options={{ 
              headerShown: false,
            }} 
          />
        </>
      )}
    </Stack>
  );
}

// Main layout component
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});