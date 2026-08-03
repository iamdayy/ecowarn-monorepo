import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import { ScannerCameraPanel } from '../../components/ecowarn/ScannerCameraPanel';
import { ReportPayload, SpatialCoordinates } from '../../types/ecowarn';
import { sendReportToServer } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

export default function RelawanScannerScreen() {
  const { token } = useAuth();
  const isFocused = useIsFocused();
  const [userLocation, setUserLocation] = useState<SpatialCoordinates>({
    latitude: -6.200000,
    longitude: 106.816666,
    accuracy: null,
  });

  useEffect(() => {
    // Hanya jalankan pelacakan GPS intensif saat layar Scanner benar-benar sedang aktif (focused)
    if (!isFocused) return;

    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startLocationWatcher = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[Warning Scanner Location] Izin lokasi ditolak oleh pengguna.');
          return;
        }

        // 1. Ambil koordinat GPS terakhir yang diketahui agar antarmuka langsung mendapatkan lokasi instan
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown && isMounted) {
          setUserLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            timestamp: lastKnown.timestamp,
          });
        }

        // 2. Ambil lokasi aktual dengan tingkat akurasi maksimal & timeout 5 detik agar tidak pernah gantung
        const freshLocation = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('GPS Request Timeout')), 5000)),
        ]).catch(() => null);

        if (freshLocation && typeof freshLocation !== 'number' && isMounted) {
          setUserLocation({
            latitude: freshLocation.coords.latitude,
            longitude: freshLocation.coords.longitude,
            accuracy: freshLocation.coords.accuracy,
            timestamp: freshLocation.timestamp,
          });
        }

        // 3. Aktifkan live GPS tracking berakurasi navigasi (BestForNavigation)
        // PERHATIAN: distanceInterval dihindari (dihapus) agar Android/iOS tetap mengirimkan pembaruan
        // state sinyal GPS secara aktif setiap 1.5 detik meskipun relawan berdiri diam mengarahkan kamera!
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1500, // Perbaharui state setiap 1.5 detik
          },
          (newLocation) => {
            if (isMounted && newLocation && newLocation.coords) {
              setUserLocation({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                accuracy: newLocation.coords.accuracy,
                timestamp: newLocation.timestamp,
              });
            }
          }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Scanner Location] Gagal mengaktifkan live GPS tracking: ${errorMessage}`);
      }
    };

    startLocationWatcher();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isFocused]);

  const handleSendReport = useCallback(async (payload: ReportPayload) => {
    try {
      if (!token) {
        Alert.alert('Otorisasi Gagal', 'Sesi login Anda tidak ditemukan. Silakan re-login.');
        return;
      }
      const serverResponse = await sendReportToServer(payload, token);
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
