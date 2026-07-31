import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { ScannerCameraPanel } from '../../components/ecowarn/ScannerCameraPanel';
import { ReportPayload, SpatialCoordinates } from '../../types/ecowarn';
import { sendReportToServer } from '../../services/apiService';

export default function ScannerScreen() {
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
      console.log('[Mengirim Payload]', JSON.stringify(payload));
      const serverResponse = await sendReportToServer(payload);
      console.log('[Respon Server Sukses]', serverResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Scanner Send] Gagal memproses pengiriman ke server: ${errorMessage}`);
      throw error;
    }
  }, []);

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
