import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { fetchReporterHistory, ServerReportResponse } from '../../services/apiService';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { ReportDetailModal } from './ReportDetailModal';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useCoordinateAddress } from '../../services/geocodingService';

interface HistoryItemProps {
  item: ServerReportResponse;
  onSelect: (report: ServerReportResponse) => void;
  badgeStyle: { bg: string; border: string; text: string; icon: string };
}

const HistoryCardItem: React.FC<HistoryItemProps> = ({ item, onSelect, badgeStyle }) => {
  const [lng, lat] = item?.location?.coordinates || [undefined, undefined];
  const { address } = useCoordinateAddress(lat, lng, 'short');
  const dateStr = item?.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : 'Baru saja';

  return (
    <TouchableOpacity
      style={styles.reportCard}
      activeOpacity={0.8}
      onPress={() => onSelect(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.reportIcon}>{badgeStyle.icon}</Text>
        <View style={styles.idContainer}>
          <Text style={styles.reportTitle}>ID: {item._id?.slice(-8)?.toUpperCase() || 'N/A'}</Text>
          <Text style={styles.timestamp}>{dateStr}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
          <Text style={[styles.severityText, { color: badgeStyle.text }]}>{item.severity || 'Ringan'}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
        <Text style={[styles.coordinateText, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          📍 {address} ({lat?.toFixed(4) ?? '0.0000'}, {lng?.toFixed(4) ?? '0.0000'})
        </Text>
        <Text style={styles.detailHintText}>📸 Lihat Detail &gt;</Text>
      </View>
    </TouchableOpacity>
  );
};

export const HistoryScreenView: React.FC = () => {
  const { token } = useAuth();
  const [history, setHistory] = useState<ServerReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<ServerReportResponse | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

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
    return (
      <HistoryCardItem
        item={item}
        badgeStyle={badge}
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

      <ReportDetailModal
        visible={isModalVisible}
        report={selectedReport}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsModalVisible(false);
          setSelectedReport(null);
        }}
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: EcoWarnColors.primary,
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
