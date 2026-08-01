import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchReporterHistory, ServerReportResponse } from '../../services/apiService';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const HistoryScreenView: React.FC = () => {
  const { token } = useAuth();
  const [history, setHistory] = useState<ServerReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const reports = await fetchReporterHistory(token);
      setHistory(reports);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error History View - loadHistory] Gagal memuat riwayat laporan relawan: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadHistory();
  };

  const getBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'Kritis':
        return { bg: EcoWarnColors.criticalSurface, border: EcoWarnColors.critical, text: EcoWarnColors.criticalDark, icon: '🔴' };
      case 'Sedang':
        return { bg: EcoWarnColors.warningSurface, border: EcoWarnColors.warning, text: EcoWarnColors.warningDark, icon: '🟠' };
      default:
        return { bg: EcoWarnColors.safeSurface, border: EcoWarnColors.primaryLight, text: EcoWarnColors.primary, icon: '🟢' };
    }
  };

  const renderItem = ({ item }: { item: ServerReportResponse }) => {
    const badge = getBadgeStyle(item.severity);
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : 'Baru saja';

    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.reportIcon}>{badge.icon}</Text>
          <View style={styles.idContainer}>
            <Text style={styles.reportTitle}>ID: {item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.timestamp}>{dateStr}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.severityText, { color: badge.text }]}>{item.severity}</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.coordinateText}>
          📍 Koordinat Lapangan: [{item.location.coordinates[1].toFixed(5)}, {item.location.coordinates[0].toFixed(5)}]
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Riwayat Kontribusi AI 🛡️"
        subtitle="Daftar seluruh inspeksi dan pelaporan ancaman sampah yang telah Anda validasi"
        accentColor={EcoWarnColors.primary}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={EcoWarnColors.primaryLight} />
          <Text style={styles.loadingText}>Menarik riwayat dari peladen...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[EcoWarnColors.primaryLight]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Belum Ada Laporan Terekam</Text>
              <Text style={styles.emptySubtitle}>
                Gunakan tab Pemindai AI untuk melakukan pemantauan sampah di lokasi rawan secara real-time.
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
  reportCard: {
    backgroundColor: EcoWarnColors.cardBg,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: EcoWarnColors.border,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  idContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: EcoWarnColors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: EcoWarnColors.textMuted,
    marginTop: 2,
  },
  severityBadge: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: EcoWarnColors.divider,
    marginVertical: Spacing.md - 4,
  },
  coordinateText: {
    fontSize: 13,
    color: EcoWarnColors.textSecondary,
    fontWeight: '500',
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
