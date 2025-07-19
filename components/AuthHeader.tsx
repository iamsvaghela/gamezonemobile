// components/AuthHeader.tsx - Direct logout for all users with NotificationBell
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import NotificationBell component
import { NotificationBell } from './NotificationBell';

interface AuthHeaderProps {
  style?: any;
}

export default function AuthHeader({ style }: AuthHeaderProps) {
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Use ref to track if we've already redirected to prevent infinite loops
  const hasRedirectedRef = useRef(false);

  // 🔥 VENDOR REDIRECT LOGIC - Fixed to prevent infinite loops
  useEffect(() => {
    console.log('🔍 AuthHeader: Vendor redirect check:', {
      isLoggedIn,
      userRole: user?.role,
      isLoading,
      hasRedirected: hasRedirectedRef.current
    });

    // Only redirect if:
    // 1. User is logged in
    // 2. User is a vendor 
    // 3. Not loading
    // 4. Haven't already redirected
    if (isLoggedIn && user?.role === 'vendor' && !isLoading && !hasRedirectedRef.current) {
      console.log('🏢 VENDOR DETECTED - Redirecting to dashboard (one time only)...');
      
      // Mark as redirected IMMEDIATELY to prevent re-triggering
      hasRedirectedRef.current = true;
      
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        console.log('🚀 Executing vendor redirect now...');
        router.replace('/vendor/dashboard');
      }, 100);
    }
  }, [isLoggedIn, user?.role, isLoading]);

  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('🔄 User logged out - resetting redirect flag');
      hasRedirectedRef.current = false;
    }
  }, [isLoggedIn]);

  const handleGoogleLoginSuccess = async (userData: any, token: string, isNewUser: boolean) => {
    console.log('✅ Google login successful:', userData.email);
    console.log('👤 User role:', userData.role);
    
    try {
      // Use auth context to login
      await login(userData, token);
      setShowLoginModal(false);
      
      // Show success message
      Alert.alert(
        'Login Successful!',
        `Welcome ${userData.role === 'vendor' ? 'Business Owner' : 'Gamer'}, ${userData.name}!`,
        [{ 
          text: 'Continue',
          onPress: () => {
            console.log(`✅ ${userData.role} login completed`);
          }
        }]
      );
      
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Login succeeded but failed to complete setup.');
    }
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      if (user?.role === 'vendor') {
        console.log('🏢 Manual vendor redirect from profile click');
        router.push('/vendor/dashboard');
      } else {
        router.push('/(tabs)/profile');
      }
    } else {
      setShowLoginModal(true);
    }
  };

  // 🔧 DIRECT LOGOUT FUNCTION - No Alert dialog (same as vendor dashboard)
  const handleLogout = async () => {
    console.log('🚪 AuthHeader logout button clicked - DIRECT LOGOUT');
    console.log('👤 User role:', user?.role);
    console.log('📧 User email:', user?.email);
    
    if (loggingOut) {
      console.log('⏳ Already logging out, ignoring click');
      return;
    }

    // Call forceLogout directly without Alert dialog
    await forceLogout();
  };

  // 🔧 FORCE LOGOUT - Same as vendor dashboard (always works)
  const forceLogout = async () => {
    console.log('🚪 AUTHHEADER FORCE LOGOUT: Starting...');
    console.log('👤 Logging out user:', user?.role, user?.email);
    
    try {
      setLoggingOut(true);
      
      // 1. Reset redirect flag
      hasRedirectedRef.current = false;
      console.log('✅ Reset redirect flag');
      
      // 2. Clear AsyncStorage manually
      try {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        console.log('✅ Cleared AsyncStorage');
      } catch (storageError) {
        console.error('⚠️ AsyncStorage clear error:', storageError);
      }
      
      // 3. Try AuthContext logout (but don't fail if it errors)
      try {
        await logout();
        console.log('✅ AuthContext logout successful');
      } catch (contextError) {
        console.error('⚠️ AuthContext logout error:', contextError);
        console.log('🔄 Continuing with manual logout...');
      }
      
      // 4. Force navigation to home (try multiple methods)
      console.log('🏠 Forcing navigation to home...');
      
      try {
        // Try replace first
        router.replace('/(tabs)');
        console.log('✅ router.replace successful');
      } catch (navError) {
        console.error('❌ router.replace failed:', navError);
        
        // Try push as fallback
        try {
          router.push('/(tabs)');
          console.log('✅ router.push successful');
        } catch (pushError) {
          console.error('❌ router.push failed:', pushError);
          
          // Try going to root
          try {
            router.replace('/');
            console.log('✅ router.replace to root successful');
          } catch (rootError) {
            console.error('❌ All navigation methods failed:', rootError);
          }
        }
      }
      
      // 5. Show success message (optional)
      setTimeout(() => {
        try {
          Alert.alert(
            'Logged Out',
            'You have been successfully logged out.',
            [{ text: 'OK' }]
          );
        } catch (alertError) {
          console.error('❌ Alert error:', alertError);
        }
      }, 500);
      
      console.log('🎉 AUTHHEADER FORCE LOGOUT: Completed successfully');
      
    } catch (error) {
      console.error('❌ AUTHHEADER FORCE LOGOUT: Error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleGoogleLoginError = (error: string) => {
    console.error('❌ Google login error:', error);
    Alert.alert('Login Failed', `Authentication failed: ${error}`);
  };

  // Manual vendor redirect button for testing
  const handleManualVendorRedirect = () => {
    console.log('🔧 Manual vendor redirect button clicked');
    if (user?.role === 'vendor') {
      router.replace('/vendor/dashboard');
    } else {
      Alert.alert('Not a Vendor', 'Only vendors can access the dashboard');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.header, style]}>
        <View style={styles.leftSection}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.header, style]}>
        <View style={styles.leftSection}>
          {isLoggedIn && user ? (
            <TouchableOpacity style={styles.userInfo} onPress={handleProfileClick}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.welcomeText}>
                  {user.role === 'vendor' ? '🏢 Business' : '🎮 Welcome'}, {user.name}!
                </Text>
                <Text style={styles.emailText}>{user.email}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginPrompt} onPress={handleProfileClick}>
              <View style={styles.loginIcon}>
                <Text style={styles.loginIconText}>👤</Text>
              </View>
              <View style={styles.loginDetails}>
                <Text style={styles.loginText}>Please Login</Text>
                <Text style={styles.loginSubtext}>Tap to sign in with Google</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightSection}>
          {/* 🔔 NOTIFICATION BELL - Only show for logged-in users */}
          {isLoggedIn && user && (
            <NotificationBell 
              iconColor="#6366f1" 
              style={styles.notificationBell}
            />
          )}
          
          {isLoggedIn && user ? (
            <>
              <View style={[
                styles.roleBadge,
                user.role === 'vendor' && styles.vendorBadge
              ]}>
                <Text style={[
                  styles.roleText,
                  user.role === 'vendor' && styles.vendorText
                ]}>
                  {user.role === 'vendor' ? 'VENDOR' : 'GAMER'}
                </Text>
              </View>
              
              {/* 🔧 MANUAL VENDOR REDIRECT BUTTON FOR TESTING */}
              {user.role === 'vendor' && (
                <TouchableOpacity 
                  style={styles.dashboardButton} 
                  onPress={handleManualVendorRedirect}
                >
                  <Text style={styles.dashboardButtonText}>Dashboard</Text>
                </TouchableOpacity>
              )}
              
              {/* 🔧 DIRECT LOGOUT BUTTON - Original icon style */}
              <TouchableOpacity 
                style={[styles.logoutButton, loggingOut && styles.disabled]} 
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleProfileClick}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Google Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowLoginModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Welcome to GameZone!</Text>
              <Text style={styles.modalSubtitle}>
                Sign in with Google to access your account
              </Text>
            </View>

            <GoogleLoginButton
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              role="user"
              style={styles.modalGoogleButton}
            />

            <View style={styles.vendorNote}>
              <Text style={styles.vendorNoteText}>
                🏢 Business owners will be automatically redirected to the vendor dashboard
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  emailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loginIconText: {
    fontSize: 20,
  },
  loginDetails: {
    flex: 1,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  loginSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  // 🔔 NOTIFICATION BELL STYLES
  notificationBell: {
    marginRight: 8,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vendorBadge: {
    backgroundColor: '#fef3c7',
  },
  roleText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
  },
  vendorText: {
    color: '#92400e',
  },
  dashboardButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingRight: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalGoogleButton: {
    marginBottom: 16,
  },
  vendorNote: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
  },
  vendorNoteText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
});