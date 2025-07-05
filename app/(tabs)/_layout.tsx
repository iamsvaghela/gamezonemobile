// app/(tabs)/_layout.tsx - Updated tabs layout
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, Text, StyleSheet } from 'react-native';

export default function TabsLayout() {
  const { isLoggedIn } = useAuth();

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
      
      {isLoggedIn && (
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ focused, color }) => (
              <Text style={{ fontSize: 20, color }}>
                {focused ? '📅' : '📅'}
              </Text>
            ),
          }}
        />
      )}
      
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