// components/AuthHeader.tsx - Updated Header with Auth Context
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../contexts/AuthContext';

interface AuthHeaderProps {
  style?: any;
}

export default function AuthHeader({ style }: AuthHeaderProps) {
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleGoogleLoginSuccess = async (userData: any, token: string, isNewUser: boolean) => {
    console.log('✅ Google login successful in header:', userData.email);
    
    try {
      // Use auth context to login
      await login(userData, token);
      setShowLoginModal(false);
      
      // Show success message
      Alert.alert(
        'Login Successful!',
        isNewUser ? 
          `Welcome to GameZone, ${userData.name}!` :
          `Welcome back, ${userData.name}!`,
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Login error in header:', error);
      Alert.alert('Error', 'Login succeeded but failed to complete setup. Please try again.');
    }
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      // User is logged in, go to profile
      router.push('/(tabs)/profile');
    } else {
      // User is not logged in, show login modal
      setShowLoginModal(true);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleGoogleLoginError = (error: string) => {
    console.error('❌ Google login error in header:', error);
    Alert.alert(
      'Login Failed',
      `Authentication failed: ${error}`,
      [{ text: 'Try Again', onPress: () => {} }]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.header, style]}>
        <View style={styles.leftSection}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingIcon}>
              <Text style={styles.loadingIconText}>⏳</Text>
            </View>
            <View style={styles.loadingDetails}>
              <Text style={styles.loadingText}>Loading...</Text>
              <Text style={styles.loadingSubtext}>Checking authentication</Text>
            </View>
          </View>
        </View>
        <View style={styles.rightSection}>
          <View style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.header, style]}>
        <View style={styles.leftSection}>
          {isLoggedIn && user ? (
            // Show user info when logged in
            <TouchableOpacity style={styles.userInfo} onPress={handleProfileClick}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
                <Text style={styles.emailText}>{user.email}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            // Show login prompt when not logged in
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
          {isLoggedIn && user ? (
            <>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user.role === 'vendor' ? 'Business' : 'Gamer'}
                </Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleProfileClick}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
          
          {/* Notification bell */}
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
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
                Sign in with Google to access your profile and book gaming zones.
              </Text>
            </View>

            <GoogleLoginButton
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              role="user"
              style={styles.modalGoogleButton}
            />

            <View style={styles.modalFeatures}>
              <View style={styles.modalFeatureItem}>
                <Text style={styles.modalFeatureIcon}>✅</Text>
                <Text style={styles.modalFeatureText}>Quick and secure login</Text>
              </View>
              <View style={styles.modalFeatureItem}>
                <Text style={styles.modalFeatureIcon}>📅</Text>
                <Text style={styles.modalFeatureText}>Book gaming zones</Text>
              </View>
              <View style={styles.modalFeatureItem}>
                <Text style={styles.modalFeatureIcon}>🎯</Text>
                <Text style={styles.modalFeatureText}>Track your reservations</Text>
              </View>
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
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Loading states
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loadingIconText: {
    fontSize: 20,
  },
  loadingDetails: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  
  // Logged in user styles
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
  
  // Not logged in styles
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
  
  // Right section styles
  roleBadge: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#0369a1',
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
  },
  logoutButtonText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  notificationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 16,
  },

  // Modal styles
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
    paddingRight: 32, // Account for close button
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
    marginBottom: 24,
  },
  modalFeatures: {
    gap: 12,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFeatureIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  modalFeatureText: {
    fontSize: 14,
    color: '#6b7280',
  },
});