import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { fetchNearbyReports, ServerReportResponse } from '../../services/apiService';
import {
  connectRealtimeEngine,
  disconnectRealtimeEngine,
  CriticalZoneAlertPayload,
  ZoneAllClearPayload,
} from '../../services/socketService';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { ReportDetailModal } from './ReportDetailModal';
import { CustomAlertModal, CustomAlertType } from './CustomAlertModal';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useCoordinateAddress } from '../../services/geocodingService';

interface AlertCardProps {
  item: ServerReportResponse;
  onSelect: (item: ServerReportResponse) => void;
}

const AlertCardItem: React.FC<AlertCardProps> = ({ item, onSelect }) => {
  const [lng, lat] = item.location.coordinates;
  const { address } = useCoordinateAddress(lat, lng, 'short');
  const isCritical = item.severity === 'Kritis';
  const isSedang = item.severity === 'Sedang';
  const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : 'Baru saja';

  let borderColor: string = EcoWarnColors.safe;
  let bgCard: string = EcoWarnColors.safeSurface;
  let icon = '🟢';
  if (isCritical) {
    borderColor = EcoWarnColors.critical;
    bgCard = EcoWarnColors.criticalSurface;
    icon = '🚨';
  } else if (isSedang) {
    borderColor = EcoWarnColors.warning;
    bgCard = EcoWarnColors.warningSurface;
    icon = '⚠️';
  }

  return (
    <TouchableOpacity
      style={[styles.alertCard, { borderColor, backgroundColor: bgCard }]}
      activeOpacity={0.8}
      onPress={() => onSelect(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.alertIcon}>{icon}</Text>
        <View style={styles.titleContainer}>
          <Text style={[styles.alertTitle, isCritical ? styles.textCritical : isSedang ? styles.textWarning : styles.textSafe]}>
            {isCritical ? 'TITIK KRITIS SUMBATAN' : isSedang ? 'WASPADA VOLUM SEDANG' : 'TITIK PANTAU RINGAN'}
          </Text>
          <Text style={styles.timestamp}>{dateStr}</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Terdeteksi ancaman sumbatan sampah berstatus <Text style={styles.bold}>{item.severity}</Text> di kawasan <Text style={styles.bold}>{address}</Text> ({lat.toFixed(4)}, {lng.toFixed(4)}).
      </Text>
      <Text style={styles.detailHintText}>Ketuk untuk lihat bukti foto &amp; detail &gt;</Text>
    </TouchableOpacity>
  );
};

export const AlertsScreenView: React.FC = () => {
  const [alerts, setAlerts] = useState<ServerReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [totalSumbatan500m, setTotalSumbatan500m] = useState<number>(0);
  const [selectedReport, setSelectedReport] = useState<ServerReportResponse | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // State Custom Alert untuk Socket.io / API Response
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<{ type: CustomAlertType; title: string; message: string }>({
    type: 'info',
    title: '',
    message: '',
  });

  const showCustomAlert = useCallback((type: CustomAlertType, title: string, message: string) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
  }, []);

  const loadCriticalAlerts = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({}).catch(() => null);
      const lat = location ? location.coords.latitude : -6.200000;
      const lng = location ? location.coords.longitude : 106.816666;

      // Kueri ketat dalam lingkup 500 meter sesuai dengan aturan potensi bencana
      const reports500m = await fetchNearbyReports(lat, lng, 500);

      // Menyaring laporan yang diklasifikasikan sebagai sumbatan/ancaman
      const sumbatanReports = reports500m.filter(
        (item) => item.severity === 'Kritis' || item.severity === 'Sedang' || item.severity === 'Ringan'
      );
      const kritisSedangCount = reports500m.filter(
        (item) => item.severity === 'Kritis' || item.severity === 'Sedang'
      ).length;

      setTotalSumbatan500m(kritisSedangCount);
      setAlerts(sumbatanReports);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Alerts View - loadCriticalAlerts] Gagal memuat daftar waspada: ${errorMessage}`);
      showCustomAlert('error', 'Galat Koneksi API', 'Gagal memperbarui data sumbatan darurat dari peladen. Periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showCustomAlert]);

  useEffect(() => {
    loadCriticalAlerts();
  }, [loadCriticalAlerts]);

  // Pemantauan Siaran Darurat & Respon Real-Time Engine via Socket.io
  useEffect(() => {
    const handleCriticalAlert = (payload: CriticalZoneAlertPayload) => {
      showCustomAlert(
        'critical',
        'ZONA KRITIS BAHAYA BANJIR!',
        `${payload.message}\n\nTerdeteksi ancaman kritis dalam radius ${payload.impactedRadiusMeters}m dari area sekitar Anda.`
      );
      loadCriticalAlerts();
    };

    const handleNewReport = () => {
      // Refresh otomatis daftar peringatan spasial 500m saat laporan baru masuk
      loadCriticalAlerts();
    };

    const handleReportResolved = () => {
      loadCriticalAlerts();
    };

    const handleZoneAllClear = (payload: ZoneAllClearPayload) => {
      showCustomAlert(
        'success',
        'ZONA DALAM STATUS STERIL',
        `${payload.message}\n\nLingkup ${payload.clearedRadiusMeters} meter tuntas dinormalisasi dan diatasi oleh relawan di lapangan.`
      );
      loadCriticalAlerts();
    };

    connectRealtimeEngine(handleCriticalAlert, handleNewReport, handleReportResolved, handleZoneAllClear);

    return () => {
      disconnectRealtimeEngine();
    };
  }, [showCustomAlert, loadCriticalAlerts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCriticalAlerts();
  };

  const isBencanaHigh = totalSumbatan500m >= 5;

  const renderItem = ({ item }: { item: ServerReportResponse }) => {
    return (
      <AlertCardItem
        item={item}
        onSelect={(selected) => {
          Haptics.selectionAsync();
          setSelectedReport(selected);
          setIsModalVisible(true);
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Peringatan Dini Spasial 🔔"
        subtitle="Analisis ancaman banjir rob & sumbatan dalam radius 500 meter"
        accentColor={EcoWarnColors.primaryDark}
      />

      {/* === Banner Status Potensi Bencana Kawasan (Lingkup 500m) === */}
      <View style={[styles.potencyBanner, isBencanaHigh ? styles.bannerHigh : styles.bannerSafe]}>
        <Text style={styles.potencyIcon}>{isBencanaHigh ? '🌊' : '🛡️'}</Text>
        <View style={styles.potencyTextWrapper}>
          <Text style={[styles.potencyTitle, isBencanaHigh ? styles.textCritical : styles.textSafeDark]}>
            {isBencanaHigh ? 'POTENSI BENCANA BANJIR ROB / SUMBATAN' : 'POTENSI BENCANA RINGAN HINGGA SEDANG'}
          </Text>
          <Text style={styles.potencySubtitle}>
            {isBencanaHigh
              ? `Kritis! Terdapat ${totalSumbatan500m} titik laporan sumbatan dalam lingkup 500 meter dari lokasi Anda (Ambang batas bahaya: 5 - 10 laporan).`
              : `Lingkungan aman berstatus Ringan hingga Sedang. Saat ini terdeteksi ${totalSumbatan500m} titik sumbatan dalam lingkup 500m (< 5 laporan).`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={EcoWarnColors.primaryLight} />
          <Text style={styles.loadingText}>Menganalisis kepadatan sumbatan spasial 500m...</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[EcoWarnColors.primaryLight]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyTitle}>Lingkup 500 Meter Bersihkan</Text>
              <Text style={styles.emptySubtitle}>
                Tidak ada titik sumbatan sampah yang terdaftar pada lingkup 500 meter di sekitar Anda. Potensi bencana sepenuhnya berada pada status ringan/aman.
              </Text>
            </View>
          }
        />
      )}

      <ReportDetailModal
        visible={isModalVisible}
        report={selectedReport}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsModalVisible(false);
          setSelectedReport(null);
        }}
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
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md - 4,
    color: EcoWarnColors.textMuted,
    fontSize: 14,
  },
  potencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    ...Shadows.card,
  },
  bannerHigh: {
    backgroundColor: EcoWarnColors.criticalSurface,
    borderColor: EcoWarnColors.critical,
  },
  bannerSafe: {
    backgroundColor: EcoWarnColors.safeSurface,
    borderColor: EcoWarnColors.primaryLight,
  },
  potencyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  potencyTextWrapper: {
    flex: 1,
  },
  potencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  potencySubtitle: {
    fontSize: 12,
    color: EcoWarnColors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },
  textSafeDark: {
    color: EcoWarnColors.primaryDark,
  },
  alertCard: {
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 14,
    borderWidth: 1.5,
    backgroundColor: EcoWarnColors.cardBg,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: Spacing.md - 4,
  },
  titleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  textCritical: {
    color: EcoWarnColors.criticalDark,
  },
  textWarning: {
    color: EcoWarnColors.warningDark,
  },
  textSafe: {
    color: EcoWarnColors.primary,
  },
  timestamp: {
    fontSize: 12,
    color: EcoWarnColors.textMuted,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: EcoWarnColors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xl - 2,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: EcoWarnColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailHintText: {
    fontSize: 12,
    color: EcoWarnColors.primaryDark,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
});
