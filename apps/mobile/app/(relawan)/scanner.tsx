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
  });

  useEffect(() => {
    const updateLocation = async () => {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Scanner Location] Gagal memperbarui lokasi kamera: ${errorMessage}`);
      }
    };
    updateLocation();
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
