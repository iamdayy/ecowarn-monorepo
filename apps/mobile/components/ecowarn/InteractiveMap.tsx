import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { TrashVolumeStatus, ReportStatus, SpatialCoordinates } from '../../types/ecowarn';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';
import { ReportDetailModal } from './ReportDetailModal';
import { ServerReportResponse } from '../../services/apiService';
import { useCoordinateAddress } from '../../services/geocodingService';

export interface MapReportItem {
  id: string;
  latitude: number;
  longitude: number;
  severity: TrashVolumeStatus;
  status?: ReportStatus;
  createdAt?: string;
  photoUrl?: string;
  originalReport?: ServerReportResponse;
}

interface InteractiveMapProps {
  userLocation: SpatialCoordinates;
  reports: MapReportItem[];
  criticalZoneRadiusMeters?: number;
  onReportUpdated?: (updatedReport: ServerReportResponse) => void;
}

const DEFAULT_CRITICAL_RADIUS = 500; // 500 meter radius zona bahaya rob/sumbatan

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  reports,
  criticalZoneRadiusMeters = DEFAULT_CRITICAL_RADIUS,
  onReportUpdated,
}) => {
  const [selectedReport, setSelectedReport] = useState<MapReportItem | null>(null);
  const { address } = useCoordinateAddress(selectedReport?.latitude, selectedReport?.longitude, 'short');
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');
  const [is3D, setIs3D] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [hideResolved, setHideResolved] = useState<boolean>(false);
  const mapRef = useRef<MapView>(null);

  // Animasi otomatis kamera ke koordinat GPS aktual saat peta dimuat atau lokasi diperbaiki
  useEffect(() => {
    if (userLocation.latitude && userLocation.longitude && mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
        zoom: 14,
      }, { duration: 800 });
    }
  }, [userLocation.latitude, userLocation.longitude]);

  const toggle3DMode = () => {
    const nextState = !is3D;
    setIs3D(nextState);
    mapRef.current?.animateCamera({
      pitch: nextState ? 60 : 0, // 60 derajat untuk menonjolkan gedung 3D & perspektif rob
      zoom: nextState ? 17 : 14,
    }, { duration: 1000 });
  };

  const getMarkerColor = (severity: TrashVolumeStatus, status?: ReportStatus): string => {
    if (status === 'RESOLVED') {
      return '#00C853'; // Hijau steril bersinar
    }
    switch (severity) {
      case 'Kritis':
        return EcoWarnColors.critical;
      case 'Sedang':
        return EcoWarnColors.warning;
      case 'Ringan':
      default:
        return EcoWarnColors.safe;
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsIndoors={true}
        showsIndoorLevelPicker={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        toolbarEnabled={true}>
        {reports
          .filter((report) => !hideResolved || report.status !== 'RESOLVED')
          .map((report) => (
          <React.Fragment key={report.id}>
            <Marker
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              title={report.status === 'RESOLVED' ? '✔️ ZONA STERIL - SELESAI' : `Status: ${report.severity}`}
              description={report.status === 'RESOLVED' ? 'Telah dibersihkan & diverifikasi' : 'Klik untuk aksi toolbar aplikasi'}
              pinColor={getMarkerColor(report.severity, report.status)}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedReport(report);
              }}
            />
            {report.severity === 'Kritis' && report.status !== 'RESOLVED' && (
              <Circle
                center={{ latitude: report.latitude, longitude: report.longitude }}
                radius={criticalZoneRadiusMeters}
                strokeWidth={2}
                strokeColor="rgba(255, 59, 48, 0.8)"
                fillColor="rgba(255, 59, 48, 0.2)"
              />
            )}
          </React.Fragment>
        ))}
      </MapView>

      {/* Stack Kontrol FAB Spasial di Sisi Kanan Peta */}
      <View style={styles.fabStackContainer}>
        <TouchableOpacity
          style={[styles.fabButton, mapType === 'hybrid' && styles.fabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMapType((prev) => (prev === 'standard' ? 'hybrid' : 'standard'));
          }}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Satelit">
          <Text style={styles.fabIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, is3D && styles.fabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggle3DMode();
          }}
          activeOpacity={0.85}
          accessibilityLabel="Toggle 3D Bangunan">
          <Text style={styles.fabIcon}>🏙️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, showLegend && styles.fabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowLegend((prev) => !prev);
          }}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Legenda">
          <Text style={styles.fabIcon}>ℹ️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, hideResolved && styles.fabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHideResolved((prev) => !prev);
          }}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Sembunyikan Titik Selesai">
          <Text style={styles.fabIcon}>{hideResolved ? '👁️' : '🧹'}</Text>
        </TouchableOpacity>

        {/* Tombol FAB Fit Semua Titik Marker Laporan */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (reports.length > 0 && mapRef.current) {
              const coords = reports.map(r => ({ latitude: r.latitude, longitude: r.longitude }));
              mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
                animated: true,
              });
            } else if (mapRef.current) {
              mapRef.current.animateCamera({
                center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
                zoom: 15,
              }, { duration: 800 });
            }
          }}
          activeOpacity={0.85}
          accessibilityLabel="Fokus ke Semua Titik Sampah">
          <Text style={styles.fabIcon}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Legenda Peta (Collapsible) */}
      {showLegend && (
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legenda Peta Spasial:</Text>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: EcoWarnColors.critical }]} />
            <Text style={styles.legendText}>Kritis (+ Zona Merah 5km)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: EcoWarnColors.warning }]} />
            <Text style={styles.legendText}>Sedang</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: EcoWarnColors.safe }]} />
            <Text style={styles.legendText}>Ringan</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#00C853' }]} />
            <Text style={styles.legendText}>Selesai (Zona Steril)</Text>
          </View>
        </View>
      )}

      {/* Toolbar Aplikasi Spasial (Navigasi Rute & Fokus Titik) */}
      {selectedReport && (
        <View style={styles.appToolbarContainer}>
          <View style={styles.appToolbarHeader}>
            <Text style={styles.appToolbarTitle}>
              📌 Titik Terpilih: <Text style={{ color: getMarkerColor(selectedReport.severity, selectedReport.status), fontWeight: '800' }}>{selectedReport.status === 'RESOLVED' ? 'STERIL / SELESAI' : selectedReport.severity}</Text>
            </Text>
            <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.appToolbarSub}>
            📍 {address} ({selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)})
          </Text>

          <View style={styles.appToolbarActions}>
            {/* Tombol utama untuk melihat detail & foto tanpa pindah halaman */}
            <TouchableOpacity
              style={styles.actionBtnDetail}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setDetailModalVisible(true);
              }}
              activeOpacity={0.85}>
              <Text style={styles.actionBtnDetailText}>📸 Lihat Detail & Bukti Foto</Text>
            </TouchableOpacity>

            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const url = Platform.select({
                    ios: `maps://0,0?q=${selectedReport.latitude},${selectedReport.longitude}`,
                    android: `geo:${selectedReport.latitude},${selectedReport.longitude}?q=${selectedReport.latitude},${selectedReport.longitude}(Titik+EcoWarn)`,
                    default: `https://www.google.com/maps/dir/?api=1&destination=${selectedReport.latitude},${selectedReport.longitude}`
                  });
                  if (url) Linking.openURL(url);
                }}
                activeOpacity={0.85}>
                <Text style={styles.actionBtnPrimaryText}>🗺️ Rute Navigasi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  mapRef.current?.animateCamera({
                    center: { latitude: selectedReport.latitude, longitude: selectedReport.longitude },
                    zoom: 18,
                    pitch: 55,
                  }, { duration: 800 });
                }}
                activeOpacity={0.85}>
                <Text style={styles.actionBtnSecondaryText}>🔍 3D Fokus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal Detail & Foto Laporan Spasial yang Langsung Dapat Diakses Dari Titik Peta */}
      <ReportDetailModal
        visible={detailModalVisible}
        report={selectedReport ? (selectedReport.originalReport || {
          _id: selectedReport.id,
          location: {
            type: 'Point',
            coordinates: [selectedReport.longitude, selectedReport.latitude],
          },
          severity: selectedReport.severity,
          status: selectedReport.status,
          photoUrl: selectedReport.photoUrl,
          createdAt: selectedReport.createdAt || new Date().toISOString(),
        }) : null}
        onClose={() => setDetailModalVisible(false)}
        onReportUpdated={(updatedServerReport: ServerReportResponse) => {
          setSelectedReport((prev) => prev ? { ...prev, status: updatedServerReport.status, originalReport: updatedServerReport } : null);
          if (onReportUpdated) onReportUpdated(updatedServerReport);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  legendContainer: {
    position: 'absolute',
    top: 240,
    right: 16,
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: Spacing.md - 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  legendTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
    color: EcoWarnColors.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontSize: 12,
    color: EcoWarnColors.textSecondary,
  },
  fabStackContainer: {
    position: 'absolute',
    right: 16,
    top: 60,
    flexDirection: 'column',
    gap: 12,
    zIndex: 15,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  fabButtonActive: {
    backgroundColor: EcoWarnColors.primarySurface,
    borderColor: EcoWarnColors.primary,
    borderWidth: 2,
  },
  fabIcon: {
    fontSize: 22,
  },
  appToolbarContainer: {
    position: 'absolute',
    bottom: 95, // Ditinggikan sedikit agar melayang di atas Floating Tab Bar kustom
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderLeftWidth: 5,
    borderLeftColor: EcoWarnColors.primary,
  },
  appToolbarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appToolbarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoWarnColors.textMuted,
  },
  appToolbarSub: {
    fontSize: 12,
    color: EcoWarnColors.textSecondary,
    marginBottom: Spacing.md,
  },
  appToolbarActions: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtnDetail: {
    backgroundColor: '#10B981',
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnDetailText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: EcoWarnColors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: EcoWarnColors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
  },
  actionBtnSecondaryText: {
    color: EcoWarnColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
