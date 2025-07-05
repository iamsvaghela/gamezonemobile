// components/GoogleLoginButton.tsx - Fixed import path
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
// FIXED: Updated import path to point to services directory at root level
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

// Platform-specific Client IDs
const GOOGLE_CLIENT_IDS = {
  web: '17592191618-9oge5p30uqu76ise151ni0krt74qfkgr.apps.googleusercontent.com',
  ios: '17592191618-bk9uucidcr52cusl1mqagta10e47k5fr.apps.googleusercontent.com',
  android: '17592191618-bk9uucidcr52cusl1mqagta10e47k5fr.apps.googleusercontent.com', // Same as iOS for mobile
  desktop: '17592191618-34gk4i4nlijk7d6a85l152tocokbpe3j.apps.googleusercontent.com',
};

export default function GoogleLoginButton({
  onSuccess,
  onError,
  role = 'user',
  style,
  disabled = false
}: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  
  // Get platform-specific client ID
  const getClientId = () => {
    if (Platform.OS === 'web') {
      return GOOGLE_CLIENT_IDS.web;
    } else if (Platform.OS === 'ios') {
      return GOOGLE_CLIENT_IDS.ios;
    } else if (Platform.OS === 'android') {
      return GOOGLE_CLIENT_IDS.android;
    } else {
      // Fallback for desktop or other platforms
      return GOOGLE_CLIENT_IDS.desktop;
    }
  };

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || getClientId();

  // Platform-specific OAuth configuration
  const getOAuthConfig = () => {
    const baseConfig = {
      clientId,
      scopes: ['openid', 'profile', 'email'],
      additionalParameters: {
        prompt: 'select_account',
      },
    };

    if (Platform.OS === 'web') {
      // Web: Use implicit flow (no PKCE)
      return {
        ...baseConfig,
        responseType: AuthSession.ResponseType.Token,
        redirectUri: 'http://localhost:8081/auth/callback',
        usePKCE: false,
      };
    } else if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Mobile: Use code flow with PKCE
      return {
        ...baseConfig,
        responseType: AuthSession.ResponseType.Code,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'gamezonemobile',
          path: 'oauth/redirect',
        }),
        usePKCE: true,
      };
    } else {
      // Desktop: Use code flow
      return {
        ...baseConfig,
        responseType: AuthSession.ResponseType.Code,
        redirectUri: 'http://localhost',
        usePKCE: false,
      };
    }
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

  // Handle different response types based on platform
  useEffect(() => {
    if (response?.type === 'success') {
      console.log(`✅ OAuth success on ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        // Web: Direct token response
        const { access_token } = response.params;
        if (access_token) {
          console.log('✅ Access token received (web)');
          handleGoogleSuccess(access_token);
        } else {
          console.error('❌ No access token in web response');
          setLoading(false);
          onError?.('No access token received from Google');
        }
      } else {
        // Mobile/Desktop: Code response - need to exchange
        const { code } = response.params;
        if (code) {
          console.log('✅ Authorization code received (mobile/desktop)');
          handleAuthCode(code);
        } else {
          console.error('❌ No authorization code received');
          setLoading(false);
          onError?.('No authorization code received from Google');
        }
      }
    } else if (response?.type === 'error') {
      console.error('❌ OAuth error:', response.error);
      setLoading(false);
      onError?.(`Google authentication failed: ${response.error?.message || 'Unknown error'}`);
    } else if (response?.type === 'cancel') {
      console.log('⏹️ OAuth cancelled');
      setLoading(false);
    }
  }, [response]);

  // Handle authorization code (for mobile/desktop)
  const handleAuthCode = async (code: string) => {
    try {
      console.log('🔄 Exchanging code for token...');
      
      const tokenRequestBody: any = {
        client_id: clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: getOAuthConfig().redirectUri,
      };

      // Add code verifier for PKCE (mobile only)
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (request?.codeVerifier) {
          tokenRequestBody.code_verifier = request.codeVerifier;
        }
      } else {
        // Desktop client needs client secret
        tokenRequestBody.client_secret = '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'; // Desktop client secret
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
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();
      console.log('✅ Token exchange successful');
      
      if (!tokens.access_token) {
        throw new Error('No access token received from token exchange');
      }

      await handleGoogleSuccess(tokens.access_token);
    } catch (error) {
      console.error('❌ Code exchange error:', error);
      setLoading(false);
      onError?.(
        error instanceof Error 
          ? error.message 
          : 'Failed to exchange authorization code'
      );
    }
  };

  // Get user info and authenticate with backend
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
        platform: Platform.OS
      });

      await authenticateWithBackend(googleUser);
    } catch (error) {
      console.error('❌ Google user info error:', error);
      setLoading(false);
      onError?.(
        error instanceof Error 
          ? error.message 
          : 'Failed to get user information'
      );
    }
  };

  // Backend authentication
  const authenticateWithBackend = async (googleUser: GoogleUser) => {
    try {
      console.log('🚀 Authenticating with backend...');

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
        onSuccess?.(response.user, response.token, response.isNewUser || false);
      } else {
        throw new Error(response.message || 'Backend authentication failed');
      }
    } catch (error) {
      console.error('❌ Backend auth error:', error);
      setLoading(false);
      onError?.(
        error instanceof Error 
          ? error.message 
          : 'Authentication failed. Please try again.'
      );
    }
  };

  // Handle login button press
  const handleGoogleLogin = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);
      console.log('🚀 Starting Google authentication...');
      console.log('📍 Platform:', Platform.OS);
      console.log('📍 Client ID:', clientId);
      console.log('📍 OAuth Config:', getOAuthConfig());
      
      if (!request) {
        throw new Error('Google authentication is not configured properly');
      }

      await promptAsync();
    } catch (error) {
      console.error('❌ Google login error:', error);
      setLoading(false);
      onError?.(
        error instanceof Error 
          ? error.message 
          : 'Failed to start Google authentication'
      );
    }
  };

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
});