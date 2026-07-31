import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { fetchNearbyReports, ServerReportResponse } from '../../services/apiService';

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
      <View style={styles.headerBanner}>
        <Text style={styles.bannerTitle}>Peringatan Dini Spasial 🔔</Text>
        <Text style={styles.bannerSubtitle}>
          Daftar notifikasi ancaman banjir rob dan sumbatan sanitasi di sekitar Anda
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Memuat log notifikasi bencana...</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />}
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
    backgroundColor: '#f8fafc',
  },
  headerBanner: {
    backgroundColor: '#065f46',
    padding: 22,
    paddingTop: 45,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#065f46',
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
    color: '#a7f3d0',
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
  alertCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCritical: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  cardWarning: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  textCritical: {
    color: '#b91c1c',
  },
  textWarning: {
    color: '#c2410c',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
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
