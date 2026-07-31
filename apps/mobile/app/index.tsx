import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function RootGatekeeper() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  if (user.role === 'Relawan') {
    return <Redirect href={"/(relawan)" as any} />;
  }

  return <Redirect href={"/(warga)" as any} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
