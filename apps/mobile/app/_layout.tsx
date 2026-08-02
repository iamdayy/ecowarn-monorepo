import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { handleBackgroundMessage } from '@/services/backgroundMessageHandler';
import {
  setupNotifeeChannels,
  setupForegroundMessageListener,
  setupNotifeeEventListener,
  registerBackgroundHandler,
} from '@/services/notificationService';

// Daftarkan background message handler di TOP-LEVEL (di luar komponen React).
// Ini memastikan handler terdaftar sebelum React tree dimount,
// sehingga pesan FCM yang masuk saat app killed/background tetap tertangani.
registerBackgroundHandler(handleBackgroundMessage);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Buat notification channel Notifee saat app pertama kali dimuat
    setupNotifeeChannels();

    // Daftarkan listener untuk pesan FCM saat app di foreground
    const unsubscribeForeground = setupForegroundMessageListener();

    // Daftarkan listener untuk event Notifee (tap notifikasi)
    const unsubscribeNotifee = setupNotifeeEventListener();

    return () => {
      unsubscribeForeground();
      unsubscribeNotifee();
    };
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(warga)" options={{ headerShown: false }} />
            <Stack.Screen name="(relawan)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
