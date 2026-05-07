import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function StravaAuth() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startAuth();
  }, []);

  const startAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectUri = AuthSession.makeRedirectUri();

      const response = await fetch(
        `${API_URL}/api/v1/strava/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`, 
        {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to get authorization URL');
      
      const { url: authUrl } = await response.json();

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const status = url.searchParams.get('status');
        const name = url.searchParams.get('name');
        const id = url.searchParams.get('id');
        const token = url.searchParams.get('token');

        if (status === 'success') {
          // Update the global auth state
          signIn({ 
            id: id || '', 
            name: name || 'Explorer',
            token: token || undefined
          });
          
          Alert.alert("Success", `Connected as ${name || 'Athlete'}`);
          
          // Navigate to the dashboard
          router.replace('/(app)/dashboard');
        } else {
          throw new Error('Authentication failed');
        }
      } else {
        router.back();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Oops! {error}</Text>
        <Text style={styles.retryText} onPress={startAuth}>Tap to try again</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Connecting to Strava...</Text>
      <Text style={styles.subtext}>You will be redirected to Strava to authorize Cairn.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: Colors.text,
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
  },
  subtext: {
    color: Colors.textSecondary,
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
