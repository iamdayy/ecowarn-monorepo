import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { fetchNearbyReports, ServerReportResponse } from '../../services/apiService';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const AlertsScreenView: React.FC = () => {
  const [alerts, setAlerts] = useState<ServerReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadCriticalAlerts = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({}).catch(() => null);
      const lat = location ? location.coords.latitude : -6.200000;
      const lng = location ? location.coords.longitude : 106.816666;

      const allReports = await fetchNearbyReports(lat, lng, 30000);
      // Memerintahkan filter khusus untuk status Sedang & Kritis sebagai daftar waspada Warga
      const criticalReports = allReports.filter(
        (item) => item.severity === 'Kritis' || item.severity === 'Sedang'
      );
      setAlerts(criticalReports);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Alerts View - loadCriticalAlerts] Gagal memuat daftar waspada: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCriticalAlerts();
  }, [loadCriticalAlerts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCriticalAlerts();
  };

  const renderItem = ({ item }: { item: ServerReportResponse }) => {
    const isCritical = item.severity === 'Kritis';
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : 'Baru saja';

    return (
      <View style={[styles.alertCard, isCritical ? styles.cardCritical : styles.cardWarning]}>
        <View style={styles.cardHeader}>
          <Text style={styles.alertIcon}>{isCritical ? '🚨' : '⚠️'}</Text>
          <View style={styles.titleContainer}>
            <Text style={[styles.alertTitle, isCritical ? styles.textCritical : styles.textWarning]}>
              {isCritical ? 'PERINGATAN BAHAYA KRITIS' : 'WASPADA VOLUM SAMPAH'}
            </Text>
            <Text style={styles.timestamp}>{dateStr}</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Terdeteksi penumpukan sampah dengan status <Text style={styles.bold}>{item.severity}</Text> pada koordinat [{item.location.coordinates[1].toFixed(4)}, {item.location.coordinates[0].toFixed(4)}].
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Peringatan Dini Spasial 🔔"
        subtitle="Daftar notifikasi ancaman banjir rob dan sumbatan sanitasi di sekitar Anda"
        accentColor={EcoWarnColors.primaryDark}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={EcoWarnColors.primaryLight} />
          <Text style={styles.loadingText}>Memuat log notifikasi bencana...</Text>
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
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>Kondisi Lingkungan Kondusif</Text>
              <Text style={styles.emptySubtitle}>
                Tidak ada indikasi krisis sumbatan sampah atau ancaman rob terdeteksi pada radius pantau Anda.
              </Text>
            </View>
          }
        />
      )}
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
  alertCard: {
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 14,
    borderWidth: 1.5,
    backgroundColor: EcoWarnColors.cardBg,
    ...Shadows.card,
  },
  cardCritical: {
    borderColor: EcoWarnColors.critical,
    backgroundColor: EcoWarnColors.criticalSurface,
  },
  cardWarning: {
    borderColor: EcoWarnColors.warning,
    backgroundColor: EcoWarnColors.warningSurface,
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
});
