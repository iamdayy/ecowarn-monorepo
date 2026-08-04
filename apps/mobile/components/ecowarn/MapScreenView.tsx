import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { InteractiveMap, MapReportItem } from './InteractiveMap';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { CustomAlertModal, CustomAlertType } from './CustomAlertModal';
import { EcoWarnColors } from '../../constants/theme';
import { SpatialCoordinates } from '../../types/ecowarn';
import { fetchNearbyReports, ServerReportResponse } from '../../services/apiService';
import {
  connectRealtimeEngine,
  disconnectRealtimeEngine,
  CriticalZoneAlertPayload,
  ZoneAllClearPayload,
} from '../../services/socketService';

export const MapScreenView: React.FC = () => {
  const [userLocation, setUserLocation] = useState<SpatialCoordinates>({
    latitude: -6.200000,
    longitude: 106.816666,
  });
  const [activeReports, setActiveReports] = useState<MapReportItem[]>([]);

  // State Custom Alert untuk Socket & API Response
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<{ type: CustomAlertType; title: string; message: string }>({
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: CustomAlertType, title: string, message: string) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
  };

  const formatServerReportToMapItem = (report: ServerReportResponse): MapReportItem => ({
    id: report._id,
    longitude: report.location.coordinates[0],
    latitude: report.location.coordinates[1],
    severity: report.severity,
    status: report.status || 'ACTIVE',
    createdAt: report.createdAt,
    photoUrl: report.photoUrl,
    originalReport: report,
  });

  const loadReportsFromServer = useCallback(async (latitude: number, longitude: number) => {
    try {
      // Memperluas radius pencarian marker ke 100km agar seluruh laporan wilayah yang ada di server tampil pada peta
      const serverReports = await fetchNearbyReports(latitude, longitude, 100000);
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
        let lat = -6.200000;
        let lng = 106.816666;

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lng = location.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
        } else {
          showAlert('warning', 'Izin Ditolak', 'Menggunakan koordinat default (Jakarta) untuk memuat peta.');
        }

        await loadReportsFromServer(lat, lng);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Location Init] Gagal memuat lokasi atau laporan: ${errorMessage}`);
        await loadReportsFromServer(userLocation.latitude, userLocation.longitude);
      }
    };

    initLocationAndFetch();
  }, [loadReportsFromServer]);

  // Integrasi Real-Time Engine (Socket.io)
  useEffect(() => {
    const handleCriticalAlert = (payload: CriticalZoneAlertPayload) => {
      showAlert(
        'critical',
        'PERINGATAN DINI BAHAYA KRITIS!',
        `${payload.message}\n\nTerdeteksi krisis volume sampah pada zona ${payload.impactedRadiusMeters / 1000}km dari titik fokus. Segera tingkatkan kewaspadaan!`
      );
    };

    const handleNewReport = (newServerReport: ServerReportResponse) => {
      const newMapItem = formatServerReportToMapItem(newServerReport);
      setActiveReports((prevReports) => [
        newMapItem,
        ...prevReports.filter((item) => item.id !== newMapItem.id),
      ]);
    };

    const handleReportResolved = (resolvedReport: ServerReportResponse) => {
      const updatedMapItem = formatServerReportToMapItem(resolvedReport);
      setActiveReports((prevReports) =>
        prevReports.map((item) => (item.id === updatedMapItem.id ? updatedMapItem : item))
      );
    };

    const handleZoneAllClear = (payload: ZoneAllClearPayload) => {
      showAlert(
        'success',
        'ZONA AMAN TERVERIFIKASI!',
        `${payload.message}\n\nAncaman banjir rob dan sumbatan sampah pada lingkup ${payload.clearedRadiusMeters} meter tuntas diatasi oleh relawan di lapangan.`
      );
    };

    connectRealtimeEngine(handleCriticalAlert, handleNewReport, handleReportResolved, handleZoneAllClear);

    return () => {
      disconnectRealtimeEngine();
    };
  }, []);

  const handleReportUpdated = (updatedReport: ServerReportResponse) => {
    const updatedMapItem = formatServerReportToMapItem(updatedReport);
    setActiveReports((prevReports) =>
      prevReports.map((item) => (item.id === updatedMapItem.id ? updatedMapItem : item))
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Peta Spasial EcoWarn 🌍"
        subtitle="Pemantauan titik rawan banjir rob & sumbatan sampah"
        accentColor={EcoWarnColors.primary}
        flatBottom={true}
      />
      <InteractiveMap
        userLocation={userLocation}
        reports={activeReports}
        onReportUpdated={handleReportUpdated}
      />
      <CustomAlertModal
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onDismiss={() => setAlertVisible(false)}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EcoWarnColors.surface,
  },
});
