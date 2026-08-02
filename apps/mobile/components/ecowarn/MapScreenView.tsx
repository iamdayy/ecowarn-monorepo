import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { InteractiveMap, MapReportItem } from './InteractiveMap';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { EcoWarnColors } from '../../constants/theme';
import { SpatialCoordinates } from '../../types/ecowarn';
import { fetchNearbyReports, ServerReportResponse } from '../../services/apiService';
import {
  connectRealtimeEngine,
  disconnectRealtimeEngine,
  CriticalZoneAlertPayload,
} from '../../services/socketService';

export const MapScreenView: React.FC = () => {
  const [userLocation, setUserLocation] = useState<SpatialCoordinates>({
    latitude: -6.200000,
    longitude: 106.816666,
  });
  const [activeReports, setActiveReports] = useState<MapReportItem[]>([]);

  const formatServerReportToMapItem = (report: ServerReportResponse): MapReportItem => ({
    id: report._id,
    longitude: report.location.coordinates[0],
    latitude: report.location.coordinates[1],
    severity: report.severity,
    createdAt: report.createdAt,
  });

  const loadReportsFromServer = useCallback(async (latitude: number, longitude: number) => {
    try {
      const serverReports = await fetchNearbyReports(latitude, longitude);
      const formatted = serverReports.map(formatServerReportToMapItem);
      setActiveReports(formatted);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Load Reports] Gagal memperbarui data laporan pemantauan dari peladen: ${errorMessage}`);
    }
  }, []);

  useEffect(() => {
    const initLocationAndFetch = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = userLocation.latitude;
        let lng = userLocation.longitude;

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lng = location.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
        } else {
          Alert.alert('Izin Ditolak', 'Menggunakan koordinat default (Jakarta) untuk memuat peta.');
        }

        await loadReportsFromServer(lat, lng);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Location Init] Gagal memuat lokasi atau laporan: ${errorMessage}`);
        await loadReportsFromServer(userLocation.latitude, userLocation.longitude);
      }
    };

    initLocationAndFetch();
  }, [loadReportsFromServer, userLocation.latitude, userLocation.longitude]);

  // Integrasi Real-Time Engine (Socket.io)
  useEffect(() => {
    const handleCriticalAlert = (payload: CriticalZoneAlertPayload) => {
      Alert.alert(
        '🚨 PERINGATAN DINI BAHAYA KRITIS!',
        `${payload.message}\nTerdeteksi krisis volume sampah pada zona ${payload.impactedRadiusMeters / 1000}km dari titik fokus.\nSegera tingkatkan kewaspadaan!`
      );
    };

    const handleNewReport = (newServerReport: ServerReportResponse) => {
      const newMapItem = formatServerReportToMapItem(newServerReport);
      setActiveReports((prevReports) => [
        newMapItem,
        ...prevReports.filter((item) => item.id !== newMapItem.id),
      ]);
    };

    connectRealtimeEngine(handleCriticalAlert, handleNewReport);

    return () => {
      disconnectRealtimeEngine();
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Peta Spasial EcoWarn 🌍"
        subtitle="Pemantauan titik rawan banjir rob & sumbatan sampah"
        accentColor={EcoWarnColors.primary}
        flatBottom={true}
      />
      <InteractiveMap userLocation={userLocation} reports={activeReports} />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EcoWarnColors.surface,
  },
});
