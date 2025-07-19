// app/_layout.tsx - Root layout with AuthProvider and NotificationProvider
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="vendor" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="gamezone/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="payment" options={{ headerShown: false }} />
          <Stack.Screen name="booking-confirmation" options={{ headerShown: false }} />
          <Stack.Screen name="booking-success" options={{ headerShown: false }} />
          <Stack.Screen name="book-now" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="vendor/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="not-found" options={{ headerShown: false }} />
          <Stack.Screen name="_sitemap" options={{ headerShown: false }} />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}