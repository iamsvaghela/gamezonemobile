// components/GoogleLoginButton.tsx - Final Working Version
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Alert,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import apiService from '../services/api';

WebBrowser.maybeCompleteAuthSession();

interface GoogleLoginButtonProps {
  onSuccess?: (user: any, token: string, isNewUser: boolean) => void;
  onError?: (error: string) => void;
  role?: 'user' | 'vendor';
  style?: any;
  disabled?: boolean;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  verified_email?: boolean;
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  role = 'user',
  style,
  disabled = false
}: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get platform-specific client ID
  const getClientId = () => {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 
             '17592191618-9oge5p30uqu76ise151ni0krt74qfkgr.apps.googleusercontent.com';
    } else if (Platform.OS === 'ios') {
      return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 
             '17592191618-bk9uucidcr52cusl1mqagta10e47k5fr.apps.googleusercontent.com';
    } else if (Platform.OS === 'android') {
      return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 
             '17592191618-e6lfqvo2gbpl4u5c9i7ecaq7cb85tup3.apps.googleusercontent.com';
    } else {
      return '17592191618-bk9uucidcr52cusl1mqagta10e47k5fr.apps.googleusercontent.com';
    }
  };

  const clientId = getClientId();

  // Platform-specific OAuth configuration
  const getOAuthConfig = () => {
    let redirectUri;
    
    if (Platform.OS === 'web') {
      redirectUri = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : 'http://localhost:8081/auth/callback';
    } else if (Platform.OS === 'ios') {
      redirectUri = 'com.googleusercontent.apps.17592191618-bk9uucidcr52cusl1mqagta10e47k5fr:/oauth/redirect';
    } else if (Platform.OS === 'android') {
      redirectUri = 'com.wintech.gamezone://oauth/redirect';
    } else {
      redirectUri = AuthSession.makeRedirectUri({
        scheme: 'gamezonemobile',
        path: 'oauth/redirect',
      });
    }

    console.log('🔗 OAuth Config:', {
      platform: Platform.OS,
      clientId: clientId,
      redirectUri: redirectUri,
    });

    return {
      clientId,
      scopes: ['openid', 'profile', 'email'],
      additionalParameters: {
        prompt: 'select_account',
        access_type: 'offline',
        include_granted_scopes: 'true',
      },
      responseType: Platform.OS === 'web' 
        ? AuthSession.ResponseType.Token 
        : AuthSession.ResponseType.Code,
      redirectUri,
      usePKCE: Platform.OS !== 'web',
    };
  };

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
  };
  
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    getOAuthConfig(),
    discovery
  );

  // Reset error on mount
  useEffect(() => {
    setError(null);
  }, []);

  // Handle OAuth responses
  useEffect(() => {
    console.log('🔍 OAuth Response received:', {
      type: response?.type,
      params: response?.params ? Object.keys(response.params) : 'No params',
      error: response?.error,
    });

    if (response?.type === 'success') {
      console.log(`✅ OAuth success on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        const { access_token } = response.params;
        if (access_token) {
          handleGoogleSuccess(access_token);
        } else {
          handleAuthError('No access token received from Google');
        }
      } else {
        const { code } = response.params;
        if (code) {
          handleAuthCode(code);
        } else {
          handleAuthError('No authorization code received from Google');
        }
      }
    } else if (response?.type === 'error') {
      console.error('❌ OAuth error:', response.error);
      
      let errorMessage = 'Google authentication failed';
      
      if (response.error?.message) {
        if (response.error.message.includes('access_denied')) {
          errorMessage = 'Access denied. Please try again and grant permission.';
        } else if (response.error.message.includes('invalid_client')) {
          errorMessage = 'Invalid client configuration. Please contact support.';
        } else if (response.error.message.includes('redirect_uri_mismatch')) {
          errorMessage = 'Configuration error. Please contact support.';
        } else if (response.error.message.includes('unauthorized_client')) {
          errorMessage = 'Client not authorized. Please wait a few minutes and try again.';
        } else {
          errorMessage = response.error.message;
        }
      }
      
      handleAuthError(errorMessage);
    } else if (response?.type === 'cancel') {
      console.log('⏹️ OAuth cancelled by user');
      setLoading(false);
      setError(null);
    } else if (response?.type === 'dismiss') {
      console.log('⏹️ OAuth dismissed');
      setLoading(false);
      setError(null);
    }
  }, [response]);

  const handleAuthError = (errorMessage: string) => {
    console.error('❌ Auth error:', errorMessage);
    setLoading(false);
    setError(errorMessage);
    onError?.(errorMessage);
  };

  const handleAuthCode = async (code: string) => {
    try {
      console.log('🔄 Exchanging code for token...');
      
      const tokenRequestBody: any = {
        client_id: clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: getOAuthConfig().redirectUri,
      };

      if (Platform.OS !== 'web' && request?.codeVerifier) {
        tokenRequestBody.code_verifier = request.codeVerifier;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Token exchange failed:', errorText);
        
        if (errorText.includes('invalid_grant')) {
          throw new Error('Authorization code expired. Please try again.');
        } else if (errorText.includes('invalid_client')) {
          throw new Error('Invalid client configuration. Please contact support.');
        } else {
          throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }
      }

      const tokens = await tokenResponse.json();
      console.log('✅ Token exchange successful');
      
      if (!tokens.access_token) {
        throw new Error('No access token received from token exchange');
      }

      await handleGoogleSuccess(tokens.access_token);
    } catch (error) {
      console.error('❌ Code exchange error:', error);
      handleAuthError(
        error instanceof Error 
          ? error.message 
          : 'Failed to exchange authorization code'
      );
    }
  };

  const handleGoogleSuccess = async (accessToken: string) => {
    try {
      console.log('🔄 Getting Google user info...');

      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to get user information: ${userInfoResponse.status}`);
      }

      const googleUser: GoogleUser = await userInfoResponse.json();
      console.log('✅ Google user info received:', { 
        email: googleUser.email, 
        name: googleUser.name,
        platform: Platform.OS,
        verified: googleUser.verified_email
      });

      await authenticateWithBackend(googleUser);
    } catch (error) {
      console.error('❌ Google user info error:', error);
      handleAuthError(
        error instanceof Error 
          ? error.message 
          : 'Failed to get user information from Google'
      );
    }
  };

  const authenticateWithBackend = async (googleUser: GoogleUser) => {
    try {
      console.log('🚀 Authenticating with backend...');

      // Health check
      try {
        await apiService.healthCheck();
        console.log('✅ Backend health check passed');
      } catch (healthError) {
        console.error('❌ Backend health check failed:', healthError);
        throw new Error('Backend server is not reachable. Please try again later.');
      }

      // Authenticate with backend
      const response = await apiService.googleAuth({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        profileImage: googleUser.picture,
        role: role,
        isVerified: googleUser.verified_email || true,
      });

      if (response.success) {
        console.log('✅ Backend authentication successful!');
        console.log(`🎉 User logged in on ${Platform.OS}:`, response.user.email);
        
        setLoading(false);
        setError(null);
        onSuccess?.(response.user, response.token, response.isNewUser || false);
      } else {
        throw new Error(response.message || 'Backend authentication failed');
      }
    } catch (error) {
      console.error('❌ Backend auth error:', error);
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Authentication service temporarily unavailable. Please try again later.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      handleAuthError(errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting Google authentication...');
      console.log('📍 Platform:', Platform.OS);
      console.log('📍 Client ID:', clientId);
      console.log('📍 Request object:', request ? 'Available' : 'Not available');
      
      if (!request) {
        console.error('❌ No request object - OAuth not configured properly');
        throw new Error('Google authentication is not configured properly');
      }

      console.log('🔄 Calling promptAsync...');
      const result = await promptAsync();

      console.log('🎯 promptAsync result:', {
        type: result?.type,
        params: result?.params ? Object.keys(result.params) : 'No params',
        error: result?.error,
      });

      // Handle immediate result (for cases where response useEffect doesn't trigger)
      if (result.type === 'dismiss' || result.type === 'cancel') {
        console.log('⏹️ User cancelled or dismissed OAuth');
        setLoading(false);
        setError(null);
      } else if (result.type === 'error') {
        console.error('❌ OAuth error in result:', result.error);
        handleAuthError(result.error?.message || 'Authentication failed');
      }
      
    } catch (error) {
      console.error('❌ Google login error:', error);
      handleAuthError(
        error instanceof Error 
          ? error.message 
          : 'Failed to start Google authentication'
      );
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGoogleLogin();
  };

  // Show error state
  if (error) {
    return (
      <View style={[styles.googleButton, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main button
  return (
    <TouchableOpacity
      style={[styles.googleButton, style, (disabled || loading) && styles.disabled]}
      onPress={handleGoogleLogin}
      disabled={disabled || loading || !request}
    >
      {loading ? (
        <View style={styles.buttonContent}>
          <ActivityIndicator color="#4285F4" size="small" />
          <Text style={[styles.googleText, { marginLeft: 8 }]}>
            Authenticating...
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          <Text style={styles.googleIcon}>📧</Text>
          <Text style={styles.googleText}>
            Continue with Google
          </Text>
          <Text style={styles.platformBadge}>
            ({Platform.OS})
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dadce0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3c4043',
  },
  platformBadge: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});