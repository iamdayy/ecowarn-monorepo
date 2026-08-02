import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { ScannerCameraPanel } from '../../components/ecowarn/ScannerCameraPanel';
import { ReportPayload, SpatialCoordinates } from '../../types/ecowarn';
import { sendReportToServer } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

export default function RelawanScannerScreen() {
  const { token } = useAuth();
  const [userLocation, setUserLocation] = useState<SpatialCoordinates>({
    latitude: -6.200000,
    longitude: 106.816666,
    accuracy: null,
  });

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationWatcher = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[Warning Scanner Location] Izin lokasi ditolak oleh pengguna.');
          return;
        }

        // Ambil lokasi awal secara cepat
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          accuracy: initialLocation.coords.accuracy,
          timestamp: initialLocation.timestamp,
        });

        // Aktifkan live GPS tracking berakurasi tinggi saat relawan berpatroli
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000, // Perbaharui setiap 3 detik
            distanceInterval: 2, // Perbaharui jika bergeser > 2 meter
          },
          (newLocation) => {
            setUserLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });
          }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Scanner Location] Gagal mengaktifkan live GPS tracking: ${errorMessage}`);
      }
    };

    startLocationWatcher();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleSendReport = useCallback(async (payload: ReportPayload) => {
    try {
      if (!token) {
        Alert.alert('Otorisasi Gagal', 'Sesi login Anda tidak ditemukan. Silakan re-login.');
        return;
      }
      console.log('[Mengirim Payload Relawan]', JSON.stringify(payload));
      const serverResponse = await sendReportToServer(payload, token);
      console.log('[Respon Server Sukses - Terotorisasi RBAC]', serverResponse);
      Alert.alert(
        'Laporan Berhasil Diluncurkan! 🛡️',
        `Data klasifikasi AI (${payload.severity}) pada koordinat Anda telah dicatat oleh peladen terautentikasi ID Relawan Anda.`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Scanner Send] Gagal memproses pengiriman terotorisasi ke server: ${errorMessage}`);
      Alert.alert('Pengiriman Gagal', `Terjadi kendala pada pengiriman: ${errorMessage}`);
      throw error;
    }
  }, [token]);

  return (
    <View style={styles.container}>
      <ScannerCameraPanel currentLocation={userLocation} onSendReport={handleSendReport} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
