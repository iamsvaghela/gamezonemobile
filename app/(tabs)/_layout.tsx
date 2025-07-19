// app/(tabs)/_layout.tsx - Fixed tabs layout
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, Text, ActivityIndicator } from 'react-native';

export default function TabsLayout() {
  const { isLoggedIn, isLoading } = useAuth();

  // Show loading indicator while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 20, color }}>
              {focused ? '🏠' : '🏠'}
            </Text>
          ),
        }}
      />
      
      <Tabs.Screen
        name="gamezone"
        options={{
          title: 'Game Zones',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 20, color }}>
              {focused ? '🎮' : '🎮'}
            </Text>
          ),
        }}
      />
      
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 20, color }}>
              {focused ? '📅' : '📅'}
            </Text>
          ),
          // Hide the tab if user is not logged in
          href: isLoggedIn ? '/bookings' : null,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 20, color }}>
              {focused ? '👤' : '👤'}
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}