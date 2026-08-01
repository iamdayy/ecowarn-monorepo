import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const DEFAULT_CRITICAL_RADIUS = 5000; // 5 km radius

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  reports,
  criticalZoneRadiusMeters = DEFAULT_CRITICAL_RADIUS,
}) => {
  const [selectedReport, setSelectedReport] = useState<MapReportItem | null>(null);
  const insets = useSafeAreaInsets();

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
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}>
        {reports.map((report) => (
          <React.Fragment key={report.id}>
            <Marker
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              title={`Status: ${report.severity}`}
              description="Lokasi pemantauan sampah EcoWarn"
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

      <View style={[styles.legendContainer, { top: insets.top + Spacing.md }]}>
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
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: Spacing.md - 4,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 4,
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
});
