import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { InteractiveMap, MapReportItem } from '../../components/ecowarn/InteractiveMap';
import { SpatialCoordinates } from '../../types/ecowarn';

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState<SpatialCoordinates>({
    latitude: -6.200000, // Default: Jakarta
    longitude: 106.816666,
  });
  const [activeReports, setActiveReports] = useState<MapReportItem[]>([
    {
      id: 'dummy-1',
      latitude: -6.205,
      longitude: 106.82,
      severity: 'Kritis',
    },
    {
      id: 'dummy-2',
      latitude: -6.195,
      longitude: 106.81,
      severity: 'Sedang',
    },
  ]);

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Ditolak', 'Izin lokasi dibutuhkan untuk menampilkan peta peringatan dini.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Location] Gagal mengambil lokasi terkini: ${errorMessage}`);
      }
    };

    fetchUserLocation();
  }, []);

  return (
    <View style={styles.container}>
      <InteractiveMap userLocation={userLocation} reports={activeReports} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
