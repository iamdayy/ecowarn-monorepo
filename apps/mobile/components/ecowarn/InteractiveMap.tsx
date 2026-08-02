import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { TrashVolumeStatus, SpatialCoordinates } from '../../types/ecowarn';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';

export interface MapReportItem {
  id: string;
  latitude: number;
  longitude: number;
  severity: TrashVolumeStatus;
  createdAt?: string;
}

interface InteractiveMapProps {
  userLocation: SpatialCoordinates;
  reports: MapReportItem[];
  criticalZoneRadiusMeters?: number;
}

const DEFAULT_CRITICAL_RADIUS = 500; // 5 km radius

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  reports,
  criticalZoneRadiusMeters = DEFAULT_CRITICAL_RADIUS,
}) => {
  const [selectedReport, setSelectedReport] = useState<MapReportItem | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');
  const [is3D, setIs3D] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const mapRef = useRef<MapView>(null);

  const toggle3DMode = () => {
    const nextState = !is3D;
    setIs3D(nextState);
    mapRef.current?.animateCamera({
      pitch: nextState ? 60 : 0, // 60 derajat untuk menonjolkan gedung 3D & perspektif rob
      zoom: nextState ? 17 : 14,
    }, { duration: 1000 });
  };

  const getMarkerColor = (severity: TrashVolumeStatus): string => {
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
        {reports.map((report) => (
          <React.Fragment key={report.id}>
            <Marker
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              title={`Status: ${report.severity}`}
              description="Klik untuk aksi toolbar aplikasi"
              pinColor={getMarkerColor(report.severity)}
              onPress={() => setSelectedReport(report)}
            />
            {report.severity === 'Kritis' && (
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
          onPress={() => setMapType((prev) => (prev === 'standard' ? 'hybrid' : 'standard'))}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Satelit">
          <Text style={styles.fabIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, is3D && styles.fabButtonActive]}
          onPress={toggle3DMode}
          activeOpacity={0.85}
          accessibilityLabel="Toggle 3D Bangunan">
          <Text style={styles.fabIcon}>🏙️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, showLegend && styles.fabButtonActive]}
          onPress={() => setShowLegend((prev) => !prev)}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Legenda">
          <Text style={styles.fabIcon}>ℹ️</Text>
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
        </View>
      )}

      {/* Toolbar Aplikasi Spasial (Navigasi Rute & Fokus Titik) */}
      {selectedReport && (
        <View style={styles.appToolbarContainer}>
          <View style={styles.appToolbarHeader}>
            <Text style={styles.appToolbarTitle}>
              📌 Titik Terpilih: <Text style={{ color: getMarkerColor(selectedReport.severity), fontWeight: '800' }}>{selectedReport.severity}</Text>
            </Text>
            <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.appToolbarSub}>
            Koord: {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
          </Text>

          <View style={styles.appToolbarActions}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => {
                const url = Platform.select({
                  ios: `maps://0,0?q=${selectedReport.latitude},${selectedReport.longitude}`,
                  android: `geo:${selectedReport.latitude},${selectedReport.longitude}?q=${selectedReport.latitude},${selectedReport.longitude}(Titik+EcoWarn)`,
                  default: `https://www.google.com/maps/dir/?api=1&destination=${selectedReport.latitude},${selectedReport.longitude}`
                });
                if (url) Linking.openURL(url);
              }}
              activeOpacity={0.85}>
              <Text style={styles.actionBtnPrimaryText}>🗺️ Buka Rute (Google Maps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => {
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
      )}
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
    flexDirection: 'row',
    gap: Spacing.sm,
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
