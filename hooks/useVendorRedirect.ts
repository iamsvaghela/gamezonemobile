// hooks/useVendorRedirect.ts - Enhanced with better redirect logic
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export const useVendorRedirect = () => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('🔍 useVendorRedirect: Hook triggered');
    console.log('🔍 State:', {
      isLoading,
      isLoggedIn,
      userRole: user?.role,
      userEmail: user?.email,
      hasRedirected
    });
    
    // Only redirect if:
    // 1. Not loading
    // 2. User is logged in
    // 3. User is a vendor
    // 4. Haven't already redirected
    if (!isLoading && isLoggedIn && user?.role === 'vendor' && !hasRedirected) {
      console.log('🏢 VENDOR DETECTED - Starting redirect process...');
      setHasRedirected(true);
      
      // Add a small delay to ensure all state is properly set
      const redirectTimer = setTimeout(() => {
        console.log('🔗 Executing vendor redirect to dashboard...');
        router.replace('/vendor/dashboard');
      }, 100);
      
      return () => {
        clearTimeout(redirectTimer);
      };
    } else if (!isLoading) {
      console.log('❌ Vendor redirect conditions not met:', {
        isLoggedIn,
        userRole: user?.role,
        isVendor: user?.role === 'vendor',
        hasRedirected
      });
    }
  }, [isLoading, isLoggedIn, user?.role, hasRedirected]);

  // Reset hasRedirected when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setHasRedirected(false);
    }
  }, [isLoggedIn]);

  return { 
    isVendor: user?.role === 'vendor',
    isLoading,
    isLoggedIn,
    user,
    hasRedirected
  };
};

// Alternative component version that prevents rendering for vendors
export const VendorRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVendor, isLoading, hasRedirected } = useVendorRedirect();
  
  // Show loading while checking or redirecting
  if (isLoading || (isVendor && !hasRedirected)) {
    return null;
  }
  
  // If user is a vendor and has been redirected, don't render children
  if (isVendor && hasRedirected) {
    return null;
  }
  
  return React.createElement(React.Fragment, null, children);
};

// Force redirect function for manual use
export const forceVendorRedirect = (user: any) => {
  if (user?.role === 'vendor') {
    console.log('🚀 Force vendor redirect triggered');
    router.replace('/vendor/dashboard');
  }
};