import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { subscribeToAuth } from '../config/firebase';
import { DialogProvider } from '../context/DialogContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Listen to Firebase Auth / Mock state changes
    const unsubscribe = subscribeToAuth((usr) => {
      setUser(usr);
      setInitializing(false);
      SplashScreen.hideAsync().catch(() => {});
    });

    return unsubscribe;
  }, []);

  // Perform routing checks once initialization is complete
  useEffect(() => {
    if (initializing) return;

    // Use a small delay to ensure Expo Router navigation is mounted
    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/login');
      } else {
        router.replace('/(tabs)');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <ActivityIndicator size="large" color={Colors.light.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <DialogProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
            <Stack.Screen name="signup" />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="activity/[id]" options={{ presentation: 'card', headerShown: false }} />
          </Stack>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 70,
  },
  spinner: {
    marginTop: 24,
  },
});
