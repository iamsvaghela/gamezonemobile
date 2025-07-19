// app/vendor/_layout.tsx - Fixed to remove duplicate route names
import React from 'react';
import { Stack } from 'expo-router';

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          headerShown: false,
          title: 'Dashboard'
        }} 
      />
      <Stack.Screen 
        name="welcome" 
        options={{ 
          headerShown: false,
          title: 'Welcome'
        }} 
      />
      {/* Remove this line if you have it - this causes the duplicate route error */}
      {/* <Stack.Screen name="vendor" /> */}
    </Stack>
  );
}