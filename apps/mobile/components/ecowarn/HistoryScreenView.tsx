import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchReporterHistory, ServerReportResponse } from '../../services/apiService';

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
        return { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', icon: '🔴' };
      case 'Sedang':
        return { bg: '#ffedd5', border: '#f97316', text: '#c2410c', icon: '🟠' };
      default:
        return { bg: '#d1fae5', border: '#10b981', text: '#047857', icon: '🟢' };
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
      <View style={styles.headerBanner}>
        <Text style={styles.bannerTitle}>Riwayat Kontribusi AI 🛡️</Text>
        <Text style={styles.bannerSubtitle}>
          Daftar seluruh inspeksi dan pelaporan ancaman sampah yang telah Anda validasi
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Menarik riwayat dari peladen...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />}
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
    backgroundColor: '#f8fafc',
  },
  headerBanner: {
    backgroundColor: '#047857',
    padding: 22,
    paddingTop: 45,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#d1fae5',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#1e293b',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  severityBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  coordinateText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
