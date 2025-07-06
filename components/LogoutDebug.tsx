// components/LogoutDebug.tsx - Debug component for logout issues
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LogoutDebug() {
  const { user, isLoggedIn, logout } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-10), `${timestamp}: ${info}`]);
  };

  useEffect(() => {
    addDebugInfo(`Auth state changed - isLoggedIn: ${isLoggedIn}, user: ${user?.email || 'null'}`);
  }, [isLoggedIn, user]);

  const testLogout = async () => {
    try {
      setLoggingOut(true);
      addDebugInfo('🔥 Test logout started');
      
      addDebugInfo('🔥 Calling logout function...');
      await logout();
      addDebugInfo('✅ Logout function completed');
      
      addDebugInfo('🔥 Checking state after logout...');
      addDebugInfo(`State after logout - isLoggedIn: ${isLoggedIn}, user: ${user?.email || 'null'}`);
      
    } catch (error) {
      addDebugInfo(`❌ Logout error: ${error.message}`);
      console.error('Logout test error:', error);
    } finally {
      setLoggingOut(false);
      addDebugInfo('🔥 Test logout completed');
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Logout Debug</Text>
      
      <View style={styles.statusSection}>
        <Text style={styles.statusText}>
          Logged In: {isLoggedIn ? '✅' : '❌'}
        </Text>
        <Text style={styles.statusText}>
          User: {user?.email || 'None'}
        </Text>
        <Text style={styles.statusText}>
          Debug Logging: {loggingOut ? '⏳' : '✅'}
        </Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testLogout}
          disabled={loggingOut}
        >
          <Text style={styles.buttonText}>
            {loggingOut ? '⏳ Testing...' : '🧪 Test Logout'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearDebugInfo}
        >
          <Text style={styles.buttonText}>🧹 Clear Debug</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugSection}>
        <Text style={styles.debugTitle}>Debug Log:</Text>
        <View style={styles.debugLog}>
          {debugInfo.length === 0 ? (
            <Text style={styles.debugText}>No debug info yet...</Text>
          ) : (
            debugInfo.map((info, index) => (
              <Text key={index} style={styles.debugText}>
                {info}
              </Text>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#f59e0b',
  },
  clearButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  debugLog: {
    maxHeight: 150,
  },
  debugText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});