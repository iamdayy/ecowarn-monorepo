import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Masuk Ke EcoWarn' }} />
      <Stack.Screen name="register" options={{ title: 'Daftar Akun' }} />
    </Stack>
  );
}
